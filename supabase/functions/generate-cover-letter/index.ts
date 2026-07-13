/**
 * supabase/functions/generate-cover-letter/index.ts
 * OpusHunter — AI Cover Letter Generator
 * 2026-07-01 — CV bucket fixed, BYOK cascade wired in
 *
 * WHAT CHANGED AND WHY:
 *   1. FIXED: was downloading the candidate's CV from a bucket called
 *      `cv_payloads`, which was never created anywhere (not in seed.sql,
 *      not by profile.tsx's upload flow, which correctly uses `cv_vault`).
 *      Every single generation silently got an empty cvText and produced
 *      a generic, non-CV-personalised letter — with no error, because the
 *      download failure was caught and swallowed. Now reads from `cv_vault`,
 *      matching the bucket that actually has the file in it.
 *   2. Now resolves the Gemini key via BYOK → pool → env (was env → pool
 *      only — profile.gemini_key was saved by the client but never read).
 *   3. Uses the shared `createAdminClient()` for a clear startup error if
 *      SUPABASE_SERVICE_ROLE_KEY isn't configured as an Edge Function
 *      secret, instead of a silent `?? ''` fallback.
 *
 * Model: gemini-3.1-flash-lite — verified current & GA as of 2026-07-01.
 *
 * POST body:
 *   { job_id: string, preview: true }           ← pre-apply modal preview (not saved)
 *   { job_application_id: string }              ← confirmed apply (saves to cover_letters)
 */

import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { resolveKey, markKeyUsed } from '../_shared/keyResolver.ts';
import { serve } from "std/http/server.ts";

interface RequestBody {
    job_id?: string;
    job_application_id?: string;
    preview?: boolean;
}

interface CoverLetterResponse {
    cover_letter: string;
    cover_letter_id: string | null;
    generated_by: string;
}

interface ErrorResponse {
    error: string;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

// ── Model ─────────────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── CV storage bucket — MUST match seed.sql and profile.tsx's upload target ──
const CV_BUCKET = 'cv_vault';

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.72, topK: 40, topP: 0.95, maxOutputTokens: 650 },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        }),
        signal: AbortSignal.timeout(22000),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err.substring(0, 300)}`);
    }
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('Gemini returned empty content.');
    return text.trim();
}

// ── Template fallback ─────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `Dear Hiring Team at [COMPANY],

I am writing to express my strong interest in the [ROLE] position. With my background in [SKILLS], I am confident I would make a meaningful contribution to your team.

I am particularly excited about this opportunity at [COMPANY] and believe my experience aligns well with what you are looking for.

I would welcome the chance to discuss how I can contribute to your success.

Best regards,
[NAME]`;

function applyTemplate(tpl: string, v: Record<string, string>): string {
    return tpl
        .replace(/\[COMPANY\]/gi, v.company ?? 'the company')
        .replace(/\[ROLE\]/gi, v.role ?? 'this position')
        .replace(/\[NAME\]/gi, v.name ?? 'Hiring Team')
        .replace(/\[SKILLS\]/gi, v.skills ?? 'my relevant skills');
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(p: {
    jobTitle: string; company: string; jobDescription: string;
    cvText: string; baseCoverLetter: string;
    candidateName: string; keywords: string[];
}): string {
    return `You are an expert career coach writing a compelling, concise cover letter.

CANDIDATE:
- Name: ${p.candidateName}
- Key skills: ${p.keywords.slice(0, 8).join(', ')}
- CV excerpt: ${p.cvText.substring(0, 600) || '(no CV on file — write generically but confidently)'}

JOB:
- Role: ${p.jobTitle}
- Company: ${p.company}
- Description excerpt: ${p.jobDescription.substring(0, 900)}

BASE TEMPLATE to personalise:
${p.baseCoverLetter.substring(0, 500)}

