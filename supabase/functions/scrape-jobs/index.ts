/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Job Scraping Edge Function
 * 2026-07-01 — BYOK cascade wired in
 *
 * WHAT CHANGED AND WHY:
 *   1. Now uses `_shared/supabaseAdmin.ts::createAdminClient()` instead of
 *      building its own client inline with `?? ''` fallbacks. If
 *      SUPABASE_SERVICE_ROLE_KEY isn't set as an Edge Function secret, you
 *      now get a clear thrown error ("SUPABASE_URL or
 *      SUPABASE_SERVICE_ROLE_KEY env vars are not set") instead of a vague
 *      auth failure three steps later. If your scraper has been failing
 *      with something like "Invalid API key" at the very first step, this
 *      was almost certainly why.
 *   2. Now checks `profiles.rapidapi_key` FIRST via `_shared/keyResolver.ts`
 *      before falling back to the admin-managed api_keys pool, then env.
 *      Previously BYOK keys saved in Profile were never read by this
 *      function at all — only the shared pool / env var were ever tried.
 *   3. IMPORTANT — a separate, non-code issue this file can't fix: Supabase
 *      Edge Function secrets are configured via `supabase secrets set` or
 *      Dashboard → Edge Functions → Secrets. They are NOT the same as
 *      Vercel env vars, a `.env` file, or EAS secrets — none of those are
 *      visible to Deno.env at runtime. If RAPIDAPI_KEY / GEMINI_API_KEY /
 *      SUPABASE_SERVICE_ROLE_KEY were only ever set in Vercel/.env/EAS,
 *      this function has never been able to see them, regardless of how
 *      many places you've added them.
 *   4. Also: after any code change to a Supabase Edge Function, it must be
 *      re-deployed — `supabase functions deploy scrape-jobs` — editing the
 *      file in your repo does not update what's actually running.
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'std/http/server.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { resolveKeyPool, markKeyUsed, type ResolvedKey } from '../_shared/keyResolver.ts';

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
    job_employment_type?: string;
    job_employment_types?: string[];
    job_required_skills?: string[];
    job_required_experience?: {
        required_experience_in_months?: number;
        no_experience_required?: boolean;
    };
    job_min_salary?: number;
    job_max_salary?: number;
    job_salary_currency?: string;
    job_salary_period?: string;
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
}

// ── Salary normalisation to annual ────────────────────────────────────────────

function normaliseSalary(job: JSearchJob): string | null {
    const { job_min_salary, job_max_salary, job_salary_currency, job_salary_period } = job;
    if (!job_min_salary && !job_max_salary) return null;

    const multiplier: Record<string, number> = {
        YEAR: 1, ANNUAL: 1, MONTH: 12, WEEK: 52, DAY: 260, HOUR: 2080,
    };

    const period = (job_salary_period ?? 'YEAR').toUpperCase();
    const mult = multiplier[period] ?? 1;
    const currency = job_salary_currency ?? 'USD';

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n * mult));

    if (job_min_salary && job_max_salary) return `${currency} ${fmt(job_min_salary)} – ${fmt(job_max_salary)} /yr`;
    if (job_min_salary) return `${currency} ${fmt(job_min_salary)}+ /yr`;
    return `${currency} up to ${fmt(job_max_salary!)} /yr`;
}

// ── Match scoring (weighted) ───────────────────────────────────────────────────

function scoreJob(job: JSearchJob, keywords: string[]): number {
    if (!keywords.length) return 50;
    const normalised = keywords.map((k) => k.toLowerCase().trim());

    let titleHits = 0;
    const title = (job.job_title ?? '').toLowerCase();
    for (const kw of normalised) if (title.includes(kw)) titleHits++;

    let skillHits = 0;
    const skills = (job.job_required_skills ?? []).join(' ').toLowerCase();
    for (const kw of normalised) if (skills.includes(kw)) skillHits++;

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
    const sources = [...(job.job_required_skills ?? []), ...(job.job_highlights?.Qualifications ?? [])];
    const techPattern = /\b(React|React Native|TypeScript|JavaScript|Python|Node\.js|Expo|Deno|Swift|Kotlin|Flutter|Go|Rust|AWS|GCP|Azure|Docker|Kubernetes|PostgreSQL|Supabase|Firebase|GraphQL|REST|Next\.js|Vue|Angular|TailwindCSS|Redux|Zustand|Git|CI\/CD|Figma|Jira)\b/gi;
    const fromText = sources.join(' ').match(techPattern) ?? [];
    return [...new Set([...fromText.map((s) => s.trim())])].slice(0, 12);
}

// ── JSearch API fetch with retry across the resolved key pool on 429 ─────────

