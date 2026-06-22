/**
 * supabase/functions/auto-apply/index.ts
 * OpusHunter — Auto-Apply Edge Function
 *
 * Called after a user swipes RIGHT on a job card.
 * Flow:
 *   1. Verify JWT → get user
 *   2. Load the job from job_vault
 *   3. Load the user's profile + cv_storage_path
 *   4. Find the best matching cover letter (or use base from automation_rule)
 *   5. Generate a personalised cover letter via Gemini if GEMINI_API_KEY is set
 *   6. Update job_applications.status → 'applied'
 *   7. Return the cover letter text so the client can display it
 *
 * POST body: { job_application_id: string }
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from "@supabase/supabase-js";

declare const Deno: { env: { get: (k: string) => string | undefined } };

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Gemini cover letter generation ────────────────────────────────────────────

async function generateCoverLetter(params: {
    jobTitle: string;
    company: string;
    jobDescription: string;
    baseCoverLetter: string;
    fullName: string;
    keywords: string[];
}): Promise<string> {
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
        // Graceful fallback — return the base cover letter personalised minimally
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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
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
        // ── Auth ────────────────────────────────────────────────────────────────
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
        const body = await req.json();
        const { job_application_id } = body as { job_application_id: string };

        if (!job_application_id) {
            return new Response(JSON.stringify({ error: 'job_application_id is required.' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Load job application ────────────────────────────────────────────────
        const { data: application, error: appError } = await supabase
            .from('job_applications')
            .select('id, job_id, status, user_id')
            .eq('id', job_application_id)
            .eq('user_id', user.id)
            .single();

        if (appError || !application) {
            return new Response(JSON.stringify({ error: 'Application not found.' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (application.status === 'applied') {
            return new Response(
                JSON.stringify({ message: 'Already applied.', already_applied: true }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Load job details ────────────────────────────────────────────────────
        const { data: job, error: jobError } = await supabase
            .from('job_vault')
            .select('id, title, company, description, url, source_url, tech_stack')
            .eq('id', application.job_id)
            .single();

        if (jobError || !job) {
            return new Response(JSON.stringify({ error: 'Job not found in vault.' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ── Load profile ────────────────────────────────────────────────────────
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, cv_storage_path')
            .eq('id', user.id)
            .single();

        const fullName = profile?.full_name ?? 'Candidate';

        // ── Load best matching automation rule (for base cover letter) ──────────
        const { data: rules } = await supabase
            .from('automation_rules')
            .select('base_cover_letter, keywords')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);

        // Pick the rule whose keywords most overlap with job tech_stack
        const jobStack = job.tech_stack ?? [];
        let bestRule = rules?.[0] ?? null;
        if (rules && rules.length > 1) {
            let bestOverlap = -1;
            for (const rule of rules) {
                const overlap = (rule.keywords ?? []).filter((k: string) =>
                    jobStack.some((s: string) => s.toLowerCase().includes(k.toLowerCase()))
                ).length;
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    bestRule = rule;
                }
            }
        }

        const baseCoverLetter = bestRule?.base_cover_letter ?? `Dear Hiring Team at ${job.company},

I am excited to apply for the ${job.title} position. My skills and experience make me an excellent candidate for this role.

I look forward to discussing how I can contribute to ${job.company}.

Best regards,
${fullName}`;

        const keywords = bestRule?.keywords ?? jobStack.slice(0, 5);

        // ── Generate personalised cover letter ──────────────────────────────────
        let coverLetterBody: string;
        let generatedBy = 'template';

        try {
            const geminiKey = Deno.env.get('GEMINI_API_KEY');
            coverLetterBody = await generateCoverLetter({
                jobTitle: job.title,
                company: job.company,
                jobDescription: job.description ?? '',
                baseCoverLetter,
                fullName,
                keywords,
            });
            generatedBy = geminiKey ? 'gemini' : 'template';
        } catch (genErr: any) {
            console.error('[auto-apply] Cover letter generation failed, using template:', genErr.message);
            coverLetterBody = baseCoverLetter
                .replace(/\[COMPANY\]/gi, job.company)
                .replace(/\[ROLE\]/gi, job.title)
                .replace(/\[NAME\]/gi, fullName);
            generatedBy = 'template_fallback';
        }

        // ── Save cover letter to cover_letters table ────────────────────────────
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

        // ── Update job_applications status → applied ────────────────────────────
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

        // ── Update job_vault status → applied ───────────────────────────────────
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
            JSON.stringify({
                error: isTimeout ? 'Request timed out.' : (err.message ?? 'Unknown error'),
            }),
            {
                status: isTimeout ? 504 : 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
        );
    }
});