STRICT RULES:
- 3 paragraphs only: opening hook | value proposition | closing CTA
- Open with "Dear Hiring Team at ${p.company},"
- Mention the role name and 2–3 specific matching skills
- Max 220 words, confident, direct — never sycophantic
- No headers, no bullet points, no formal address, no date
- Output ONLY the cover letter body — nothing else before or after`;
}

// ── Main handler ───────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Missing auth.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const supabase = createAdminClient();

        const { data: { user }, error: authErr } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '').trim()
        );
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const body = await req.json() as { job_application_id?: string; job_id?: string; preview?: boolean };
        const isPreview = body.preview === true;

        let jobId = body.job_id;
        if (!jobId && body.job_application_id) {
            const { data: app } = await supabase
                .from('job_applications').select('job_id')
                .eq('id', body.job_application_id).eq('user_id', user.id).single();
            jobId = app?.job_id;
        }
        if (!jobId) {
            return new Response(JSON.stringify({ error: 'job_id or job_application_id required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: job } = await supabase
            .from('job_vault').select('id, title, company, description, tech_stack')
            .eq('id', jobId).single();
        if (!job) {
            return new Response(JSON.stringify({ error: 'Job not found.' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: profile } = await supabase
            .from('profiles').select('full_name, cv_storage_path')
            .eq('id', user.id).single();

        const candidateName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Candidate';

        // ── CV text — now reads from the bucket that actually has the file ──
        let cvText = '';
        if (profile?.cv_storage_path) {
            try {
                const { data: cvBlob, error: cvErr } = await supabase.storage
                    .from(CV_BUCKET)
                    .download(profile.cv_storage_path);
                if (cvErr) console.warn('[gcl] CV download failed:', cvErr.message);
                if (cvBlob) {
                    const raw = await cvBlob.text();
                    cvText = raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').substring(0, 1200);
                }
            } catch (e: any) {
                console.warn('[gcl] CV read exception (likely binary PDF, still usable as text-ish):', e.message);
            }
        }

        const { data: rules } = await supabase
            .from('automation_rules').select('keywords, base_cover_letter')
            .eq('user_id', user.id).eq('is_active', true)
            .order('created_at', { ascending: false }).limit(5);

        const jobStack = (job.tech_stack ?? []).map((s: string) => s.toLowerCase());
        let bestRule = rules?.[0] ?? null;
        if (rules && rules.length > 1) {
            let best = -1;
            for (const r of rules) {
                const overlap = (r.keywords ?? []).filter((k: string) =>
                    jobStack.some((s: string) => s.includes(k.toLowerCase()))).length;
                if (overlap > best) { best = overlap; bestRule = r; }
            }
        }

        const baseTpl = bestRule?.base_cover_letter?.trim() || DEFAULT_TEMPLATE;
        const keywords: string[] = bestRule?.keywords ?? (job.tech_stack ?? []).slice(0, 6);

        // ── Generate — BYOK first, then pool, then env ────────────────────────
        const resolved = await resolveKey(supabase, user.id, 'gemini');
        let coverLetter = '';
        let generatedBy: string = 'template';

        if (resolved) {
            try {
                coverLetter = await callGemini(
                    buildPrompt({
                        jobTitle: job.title, company: job.company,
                        jobDescription: job.description ?? '', cvText, baseCoverLetter: baseTpl,
                        candidateName, keywords,
                    }),
                    resolved.key,
                );
                generatedBy = `gemini:${resolved.source}`;
                await markKeyUsed(supabase, resolved);
            } catch (e: any) {
                console.warn('[gcl] Gemini failed, falling back to template:', e.message);
                coverLetter = applyTemplate(baseTpl, {
                    company: job.company, role: job.title,
                    name: candidateName, skills: keywords.slice(0, 3).join(', '),
                });
                generatedBy = 'template_fallback';
            }
        } else {
            coverLetter = applyTemplate(baseTpl, {
                company: job.company, role: job.title,
                name: candidateName, skills: keywords.slice(0, 3).join(', '),
            });
        }

        let coverLetterId: string | null = null;
        if (!isPreview) {
            const { data: saved } = await supabase
                .from('cover_letters')
                .insert({
                    user_id: user.id,
                    title: `${job.title} @ ${job.company}`,
                    body: coverLetter,
                    company: job.company,
                    job_title: job.title,
                    generated_by: generatedBy,
                    is_default: false,
                })
                .select('id').single();
            coverLetterId = saved?.id ?? null;

            if (body.job_application_id) {
                await supabase.from('job_applications')
                    .update({ cover_letter_used: coverLetter })
                    .eq('id', body.job_application_id).eq('user_id', user.id);
            }
        }

        return new Response(
            JSON.stringify({ cover_letter: coverLetter, cover_letter_id: coverLetterId, generated_by: generatedBy }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );

    } catch (err: any) {
        console.error('[generate-cover-letter]', err.message);
        return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});