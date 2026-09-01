/**
 * supabase/functions/score-cover-letter/index.ts
 * OpusHunter — ATS Intelligence Scorer.
 * Deterministic scoring (faster + cheaper than AI).
 * Updates ats_score, specificity_score, and filler_phrase_count in the cover_letters table.
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

// Dictionary of generic filler phrases to penalize
const FILLER_PHRASES = [
  "I am writing to express my interest",
  "I believe I would be a great fit",
  "I am passionate about",
  "hard worker",
  "team player",
  "go-getter",
  "think outside the box",
  "I look forward to hearing from you",
  "I am excited to apply",
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const coverLetterId = body.coverLetterId || body.cover_letter_id || body.id;
    const jobId = body.jobId || body.job_id;
    const userId = body.userId || body.user_id;

    if (!coverLetterId && !jobId) {
      return Response.json(
        { error: "missing_fields", message: "Missing coverLetterId or jobId" },
        { status: 400, headers: corsHeaders },
      );
    }

    let letter: Record<string, unknown> | null = null;
    let targetJobId = jobId;

    if (coverLetterId) {
      const { data, error: letterError } = await supabase
        .from("cover_letters")
        .select("*")
        .eq("id", coverLetterId)
        .single();

      if (letterError || !data) {
        throw new Error("Cover letter not found");
      }
      letter = data;
      if (!targetJobId && data.job_id) {
        targetJobId = data.job_id;
      }
    }

    // 2. Fetch Job Vault description if job_id is linked
    let jdText = "";
    if (targetJobId) {
      const { data: jobData } = await supabase
        .from("job_vault")
        .select("description, title, company")
        .eq("id", targetJobId)
        .maybeSingle();
      jdText = (jobData?.description || "").toLowerCase();
    }

    // 3. Extract Job Description Keywords
    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "you",
      "are",
      "our",
      "this",
      "that",
      "will",
      "have",
      "from",
      "your",
    ]);
    const jdKeywords = jdText
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word: string) => word.length > 2 && !stopWords.has(word));
    const uniqueKeywords = [...new Set(jdKeywords)];

    // 4. Calculate ATS Score (Keyword Density)
    const letterText = String(
      letter?.body || body.coverLetterText || "",
    ).toLowerCase();
    let matchedKeywords = 0;
    for (const keyword of uniqueKeywords) {
      if (letterText.includes(keyword)) matchedKeywords++;
    }
    const atsScore =
      uniqueKeywords.length > 0
        ? Math.min(
            100,
            Math.round((matchedKeywords / uniqueKeywords.length) * 100),
          )
        : 75;

    // 5. Calculate Specificity Score (Numerical / Quantifiable claims)
    const rawBody = String(letter?.body || body.coverLetterText || "");
    const sentences = rawBody.length > 0 ? rawBody.split(/(?<=[.!?])\s+/) : [];
    let specificSentences = 0;
    for (const sentence of sentences) {
      if (
        /\d/.test(sentence) ||
        /%/.test(sentence) ||
        /kr|€|\$|£/.test(sentence)
      ) {
        specificSentences++;
      }
    }
    const specificityScore =
      sentences.length > 0
        ? Math.round((specificSentences / sentences.length) * 100)
        : 50;

    // 6. Detect Filler Phrases
    let fillerCount = 0;
    for (const phrase of FILLER_PHRASES) {
      if (letterText.includes(phrase.toLowerCase())) fillerCount++;
    }

    // 7. Calculate overall interview probability chance based on ATS + context
    const interviewProbability = Math.min(
      98,
      Math.max(
        25,
        Math.round(atsScore * 0.6 + specificityScore * 0.4 - fillerCount * 4),
      ),
    );

    // 8. Update cover_letters table if coverLetterId was provided
    if (coverLetterId) {
      await supabase
        .from("cover_letters")
        .update({
          ats_score: atsScore,
          specificity_score: specificityScore,
          filler_phrase_count: fillerCount,
        })
        .eq("id", coverLetterId);
    }

    return Response.json(
      {
        success: true,
        atsScore,
        specificityScore,
        fillerCount,
        interviewProbability,
        matchedKeywordsCount: matchedKeywords,
        totalKeywords: uniqueKeywords.length,
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Score cover letter error:", error);
    return Response.json(
      {
        error: "scoring_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
