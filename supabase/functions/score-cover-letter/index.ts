

/**
 * supabase/functions/score-cover-letter/index.ts
 * OpusHunter — ATS Intelligence Scorer.
 * Deterministic scoring (faster + cheaper than AI).
 * Updates ats_score, specificity_score, and filler_phrase_count in the cover_letters table.
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
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
    const { coverLetterId } = await req.json();
    if (!coverLetterId) throw new Error("Missing coverLetterId");

    // 1. Fetch Cover Letter + Job in parallel
    const [letterResult, jobResult] = await Promise.all([
      supabase
        .from("cover_letters")
        .select("*")
        .eq("id", coverLetterId)
        .single(),
      supabase
        .from("job_vault")
        .select("description")
        .eq("id", coverLetterId)
        .maybeSingle(),
    ]);

    if (letterResult.error || !letterResult.data)
      throw new Error("Cover letter not found");
    const letter = letterResult.data;

    // 2. Extract Job Description Keywords
    const jdText = (jobResult.data?.description || "").toLowerCase();
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
    ]);
    const jdKeywords = jdText
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word: string) => word.length > 2 && !stopWords.has(word));
    const uniqueKeywords = [...new Set(jdKeywords)];

    // 3. Calculate ATS Score (Keyword Density)
    const letterText = (letter.body || "").toLowerCase();
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
        : 50;

    // 4. Calculate Specificity Score (Numerical / Quantifiable claims)
    const sentences = letter.body.split(/(?<=[.!?])\s+/);
    let specificSentences = 0;
    for (const sentence of sentences) {
      // Checks for numbers, percentages, or currencies
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
        : 0;

    // 5. Detect Filler Phrases
    let fillerCount = 0;
    for (const phrase of FILLER_PHRASES) {
      if (letterText.includes(phrase.toLowerCase())) fillerCount++;
    }

    // 6. Update cover_letters table
    const { error: updateError } = await supabase
      .from("cover_letters")
      .update({
        ats_score: atsScore,
        specificity_score: specificityScore,
        filler_phrase_count: fillerCount,
      })
      .eq("id", coverLetterId);

    if (updateError) throw updateError;

    return Response.json(
      { atsScore, specificityScore, fillerCount },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Score cover letter error:", error);
    return Response.json(
      { error: "scoring_failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
