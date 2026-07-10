/**
 * supabase/functions/auto-apply/index.ts
 * OpusHunter — Auto-Apply Edge Function
 * 2026-07-01 — Fixed broken deploy, BYOK cascade wired in
 *
 * WHAT CHANGED AND WHY:
 *   1. FIXED — DEPLOY-BREAKING: this file imported
 *      `import { createClient } from "@supabase/supabase-js"` — a bare
 *      specifier with no `npm:` prefix. Your deno.json import map only has
 *      an entry for the full `npm:@supabase/supabase-js@2` specifier, not
 *      the bare one, so Deno cannot resolve this import at all. This
 *      function would fail to deploy (or fail on every cold start) with a
 *      module-resolution error, regardless of any key or secret
 *      configuration. Fixed to the same `npm:@supabase/supabase-js@2`
 *      import the other two functions correctly use.
 *   2. Also pinned `std@0.177.0` (a full URL, so it did resolve, but was
 *      an unrelated old version vs. 0.224.0 used everywhere else) up to
 *      0.224.0 for consistency.
 *   3. Replaced the hardcoded, stale `gemini-1.5-flash` model with the
 *      current `gemini-3.1-flash-lite` (verified current & GA as of
 *      2026-07-01), matching generate-cover-letter.
 *   4. Now resolves the Gemini key via BYOK → pool → env (previously only
 *      checked the env var — profile.gemini_key was never read here).
 *   5. Uses the shared `createAdminClient()` for a clear startup error if
 *      SUPABASE_SERVICE_ROLE_KEY isn't configured.
 *
 * Called after a user swipes RIGHT on a job card.
 * Flow:
 *   1. Verify JWT → get user
 *   2. Load the job from job_vault
 *   3. Load the user's profile
 *   4. Find the best matching cover letter (or use base from automation_rule)
 *   5. Generate a personalised cover letter via Gemini (BYOK → pool → env)
 *   6. Update job_applications.status → 'applied'
 *   7. Return the cover letter text + apply_url so the client can open it
 *
 * NOTE ON SCOPE: this endpoint tracks the application and prepares the
 * cover letter — it returns `apply_url` for the client to open, it does
 * not itself submit a form on the employer's/ATS's site. If "auto-apply"
 * is meant to mean full unattended form submission, that's a distinct,
 * much larger feature (real browser automation against arbitrary ATS
 * platforms) and isn't something this function does today — flagging so
 * it's an explicit decision, not a silent gap.
 *
 * POST body: { job_application_id: string }
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'std/http/server.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { resolveKey, markKeyUsed } from '../_shared/keyResolver.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

// ── Gemini cover letter generation ────────────────────────────────────────────

async function generateCoverLetter(
    params: {
        jobTitle: string;
        company: string;
        jobDescription: string;
        baseCoverLetter: string;
        fullName: string;
        keywords: string[];
    },
    geminiKey: string | null,
): Promise<string> {
    if (!geminiKey) {
        return params.baseCoverLetter
            .replace(/\[COMPANY\]/gi, params.company)
            .replace(/\[ROLE\]/gi, params.jobTitle)
            .replace(/\[NAME\]/gi, params.fullName);
    }

    const prompt = `You are an expert career coach writing a compelling, concise cover letter.

Candidate name: ${params.fullName}
Target role: ${params.jobTitle}
Company: ${params.company}
Key skills/keywords: ${params.keywords.join(', ')}

Job description (excerpt):
${params.jobDescription.substring(0, 1200)}

Base cover letter template to personalise:
${params.baseCoverLetter}

Write a personalised cover letter of 3–4 paragraphs. Be specific, confident, professional.
Do NOT include a subject line or formal header — just the body paragraphs.
Do NOT include placeholders like [DATE] or [ADDRESS].
Return ONLY the cover letter body, no preamble.`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
            }),
            signal: AbortSignal.timeout(25000),
        },
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? params.baseCoverLetter;
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabase = createAdminClient();

        const token = authHeader.replace('Bearer ', '').trim();
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid or expired token.' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const { job_application_id } = body as { job_application_id: string };

        if (!job_application_id) {
            return new Response(JSON.stringify({ error: 'job_application_id is required.' }), {
                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { data: application, error: appError } = await supabase
            .from('job_applications')
            .select('id, job_id, status, user_id')
            .eq('id', job_application_id)
            .eq('user_id', user.id)
            .single();

        if (appError || !application) {
            return new Response(JSON.stringify({ error: 'Application not found.' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (application.status === 'applied') {
            return new Response(
                JSON.stringify({ message: 'Already applied.', already_applied: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const { data: job, error: jobError } = await supabase
            .from('job_vault')
            .select('id, title, company, description, url, source_url, tech_stack')
            .eq('id', application.job_id)
            .single();

        if (jobError || !job) {
            return new Response(JSON.stringify({ error: 'Job not found in vault.' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, cv_storage_path')
            .eq('id', user.id)
            .single();

        const fullName = profile?.full_name ?? 'Candidate';

        const { data: rules } = await supabase
            .from('automation_rules')
            .select('base_cover_letter, keywords')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);

        const jobStack = job.tech_stack ?? [];
        let bestRule = rules?.[0] ?? null;
        if (rules && rules.length > 1) {
            let bestOverlap = -1;
            for (const rule of rules) {
                const overlap = (rule.keywords ?? []).filter((k: string) =>
                    jobStack.some((s: string) => s.toLowerCase().includes(k.toLowerCase()))
                ).length;
                if (overlap > bestOverlap) { bestOverlap = overlap; bestRule = rule; }
            }
        }

        const baseCoverLetter = bestRule?.base_cover_letter ?? `Dear Hiring Team at ${job.company},

I am excited to apply for the ${job.title} position. My skills and experience make me an excellent candidate for this role.

I look forward to discussing how I can contribute to ${job.company}.

Best regards,
${fullName}`;

        const keywords = bestRule?.keywords ?? jobStack.slice(0, 5);

        // ── Generate personalised cover letter — BYOK → pool → env ──────────
        let coverLetterBody: string;
        let generatedBy = 'template';

        const resolved = await resolveKey(supabase, user.id, 'gemini');

        try {
            coverLetterBody = await generateCoverLetter({
                jobTitle: job.title,
                company: job.company,
                jobDescription: job.description ?? '',
                baseCoverLetter,
                fullName,
                keywords,
            }, resolved?.key ?? null);

            if (resolved) {
                generatedBy = `gemini:${resolved.source}`;
                await markKeyUsed(supabase, resolved);
            }
        } catch (genErr: any) {
            console.error('[auto-apply] Cover letter generation failed, using template:', genErr.message);
            coverLetterBody = baseCoverLetter
                .replace(/\[COMPANY\]/gi, job.company)
                .replace(/\[ROLE\]/gi, job.title)
                .replace(/\[NAME\]/gi, fullName);
            generatedBy = 'template_fallback';
        }

        const { data: savedCL } = await supabase
            .from('cover_letters')
            .insert({
                user_id: user.id,
                title: `${job.title} @ ${job.company}`,
                body: coverLetterBody,
                company: job.company,
                job_title: job.title,
                generated_by: generatedBy,
                is_default: false,
            })
            .select('id')
            .single();

        const { error: updateError } = await supabase
            .from('job_applications')
            .update({
                status: 'applied',
                applied_at: new Date().toISOString(),
                cover_letter_used: coverLetterBody,
            })
            .eq('id', job_application_id)
            .eq('user_id', user.id);

        if (updateError) {
            throw new Error(`Failed to update application status: ${updateError.message}`);
        }

        await supabase
            .from('job_vault')
            .update({ status: 'applied' })
            .eq('id', job.id)
            .eq('user_id', user.id);

        return new Response(
            JSON.stringify({
                success: true,
                cover_letter: coverLetterBody,
                cover_letter_id: savedCL?.id ?? null,
                generated_by: generatedBy,
                apply_url: job.source_url || job.url,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err: any) {
        const isTimeout = err?.name === 'TimeoutError';
        return new Response(
            JSON.stringify({ error: isTimeout ? 'Request timed out.' : (err.message ?? 'Unknown error') }),
            { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});