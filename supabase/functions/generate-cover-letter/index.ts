/**
 * supabase/functions/generate-cover-letter/index.ts
 * OpusHunter — AI Cover Letter Generator
 * Updated: 2026-06-26
 *
 * Model: gemini-3.1-flash-lite
 *
 * Key resolution order:
 *   1. GEMINI_API_KEY env secret (Supabase secrets)
 *   2. api_keys table (admin-managed fallback pool, provider = 'gemini')
 *
 * POST body:
 *   { job_id: string, preview: true }           ← pre-apply modal preview (not saved)
 *   { job_application_id: string }              ← confirmed apply (saves to cover_letters)
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

// ── Model ─────────────────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Gemini call ───────────────────────────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.72,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 650,
            },
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

// ── Key resolution: env → api_keys pool ──────────────────────────────────────

async function resolveGeminiKey(supabase: any): Promise<string | null> {
    const envKey = Deno.env.get('GEMINI_API_KEY');
    if (envKey) return envKey;

    const { data: keys } = await supabase
        .from('api_keys')
        .select('id, api_key')
        .eq('provider', 'gemini')
        .eq('is_active', true)
        .order('last_used', { ascending: true, nullsFirst: true })
        .limit(3);

    if (keys?.length) {
        await supabase
            .from('api_keys')
            .update({ last_used: new Date().toISOString() })
            .eq('id', keys[0].id);
        return keys[0].api_key;
    }
    return null;
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
- CV excerpt: ${p.cvText.substring(0, 600)}

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

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } },
        );

        const { data: { user }, error: authErr } = await supabase.auth.getUser(
            authHeader.replace('Bearer ', '').trim()
        );
        if (authErr || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const body = await req.json() as { job_application_id?: string; job_id?: string; preview?: boolean };
        const isPreview = body.preview === true;

        // Resolve job_id
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

        // Load job
        const { data: job } = await supabase
            .from('job_vault').select('id, title, company, description, tech_stack')
            .eq('id', jobId).single();
        if (!job) {
            return new Response(JSON.stringify({ error: 'Job not found.' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Load profile
        const { data: profile } = await supabase
            .from('profiles').select('full_name, cv_storage_path')
            .eq('id', user.id).single();

        const candidateName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Candidate';

        // Best-effort CV text
        let cvText = '';
        if (profile?.cv_storage_path) {
            try {
                const { data: cvBlob } = await supabase.storage.from('cv_payloads').download(profile.cv_storage_path);
                if (cvBlob) {
                    const raw = await cvBlob.text();
                    cvText = raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').substring(0, 1200);
                }
            } catch { /* binary PDF — skip */ }
        }

        // Best matching automation rule
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

        // Generate
        const geminiKey = await resolveGeminiKey(supabase);
        let coverLetter = '';
        let generatedBy: 'gemini' | 'template' = 'template';

        if (geminiKey) {
            try {
                coverLetter = await callGemini(
                    buildPrompt({
                        jobTitle: job.title, company: job.company,
                        jobDescription: job.description ?? '', cvText, baseCoverLetter: baseTpl,
                        candidateName, keywords
                    }),
                    geminiKey,
                );
                generatedBy = 'gemini';
            } catch (e: any) {
                console.warn('[gcl] Gemini failed, falling back to template:', e.message);
                coverLetter = applyTemplate(baseTpl, {
                    company: job.company, role: job.title,
                    name: candidateName, skills: keywords.slice(0, 3).join(', '),
                });
            }
        } else {
            coverLetter = applyTemplate(baseTpl, {
                company: job.company, role: job.title,
                name: candidateName, skills: keywords.slice(0, 3).join(', '),
            });
        }

        // Persist if not preview
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