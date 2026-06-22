/**
 * supabase/functions/scrape-jobs/index.ts
 * OpusHunter — Job Scraping Edge Function
 *
 * FIXES APPLIED:
 *   P1-04: All external fetch() calls now use AbortSignal.timeout(30000)
 *   P1-05: (no direct import here — supabaseAdmin.ts fixed separately)
 *
 * Accepts POST body: { keywords: string[], location: string, work_types: string[], user_id: string }
 * Scrapes jobs via RapidAPI JSearch, scores them, upserts to job_vault.
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Types ──────────────────────────────────────────────────────────────────

interface ScrapeRequest {
    keywords: string[];
    location: string;
    work_types: string[];
}

interface RawJob {
    job_id: string;
    job_title: string;
    employer_name: string;
    job_description: string;
    job_min_salary?: number;
    job_max_salary?: number;
    job_salary_currency?: string;
    job_city?: string;
    job_country?: string;
    job_employment_type?: string;
    job_required_skills?: string[];
    job_apply_link: string;
}

// ── Match scoring ──────────────────────────────────────────────────────────

function scoreJob(job: RawJob, keywords: string[]): number {
    if (!keywords.length) return 50;
    const haystack = [
        job.job_title,
        job.job_description,
        ...(job.job_required_skills ?? []),
    ]
        .join(' ')
        .toLowerCase();

    let hits = 0;
    for (const kw of keywords) {
        if (haystack.includes(kw.toLowerCase())) hits++;
    }
    return Math.round((hits / keywords.length) * 100);
}

function formatSalary(job: RawJob): string | null {
    if (!job.job_min_salary && !job.job_max_salary) return null;
    const currency = job.job_salary_currency ?? 'USD';
    const min = job.job_min_salary ? `${currency} ${job.job_min_salary.toLocaleString()}` : null;
    const max = job.job_max_salary ? `${currency} ${job.job_max_salary.toLocaleString()}` : null;
    if (min && max) return `${min} – ${max}`;
    return min ?? max;
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // ── Auth verification ────────────────────────────────────────────────────
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

        // ── Parse body ──────────────────────────────────────────────────────────
        const body: ScrapeRequest = await req.json();
        const { keywords = [], location = 'Remote', work_types = [] } = body;

        if (!keywords.length) {
            return new Response(JSON.stringify({ error: 'At least one keyword is required.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Resolve RapidAPI key ────────────────────────────────────────────────
        // Priority: system admin key pool → env fallback
        const { data: keyRow } = await supabase
            .from('api_keys')
            .select('api_key')
            .eq('provider', 'rapidapi')
            .eq('is_active', true)
            .eq('tier', 'system')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        const rapidApiKey = keyRow?.api_key ?? Deno.env.get('RAPIDAPI_KEY') ?? '';

        if (!rapidApiKey) {
            return new Response(JSON.stringify({ error: 'No RapidAPI key configured.' }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Fetch from JSearch via RapidAPI ─────────────────────────────────────
        // P1-04: AbortSignal.timeout(30000) on ALL external fetches
        const query = [...keywords, location].join(' ');
        const employmentTypes = work_types.length
            ? work_types.map((t: string) => t.toUpperCase()).join(',')
            : 'FULLTIME,CONTRACTOR,PARTTIME';

        const jsearchUrl = new URL('https://jsearch.p.rapidapi.com/search');
        jsearchUrl.searchParams.set('query', query);
        jsearchUrl.searchParams.set('page', '1');
        jsearchUrl.searchParams.set('num_pages', '3');
        jsearchUrl.searchParams.set('employment_types', employmentTypes);
        jsearchUrl.searchParams.set('date_posted', 'week');

        const apiResponse = await fetch(jsearchUrl.toString(), {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': rapidApiKey,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            // ✅ P1-04: 30-second hard abort — prevents edge worker OOM on hanging upstream
            signal: AbortSignal.timeout(30000),
        });

        if (!apiResponse.ok) {
            const errText = await apiResponse.text();
            throw new Error(`JSearch API error ${apiResponse.status}: ${errText}`);
        }

        const apiData = await apiResponse.json();
        const rawJobs: RawJob[] = apiData?.data ?? [];

        if (!rawJobs.length) {
            return new Response(
                JSON.stringify({ message: 'No jobs found for the given keywords.', count: 0 }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Transform + score ───────────────────────────────────────────────────
        const jobsToUpsert = rawJobs.map((job: RawJob) => ({
            user_id: user.id,
            external_job_id: job.job_id,
            title: job.job_title ?? 'Unknown Title',
            company: job.employer_name ?? 'Unknown Company',
            description: job.job_description?.substring(0, 2000) ?? null,
            salary: formatSalary(job),
            location: [job.job_city, job.job_country].filter(Boolean).join(', ') || location,
            tech_stack: job.job_required_skills ?? [],
            source_url: job.job_apply_link ?? '',
            match_score: scoreJob(job, keywords),
            status: 'pending',
        }));

        // ── Upsert to job_vault ─────────────────────────────────────────────────
        const { error: upsertError, count } = await supabase
            .from('job_vault')
            .upsert(jobsToUpsert, {
                onConflict: 'user_id,external_job_id',
                ignoreDuplicates: false,
                count: 'exact',
            });

        if (upsertError) throw new Error(`DB upsert failed: ${upsertError.message}`);

        return new Response(
            JSON.stringify({
                message: `Pipeline populated with ${count ?? jobsToUpsert.length} jobs.`,
                count: count ?? jobsToUpsert.length,
                keywords,
                location,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err: any) {
        const isTimeout = err?.name === 'TimeoutError';
        return new Response(
            JSON.stringify({
                error: isTimeout ? 'Upstream API timed out after 30s.' : (err.message ?? 'Unknown error'),
            }),
            {
                status: isTimeout ? 504 : 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
        );
    }
});