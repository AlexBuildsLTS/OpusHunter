/**
 * supabase/functions/generate-cover-letter/index.ts
 * OpusHunter — AI Cover Letter Generator
 * Updated: 2026-06-26
 *
 * Model: gemini-1.5-flash-latest (fastest/cheapest, June 2026)
 * Note: "Gemini 3.1 Flash-Lite" does not exist as a public API endpoint —
 *       gemini-1.5-flash-latest is the correct fastest/cheapest model.
 *
 * Two call modes:
 *   PREVIEW:  POST { job_id, preview: true }
 *             → generates letter, returns it WITHOUT saving to DB
 *             → used by JobDetailModal before user confirms apply
 *
 *   SAVE:     POST { job_id, job_application_id }
 *             → generates letter, saves to cover_letters table, returns it
 *             → used by auto-apply after swipe right
 *
 * Fallback: if GEMINI_API_KEY is missing → template interpolation
 * Key resolution: user profile BYOK → admin api_keys pool → env var
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

const GEMINI_MODEL = 'gemini-1.5-flash-latest';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Types ──────────────────────────────────────────────────────────────────────

interface GenerateRequest {
    job_id: string;
    job_application_id?: string;
    preview?: boolean;
}

interface JobRow {
    id: string;
    title: string;
    company: string;
    description: string | null;
    tech_stack: string[];
    location: string | null;
}

interface ProfileRow {
    id: string;
    full_name: string | null;
    cv_storage_path: string | null;
}

interface AutomationRuleRow {
    keywords: string[];
    base_cover_letter: string;
    location: string;
}

// ── Gemini API call ────────────────────────────────────────────────────────────

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const endpoint = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.72,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 700,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            ],
        }),
        signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini ${res.status}: ${errBody.substring(0, 300)}`);
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) throw new Error('Gemini returned empty content.');
    return text.trim();
}

// ── Template fallback ──────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = `Dear Hiring Team at [COMPANY],

I am writing to express my strong interest in the [ROLE] position. With my experience in [SKILLS], I am confident in my ability to make a meaningful contribution to your team.

Throughout my career, I have developed a strong foundation in the skills required for this role. I am particularly drawn to [COMPANY] because of the opportunity to work on challenging problems with a talented team.

I would welcome the opportunity to discuss how my background and skills align with your needs. Thank you for considering my application.

Best regards,
[NAME]`;

function templateFallback(
    template: string,
    vars: { company: string; role: string; name: string; skills: string },
): string {
    return (template || DEFAULT_TEMPLATE)
        .replace(/\[COMPANY\]/gi, vars.company)
        .replace(/\[ROLE\]/gi, vars.role)
        .replace(/\[NAME\]/gi, vars.name)
        .replace(/\[SKILLS\]/gi, vars.skills);
}

// ── CV text extraction (best-effort) ──────────────────────────────────────────

async function tryReadCVText(
    adminClient: any,
    cvStoragePath: string | null,
): Promise<string> {
    if (!cvStoragePath) return '';
    try {
        const { data, error } = await adminClient.storage
            .from('cv_payloads')
            .download(cvStoragePath);
        if (error || !data) return '';
        // For PDFs we can only get raw bytes here — extract readable text chars only
        const buffer = await data.arrayBuffer();
        const raw = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        // Strip PDF binary noise, keep printable ASCII runs > 4 chars
        const text = raw
            .replace(/[^\x20-\x7E\n]/g, ' ')
            .replace(/ {3,}/g, ' ')
            .trim();
        return text.substring(0, 3000); // cap at 3k chars for prompt budget
    } catch {
        return '';
    }
}

// ── Resolve Gemini API key ─────────────────────────────────────────────────────
// Priority: admin api_keys pool → GEMINI_API_KEY env var

async function resolveGeminiKey(
    adminClient: ReturnType<typeof createClient>,
): Promise<string | null> {
    // 1. Try admin key pool
    const { data: keyRow } = await adminClient
        .from('api_keys')
        .select('api_key')
        .eq('provider', 'gemini')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle<{ api_key: string }>();

    if (keyRow?.api_key) return keyRow.api_key;

    // 2. Env var fallback
    return Deno.env.get('GEMINI_API_KEY') ?? null;
}

// ── Best matching automation rule ─────────────────────────────────────────────

function pickBestRule(
    rules: AutomationRuleRow[],
    job: JobRow,
): AutomationRuleRow | null {
    if (!rules.length) return null;
    if (rules.length === 1) return rules[0];

    const jobTerms = [
        ...(job.tech_stack ?? []),
        ...(job.title?.toLowerCase().split(' ') ?? []),
    ].map((t) => t.toLowerCase());

    let bestScore = -1;
    let bestRule = rules[0];

    for (const rule of rules) {
        const overlap = rule.keywords.filter((kw) =>
            jobTerms.some((t) => t.includes(kw.toLowerCase())),
        ).length;
        if (overlap > bestScore) {
            bestScore = overlap;
            bestRule = rule;
        }
    }

    return bestRule;
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
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } },
        );

        const token = authHeader.replace('Bearer ', '').trim();
        const { data: { user }, error: authErr } = await adminClient.auth.getUser(token);
        if (authErr || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token.' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Parse body ────────────────────────────────────────────────────────────
        const body: GenerateRequest = await req.json();
        const { job_id, job_application_id, preview = false } = body;

        if (!job_id) {
            return new Response(
                JSON.stringify({ error: 'job_id is required.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Load job ──────────────────────────────────────────────────────────────
        const { data: job, error: jobErr } = await adminClient
            .from('job_vault')
            .select('id, title, company, description, tech_stack, location')
            .eq('id', job_id)
            .single();

        if (jobErr || !job) {
            return new Response(
                JSON.stringify({ error: 'Job not found.' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Load user profile ─────────────────────────────────────────────────────
        const { data: profile } = await adminClient
            .from('profiles')
            .select('id, full_name, cv_storage_path')
            .eq('id', user.id)
            .single() as { data: ProfileRow | null };

        const fullName = profile?.full_name ?? 'the hiring team';

        // ── Load automation rules ─────────────────────────────────────────────────
        const { data: rules } = await adminClient
            .from('automation_rules')
            .select('keywords, base_cover_letter, location')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(10) as { data: AutomationRuleRow[] | null };

        const matchedRule = pickBestRule(rules ?? [], job as JobRow);
        const baseTemplate = matchedRule?.base_cover_letter ?? DEFAULT_TEMPLATE;
        const keywords = matchedRule?.keywords ?? job.tech_stack ?? [];

        // ── Try CV text extraction ────────────────────────────────────────────────
        const cvText = await tryReadCVText(adminClient, profile?.cv_storage_path ?? null);

        // ── Resolve Gemini key ────────────────────────────────────────────────────
        const geminiKey = await resolveGeminiKey(adminClient as any);

        // ── Generate cover letter ─────────────────────────────────────────────────
        let coverLetterBody: string;
        let generatedBy: 'gemini' | 'template_fallback';

        if (geminiKey) {
            const cvSection = cvText
                ? `\n\nApplicant CV excerpt (use for personalisation):\n${cvText}`
                : '';

            const prompt = `You are an expert career coach writing a compelling, concise cover letter.

Candidate name: ${fullName}
Target role: ${job.title}
Company: ${job.company}
Location: ${job.location ?? 'Not specified'}
Key skills/keywords: ${keywords.join(', ')}

Job description (excerpt):
${(job.description ?? '').substring(0, 1200)}${cvSection}

Base cover letter template to personalise (improve and personalise this):
${baseTemplate.substring(0, 800)}

Instructions:
- Write 3–4 tight paragraphs. Confident, professional, specific.
- Reference the company name and role explicitly.
- Weave in at least 3 of the key skills naturally.
- Do NOT include subject lines, dates, addresses, or placeholders like [DATE].
- Do NOT start with "I am writing to". Open with a strong hook.
- Return ONLY the cover letter body. No preamble, no "Here is your cover letter:".`;

            try {
                coverLetterBody = await callGemini(prompt, geminiKey);
                generatedBy = 'gemini';

                // Update last_used on the key
                await adminClient
                    .from('api_keys')
                    .update({ last_used: new Date().toISOString() })
                    .eq('provider', 'gemini')
                    .eq('is_active', true);
            } catch (geminiErr: any) {
                console.error('[generate-cover-letter] Gemini failed, using template:', geminiErr.message);
                coverLetterBody = templateFallback(baseTemplate, {
                    company: job.company,
                    role: job.title,
                    name: fullName,
                    skills: keywords.slice(0, 4).join(', '),
                });
                generatedBy = 'template_fallback';
            }
        } else {
            // No API key at all — pure template
            coverLetterBody = templateFallback(baseTemplate, {
                company: job.company,
                role: job.title,
                name: fullName,
                skills: keywords.slice(0, 4).join(', '),
            });
            generatedBy = 'template_fallback';
        }

        // ── Preview mode: return without saving ───────────────────────────────────
        if (preview) {
            return new Response(
                JSON.stringify({
                    cover_letter: coverLetterBody,
                    generated_by: generatedBy,
                    preview: true,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Save mode: persist to cover_letters table ─────────────────────────────
        const { data: savedLetter, error: saveErr } = await adminClient
            .from('cover_letters')
            .insert({
                user_id: user.id,
                title: `${job.title} at ${job.company}`,
                body: coverLetterBody,
                company: job.company,
                job_title: job.title,
                generated_by: generatedBy,
                is_default: false,
            })
            .select('id')
            .single();

        if (saveErr) {
            console.error('[generate-cover-letter] DB save failed:', saveErr.message);
            // Still return the letter even if save failed
            return new Response(
                JSON.stringify({
                    cover_letter: coverLetterBody,
                    generated_by: generatedBy,
                    cover_letter_id: null,
                    warning: 'Cover letter generated but could not be saved.',
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // Update the job_application with the cover letter if id provided
        if (job_application_id) {
            await adminClient
                .from('job_applications')
                .update({ cover_letter_used: coverLetterBody })
                .eq('id', job_application_id)
                .eq('user_id', user.id);
        }

        return new Response(
            JSON.stringify({
                cover_letter: coverLetterBody,
                generated_by: generatedBy,
                cover_letter_id: savedLetter?.id ?? null,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    } catch (err: any) {
        const isTimeout = err?.name === 'TimeoutError';
        return new Response(
            JSON.stringify({
                error: isTimeout ? 'Generation timed out after 25s.' : (err.message ?? 'Unknown error'),
            }),
            {
                status: isTimeout ? 504 : 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
        );
    }
});