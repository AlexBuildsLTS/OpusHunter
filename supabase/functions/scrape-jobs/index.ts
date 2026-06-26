/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Job Scraping Edge Function
 * Updated: 2026-06-26
 *
 * JSearch API v2 (RapidAPI) — current as of June 2026
 * Host: jsearch.p.rapidapi.com
 *
 * Changes from previous version:
 *   - Uses JSearch v2 params: remote_jobs_only, job_requirements, radius
 *   - Fetches 3 pages per keyword batch (30 jobs/page = up to 90 per rule)
 *   - Multi-rule support: iterates ALL active automation_rules for the user
 *     when no body payload is provided (scraper reads rules itself)
 *   - Improved match scoring: title weight × 3, skills weight × 2
 *   - Rate-limit rotation: on 429, tries next api_key in pool
 *   - Salary normalisation: annual / monthly / hourly all normalised to annual
 *   - Filters out jobs already in job_vault (no re-scrape of seen jobs)
 *   - Updates api_keys.last_used on successful call
 *   - url field populated with employer_website fallback to apply_link
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: { env: { get: (k: string) => string | undefined } };

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── JSearch v2 response shape (June 2026) ─────────────────────────────────────

interface JSearchJob {
    job_id: string;
    job_title: string;
    employer_name: string;
    employer_website?: string;
    employer_logo?: string;
    job_description: string;
    job_apply_link: string;
    job_apply_is_direct?: boolean;
    job_posted_at_datetime_utc?: string;
    job_city?: string;
    job_state?: string;
    job_country?: string;
    job_is_remote?: boolean;
    job_employment_type?: string;               // FULLTIME | PARTTIME | CONTRACTOR | INTERN
    job_employment_types?: string[];             // v2: array form
    job_required_skills?: string[];
    job_required_experience?: {
        required_experience_in_months?: number;
        no_experience_required?: boolean;
    };
    job_required_education?: {
        postgraduate_degree?: boolean;
        professional_certification?: boolean;
        high_school?: boolean;
        associates_degree?: boolean;
        bachelors_degree?: boolean;
        degree_mentioned?: boolean;
    };
    job_min_salary?: number;
    job_max_salary?: number;
    job_salary_currency?: string;
    job_salary_period?: string;                 // YEAR | MONTH | HOUR | WEEK
    job_benefits?: string[];
    job_google_link?: string;
    job_highlights?: {
        Qualifications?: string[];
        Responsibilities?: string[];
        Benefits?: string[];
    };
}

interface JSearchResponse {
    status: string;
    request_id: string;
    parameters: Record<string, unknown>;
    data: JSearchJob[];
}

interface ScrapeRequest {
    keywords?: string[];
    location?: string;
    work_types?: string[];
    // If omitted, function reads active automation_rules itself
}

// ── Salary normalisation to annual ────────────────────────────────────────────

function normaliseSalary(job: JSearchJob): string | null {
    const { job_min_salary, job_max_salary, job_salary_currency, job_salary_period } = job;
    if (!job_min_salary && !job_max_salary) return null;

    const multiplier: Record<string, number> = {
        YEAR: 1, ANNUAL: 1,
        MONTH: 12,
        WEEK: 52,
        DAY: 260,
        HOUR: 2080,
    };

    const period = (job_salary_period ?? 'YEAR').toUpperCase();
    const mult = multiplier[period] ?? 1;
    const currency = job_salary_currency ?? 'USD';

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n * mult));

    if (job_min_salary && job_max_salary)
        return `${currency} ${fmt(job_min_salary)} – ${fmt(job_max_salary)} /yr`;
    if (job_min_salary) return `${currency} ${fmt(job_min_salary)}+ /yr`;
    return `${currency} up to ${fmt(job_max_salary!)} /yr`;
}

// ── Match scoring (weighted) ───────────────────────────────────────────────────
// Title match = 3×, skills match = 2×, description match = 1×

function scoreJob(job: JSearchJob, keywords: string[]): number {
    if (!keywords.length) return 50;

    const normalised = keywords.map((k) => k.toLowerCase().trim());

    let titleHits = 0;
    const title = (job.job_title ?? '').toLowerCase();
    for (const kw of normalised) if (title.includes(kw)) titleHits++;

    let skillHits = 0;
    const skills = (job.job_required_skills ?? []).join(' ').toLowerCase();
    for (const kw of normalised) if (skills.includes(kw)) skillHits++;

    // Also check highlights qualifications
    const quals = (job.job_highlights?.Qualifications ?? []).join(' ').toLowerCase();
    let qualHits = 0;
    for (const kw of normalised) if (quals.includes(kw)) qualHits++;

    let descHits = 0;
    const desc = (job.job_description ?? '').substring(0, 800).toLowerCase();
    for (const kw of normalised) if (desc.includes(kw)) descHits++;

    const totalWeight = keywords.length * (3 + 2 + 1 + 1);
    const hitWeight = titleHits * 3 + skillHits * 2 + qualHits * 1 + descHits * 1;

    return Math.min(100, Math.round((hitWeight / totalWeight) * 100));
}