async function fetchJSearch(
    params: URLSearchParams,
    keys: ResolvedKey[],
    supabase: any,
): Promise<{ jobs: JSearchJob[]; keyUsed: ResolvedKey }> {
    // FIX (2026-07-06): JSearch retired `/search` — confirmed via OpenWeb Ninja
    // docs and matches the live 404 in your logs ("Endpoint '/search' does
    // not exist"). Current endpoint is `/search-v2`. Response shape is
    // unchanged (still `{ data: JSearchJob[] }`), so nothing else here needs
    // to change — this was never a key/auth problem. The 404 itself proves
    // RAPIDAPI_KEY authenticated fine; an invalid key gets 401/403, not 404.
    const url = `https://jsearch.p.rapidapi.com/search-v2?${params.toString()}`;

    let lastError = '';
    for (const resolved of keys) {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': resolved.key,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            signal: AbortSignal.timeout(28000),
        });

        if (response.status === 429) {
            lastError = `429 rate-limited (${resolved.source} key)`;
            console.warn(`[scrape-jobs] Key rotation: ${lastError}, trying next…`);
            continue;
        }

        if (!response.ok) {
            const body = await response.text();
            lastError = `JSearch ${response.status}: ${body.substring(0, 200)}`;
            // 401/403 usually means a bad/expired key specifically — keep trying others.
            if (response.status === 401 || response.status === 403) {
                console.warn(`[scrape-jobs] Key rejected (${resolved.source}): ${lastError}`);
                continue;
            }
            throw new Error(lastError);
        }

        await markKeyUsed(supabase, resolved);
        const data: any = await response.json();

        // FIX (2026-07-09): confirmed via your own logs — /search-v2 returns
        // 200 OK (so the endpoint itself is right), but something about its
        // shape doesn't match the old flat `{ data: JSearchJob[] }` contract
        // from /search, causing "rawJobs.filter is not a function" downstream.
        // Rather than guess the new shape a second time, this checks every
        // shape the JSearch family of endpoints is known to use (flat array,
        // or nested under .jobs/.results for cursor-paginated responses) and
        // logs the raw top-level keys when NONE of them match, so the next
        // failure tells us the exact real shape instead of crashing blind.
        let safeJobs: JSearchJob[];
        if (Array.isArray(data?.data)) {
            safeJobs = data.data;
        } else if (Array.isArray(data?.data?.jobs)) {
            safeJobs = data.data.jobs;
        } else if (Array.isArray(data?.jobs)) {
            safeJobs = data.jobs;
        } else if (Array.isArray(data?.results)) {
            safeJobs = data.results;
        } else {
            console.error(
                '[scrape-jobs] Unrecognised JSearch response shape. Top-level keys:',
                data && typeof data === 'object' ? Object.keys(data) : typeof data,
                '\u2014 nested data keys:',
                data?.data && typeof data.data === 'object' ? Object.keys(data.data) : typeof data?.data,
            );
            safeJobs = [];
        }

        return { jobs: safeJobs, keyUsed: resolved };
    }

    throw new Error(lastError || 'All RapidAPI keys exhausted or rejected.');
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Throws a CLEAR error if SUPABASE_SERVICE_ROLE_KEY isn't configured,
        // instead of silently building a broken client.
        const supabase = createAdminClient();

        const token = authHeader.replace('Bearer ', '').trim();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        let body: ScrapeRequest = {};
        try { body = await req.json(); } catch { /* empty body is fine */ }

        // ── Resolve RapidAPI keys: BYOK → pool → env, in that order ───────────
        const keyPool = await resolveKeyPool(supabase, user.id, 'rapidapi');

        if (!keyPool.length) {
            return new Response(
                JSON.stringify({
                    error: 'No RapidAPI key available.',
                    detail: 'Checked: your Profile BYOK key, the admin api_keys pool (provider=rapidapi, is_active=true), and the RAPIDAPI_KEY Edge Function secret. All three are empty. Add a key in Profile, or in Admin \u2192 API Keys, or run: supabase secrets set RAPIDAPI_KEY=...',
                }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Resolve search rules ──────────────────────────────────────────────
        interface SearchRule { keywords: string[]; location: string; work_types: string[]; }
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

        const { data: existingJobs } = await supabase
            .from('job_vault')
            .select('external_job_id')
            .eq('user_id', user.id)
            .in('status', ['pending', 'approved'])
            .limit(500);

        const seenIds = new Set((existingJobs ?? []).map((j: any) => j.external_job_id));

        const allJobsToUpsert: any[] = [];
        const scrapeSummary: Array<{ rule: string; fetched: number; new: number; key_source?: string }> = [];

        for (const rule of rules) {
            const { keywords, location, work_types } = rule;
            const query = keywords.join(' ') + (location && location.toLowerCase() !== 'remote' ? ` in ${location}` : '');

            const employmentTypes = work_types.length > 0
                ? work_types.map((t) => t.toUpperCase()).join(',')
                : 'FULLTIME,CONTRACTOR';

            const params = new URLSearchParams({
                query,
                page: '1',
                num_pages: '3',
                employment_types: employmentTypes,
                date_posted: 'week',
                language: 'en',
                ...(location.toLowerCase() === 'remote' || location.toLowerCase().includes('remote')
                    ? { remote_jobs_only: 'true' }
                    : {}),
            });

            let rawJobs: JSearchJob[] = [];
            let keySource = 'none';
            try {
                const result = await fetchJSearch(params, keyPool, supabase);
                rawJobs = result.jobs;
                keySource = result.keyUsed.source;
            } catch (fetchErr: any) {
                console.error(`[scrape-jobs] Rule "${keywords[0]}" fetch failed:`, fetchErr.message);
                scrapeSummary.push({ rule: keywords[0], fetched: 0, new: 0, key_source: 'failed: ' + fetchErr.message });
                continue;
            }

            const newJobs = rawJobs.filter((j) => !seenIds.has(j.job_id));

            const transformed = newJobs.map((job) => {
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
            scrapeSummary.push({ rule: keywords.join(', '), fetched: rawJobs.length, new: newJobs.length, key_source: keySource });
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

        const BATCH = 50;
        let totalUpserted = 0;

        for (let i = 0; i < allJobsToUpsert.length; i += BATCH) {
            const batch = allJobsToUpsert.slice(i, i + BATCH);
            const { error: upsertError, count } = await supabase
                .from('job_vault')
                .upsert(batch, { onConflict: 'user_id,external_job_id', ignoreDuplicates: false, count: 'exact' });

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
            JSON.stringify({ error: isTimeout ? 'Upstream API timed out after 28s.' : (err.message ?? 'Unknown error') }),
            { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});