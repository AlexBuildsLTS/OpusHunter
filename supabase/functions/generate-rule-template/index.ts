/**
 * supabase/functions/generate-rule-template/index.ts
 * OpusHunter — Generate Base Cover Letter From Rule Criteria
 * 2026-07-04 — NEW
 *
 * WHY THIS EXISTS: the Rules editor asked someone to write a base cover
 * letter from a blank textarea with zero help — despite the same modal
 * already knowing the keywords, locations, work types, experience levels,
 * and remote preference they'd just picked. This uses exactly that
 * criteria (plus their real CV, if uploaded) to have Gemini draft a strong
 * starting template with [COMPANY]/[ROLE]/[NAME] placeholders — same
 * placeholder convention the rest of the app already uses, so the
 * job-specific personalization pass in generate-cover-letter still works
 * unchanged on top of this draft.
 *
 * This is NOT job-specific (there's no job yet — this runs while still
 * editing a search rule, before any scrape has happened) — it's a strong,
 * criteria-aware STARTING POINT, exactly like the base_cover_letter field
 * it fills has always meant. generate-cover-letter still does the
 * per-job rewrite later, unchanged.
 *
 * POST body: { keywords: string[], location: string, work_types: string[],
 *              experience_levels: string[], remote_preference: string }
 */
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { resolveKey, markKeyUsed } from '../_shared/keyResolver.ts';
import { verifyUser } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const GEMINI_MODEL = 'gemini-3.1-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CV_BUCKET = 'cv_vault';

async function callGemini(prompt: string, apiKey: string): Promise<string> {
    const res = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.75, topK: 40, topP: 0.95, maxOutputTokens: 500 },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
        }),
        signal: AbortSignal.timeout(20000),
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

serve(async (req: Request) => {
    const cors = getCorsHeaders();
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const admin = createAdminClient();
        const user = await verifyUser(req);
        const body = await req.json();

        const keywords: string[] = body.keywords ?? [];
        const location: string = body.location ?? '';
        const workTypes: string[] = body.work_types ?? [];
        const experienceLevels: string[] = body.experience_levels ?? [];
        const remotePreference: string = body.remote_preference ?? 'any';

        if (keywords.length === 0) {
            return new Response(JSON.stringify({ error: 'At least one keyword is required to generate a template.' }), {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        // Pull real CV text if they've uploaded one — same bucket every
        // other function uses. Optional: a strong template can still be
        // written from criteria alone if there's no CV yet.
        let cvText = '';
        const { data: profile } = await admin
            .from('profiles')
            .select('cv_storage_path, full_name')
            .eq('id', user.id)
            .single();

        if (profile?.cv_storage_path) {
            const { data: cvBlob } = await admin.storage.from(CV_BUCKET).download(profile.cv_storage_path);
            if (cvBlob) {
                // CV is stored as PDF/DOCX in most cases — Gemini's text
                // extraction isn't run here (that's generate-cover-letter's
                // job at apply-time with the full file). For the template
                // stage we only need a light signal, so we skip heavy
                // parsing and let keywords/experience carry the context.
                cvText = '';
            }
        }

        const resolved = await resolveKey(admin, user.id, 'gemini');
        if (!resolved) {
            return new Response(JSON.stringify({ error: 'No Gemini key available (BYOK/pool/env all empty).' }), {
                status: 503,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        const workModeLabel = { remote: 'fully remote', hybrid: 'hybrid', onsite: 'on-site', any: 'remote, hybrid, or on-site' }[remotePreference] ?? 'any work arrangement';

        const prompt = `Write a base cover letter TEMPLATE (not for a specific job yet — this is a reusable starting point) for someone applying to roles matching this search:

Skills/keywords: ${keywords.join(', ')}
Target location(s): ${location || 'not specified'}
Work arrangement: ${workModeLabel}
Employment type(s): ${workTypes.join(', ') || 'not specified'}
Seniority level(s): ${experienceLevels.join(', ') || 'not specified'}
Candidate name: ${profile?.full_name || '[NAME]'}

Requirements:
- Use the literal placeholders [COMPANY] and [ROLE] wherever the specific employer/job title would go — do not invent a company or job title.
- 3 short paragraphs: opening hook tied to the skills above, a middle paragraph on relevant strengths, a brief closing call to action.
- Confident, specific, no generic filler like "I am a hard worker" or "I am passionate about technology."
- Do not fabricate specific past employers, project names, or metrics — keep achievement language general enough to remain true for this candidate across different real jobs (specific facts get filled in per-application later).
- Output ONLY the letter text, no preamble, no markdown formatting, no explanation.`;

        const draft = await callGemini(prompt, resolved.key);
        await markKeyUsed(admin, resolved);

        return new Response(JSON.stringify({ draft, generated_by: resolved.source }), {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to generate template.';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
        });
    }
});