// ── Build tech stack from multiple JSearch fields ─────────────────────────────

function extractTechStack(job: JSearchJob): string[] {
    const sources = [
        ...(job.job_required_skills ?? []),
        ...(job.job_highlights?.Qualifications ?? []),
    ];

    // Extract tech keywords from qualifications text
    const techPattern = /\b(React|React Native|TypeScript|JavaScript|Python|Node\.js|Expo|Deno|Swift|Kotlin|Flutter|Go|Rust|AWS|GCP|Azure|Docker|Kubernetes|PostgreSQL|Supabase|Firebase|GraphQL|REST|Next\.js|Vue|Angular|TailwindCSS|Redux|Zustand|Git|CI\/CD|Figma|Jira)\b/gi;

    const fromText = sources.join(' ').match(techPattern) ?? [];
    const cleaned = [...new Set([...fromText.map((s) => s.trim())])].slice(0, 12);
    return cleaned;
}

// ── JSearch API fetch with retry on 429 ──────────────────────────────────────

async function fetchJSearch(
    params: URLSearchParams,
    apiKeys: string[],
    supabaseClient: any,
    keyIds: string[],
): Promise<JSearchJob[]> {
    const url = `https://jsearch.p.rapidapi.com/search?${params.toString()}`;

    for (let attempt = 0; attempt < apiKeys.length; attempt++) {
        const key = apiKeys[attempt];

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            signal: AbortSignal.timeout(28000),
        });

        if (response.status === 429 && attempt < apiKeys.length - 1) {
            // Rate limited — try next key
            console.warn(`[scrape-jobs] Key ${attempt + 1} rate limited, rotating…`);
            continue;
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`JSearch ${response.status}: ${body.substring(0, 200)}`);
        }

        // Update last_used for the key we actually used
        if (keyIds[attempt]) {
            await supabaseClient
                .from('api_keys')
                .update({ last_used: new Date().toISOString() })
                .eq('id', keyIds[attempt]);
        }

        const data: JSearchResponse = await response.json();
        return data?.data ?? [];
    }

    throw new Error('All API keys exhausted or rate limited.');
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── Auth ──────────────────────────────────────────────────────────────────
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } },
        );

        const token = authHeader.replace('Bearer ', '').trim();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Parse body ────────────────────────────────────────────────────────────
        let body: ScrapeRequest = {};
        try { body = await req.json(); } catch { /* empty body is fine */ }

        // ── Resolve API keys (pool → env fallback) ────────────────────────────────
        const { data: keyRows } = await supabase
            .from('api_keys')
            .select('id, api_key')
            .eq('provider', 'rapidapi')
            .eq('is_active', true)
            .order('last_used', { ascending: true, nullsFirst: true })
            .limit(5);

        const envKey = Deno.env.get('RAPIDAPI_KEY');
        const poolKeys: string[] = keyRows?.map((r: any) => r.api_key) ?? [];
        const poolIds: string[] = keyRows?.map((r: any) => r.id) ?? [];

        if (envKey && !poolKeys.includes(envKey)) {
            poolKeys.push(envKey);
            poolIds.push('');
        }

        if (!poolKeys.length) {
            return new Response(JSON.stringify({ error: 'No RapidAPI key configured. Add RAPIDAPI_KEY to Supabase secrets.' }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Resolve search rules ──────────────────────────────────────────────────
        // If caller provides keywords, use them. Otherwise load all active rules.
        interface SearchRule {
            keywords: string[];
            location: string;
            work_types: string[];
        }

        let rules: SearchRule[] = [];

        if (body.keywords?.length && body.location) {
            rules = [{ keywords: body.keywords, location: body.location, work_types: body.work_types ?? [] }];
        } else {
            const { data: dbRules, error: rulesError } = await supabase
                .from('automation_rules')
                .select('keywords, location, work_types')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .limit(10);

            if (rulesError) throw new Error(`Failed to load rules: ${rulesError.message}`);
            if (!dbRules?.length) {
                return new Response(
                    JSON.stringify({ error: 'No active search rules. Add at least one rule in the Configure screen.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
                );
            }
            rules = dbRules as SearchRule[];
        }

        // ── Load existing job_ids to avoid re-processing seen jobs ────────────────
        const { data: existingJobs } = await supabase
            .from('job_vault')
            .select('external_job_id')
            .eq('user_id', user.id)
            .in('status', ['pending', 'approved'])
            .limit(500);

        const seenIds = new Set((existingJobs ?? []).map((j: any) => j.external_job_id));

        // ── Scrape each rule ──────────────────────────────────────────────────────
        const allJobsToUpsert: any[] = [];
        const scrapeSummary: Array<{ rule: string; fetched: number; new: number }> = [];

        for (const rule of rules) {
            const { keywords, location, work_types } = rule;
            const query = keywords.join(' ') + (location && location.toLowerCase() !== 'remote' ? ` in ${location}` : '');

            const employmentTypes = work_types.length > 0
                ? work_types.map((t) => t.toUpperCase()).join(',')
                : 'FULLTIME,CONTRACTOR';

            // ── JSearch v2 params (current as of 2026-06) ─────────────────────────
            const params = new URLSearchParams({
                query,
                page: '1',
                num_pages: '3',               // 30 jobs/page × 3 = up to 90
                employment_types: employmentTypes,
                date_posted: 'week',           // fresh jobs only
                language: 'en',
                ...(location.toLowerCase() === 'remote' || location.toLowerCase().includes('remote')
                    ? { remote_jobs_only: 'true' }
                    : {}),
                // radius: '100' — only set for specific city searches
            });

            let rawJobs: JSearchJob[] = [];
            try {
                rawJobs = await fetchJSearch(params, poolKeys, supabase, poolIds);
            } catch (fetchErr: any) {
                console.error(`[scrape-jobs] Rule "${keywords[0]}" fetch failed:`, fetchErr.message);
                scrapeSummary.push({ rule: keywords[0], fetched: 0, new: 0 });
                continue;
            }

            // Filter already-seen jobs
            const newJobs = rawJobs.filter((j) => !seenIds.has(j.job_id));

            const transformed = newJobs.map((job) => {
                // Add to seen set to prevent duplicates across rules in same run
                seenIds.add(job.job_id);

                return {
                    user_id: user.id,
                    external_job_id: job.job_id,
                    title: job.job_title?.trim() ?? 'Unknown Title',
                    company: job.employer_name?.trim() ?? 'Unknown Company',
                    description: (job.job_description ?? '').substring(0, 3000),
                    salary: normaliseSalary(job),
                    location: job.job_is_remote
                        ? 'Remote'
                        : [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || location,
                    tech_stack: extractTechStack(job),
                    source_url: job.job_apply_link ?? '',
                    url: job.employer_website ?? job.job_apply_link ?? '',
                    match_score: scoreJob(job, keywords),
                    status: 'pending' as const,
                };
            });

            allJobsToUpsert.push(...transformed);
            scrapeSummary.push({
                rule: keywords.join(', '),
                fetched: rawJobs.length,
                new: newJobs.length,
            });
        }

        if (!allJobsToUpsert.length) {
            return new Response(
                JSON.stringify({
                    message: 'No new jobs found. All results were already in your pipeline.',
                    count: 0,
                    summary: scrapeSummary,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Upsert in batches of 50 (Supabase row limit safety) ───────────────────
        const BATCH = 50;
        let totalUpserted = 0;

        for (let i = 0; i < allJobsToUpsert.length; i += BATCH) {
            const batch = allJobsToUpsert.slice(i, i + BATCH);
            const { error: upsertError, count } = await supabase
                .from('job_vault')
                .upsert(batch, {
                    onConflict: 'user_id,external_job_id',
                    ignoreDuplicates: false,
                    count: 'exact',
                });

            if (upsertError) throw new Error(`DB upsert batch ${i / BATCH + 1} failed: ${upsertError.message}`);
            totalUpserted += count ?? batch.length;
        }

        return new Response(
            JSON.stringify({
                message: `Pipeline populated with ${totalUpserted} new jobs.`,
                count: totalUpserted,
                summary: scrapeSummary,
                rules_processed: rules.length,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );

    } catch (err: any) {
        const isTimeout = err?.name === 'TimeoutError';
        console.error('[scrape-jobs] Fatal error:', err.message);
        return new Response(
            JSON.stringify({
                error: isTimeout ? 'Upstream API timed out after 28s.' : (err.message ?? 'Unknown error'),
            }),
            {
                status: isTimeout ? 504 : 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
        );
    }
});