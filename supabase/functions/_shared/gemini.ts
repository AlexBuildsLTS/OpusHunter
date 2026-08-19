/**
 * supabase/functions/_shared/gemini.ts
 * OpusHunter — Shared Gemini Cover-Letter Generation
 *
 * WHY THIS EXISTS:
 *   `generate-cover-letter/index.ts` and `auto-apply/index.ts` each had
 *   their own near-identical implementation of "build a prompt, call
 *   Gemini, fall back to a template on failure." The two prompts had
 *   drifted apart (different word limits, different safety settings,
 *   different fallback template text) with no way to know which one was
 *   "correct" — they both were, independently, which is the actual
 *   problem. This is the one implementation both functions now call.
 *
 *   Extracted from `generate-cover-letter/index.ts`'s version, which was
 *   the more complete of the two (CV-excerpt inclusion, safety settings,
 *   strict word-count/format rules, template-var substitution) — nothing
 *   here is new behavior, this is a straight extraction.
 *
 * Model: gemini-3.1-flash-lite — verified current & GA as of 2026-07-01.
 * If you're bumping this, confirm the new model ID is real and GA before
 * committing it — a stale/wrong model string has shipped from this exact
 * codebase before (see auto-apply/index.ts's history).
 */

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = 22000;

export interface CoverLetterParams {
  jobTitle: string;
  company: string;
  jobDescription: string;
  cvText: string;
  baseCoverLetter: string;
  candidateName: string;
  keywords: string[];
}

export const DEFAULT_COVER_LETTER_TEMPLATE = `Dear Hiring Team at [COMPANY],

I am writing to express my strong interest in the [ROLE] position. With my background in [SKILLS], I am confident I would make a meaningful contribution to your team.

I am particularly excited about this opportunity at [COMPANY] and believe my experience aligns well with what you are looking for.

I would welcome the chance to discuss how I can contribute to your success.

Best regards,
[NAME]`;

/** Fills `[COMPANY]` / `[ROLE]` / `[NAME]` / `[SKILLS]` placeholders in a
 *  template string. Used both as the ultimate no-key fallback and as the
 *  recovery path if a live Gemini call throws. */
export function applyCoverLetterTemplate(
  tpl: string,
  v: { company?: string; role?: string; name?: string; skills?: string },
): string {
  return tpl
    .replace(/\[COMPANY\]/gi, v.company ?? "the company")
    .replace(/\[ROLE\]/gi, v.role ?? "this position")
    .replace(/\[NAME\]/gi, v.name ?? "Hiring Team")
    .replace(/\[SKILLS\]/gi, v.skills ?? "my relevant skills");
}

function buildCoverLetterPrompt(p: CoverLetterParams): string {
  return `You are an expert career coach writing a compelling, concise cover letter.

CANDIDATE:
- Name: ${p.candidateName}
- Key skills: ${p.keywords.slice(0, 8).join(", ")}
- CV excerpt: ${p.cvText.substring(0, 600) || "(no CV on file — write generically but confidently)"}

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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.72,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 650,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.substring(0, 300)}`);
  }
  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty content.");
  return text.trim();
}

export interface GenerateResult {
  coverLetter: string;
  /** `'gemini:byok' | 'gemini:pool' | 'gemini:env' | 'template' | 'template_fallback'` */
  generatedBy: string;
}

/**
 * Generates a cover letter. If `geminiKey` is null (no BYOK/pool/env key
 * resolved), returns the template immediately — no network call. If a key
 * is present but the Gemini call throws (timeout, 4xx/5xx, empty content),
 * falls back to the template rather than surfacing an error to the caller
 * — a generic-but-present cover letter beats a failed application flow.
 */
export async function generateCoverLetter(
  params: CoverLetterParams,
  geminiKey: string | null,
): Promise<GenerateResult> {
  const templateResult = applyCoverLetterTemplate(params.baseCoverLetter, {
    company: params.company,
    role: params.jobTitle,
    name: params.candidateName,
    skills: params.keywords.slice(0, 3).join(", "),
  });

  if (!geminiKey) {
    return { coverLetter: templateResult, generatedBy: "template" };
  }

  try {
    const coverLetter = await callGemini(
      buildCoverLetterPrompt(params),
      geminiKey,
    );
    return { coverLetter, generatedBy: "gemini" }; // caller appends `:${source}`
  } catch (e: unknown) {
    console.warn(
      "[_shared/gemini] Gemini call failed, falling back to template:",
      e instanceof Error ? e.message : String(e),
    );
    return { coverLetter: templateResult, generatedBy: "template_fallback" };
  }
}
