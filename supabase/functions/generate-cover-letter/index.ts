/**
 * supabase/functions/generate-cover-letter/index.ts
 * OpusHunter — AI Cover Letter Generation with Multi-Model & Key Fallback.
 * Refined: Matches cover_letters table exactly, measures generation time, robust prompts.
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import {
  getCandidateKeys,
  handle429,
  markKeyUsed,
  logUsage,
} from "../_shared/keyResolver.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

const STANDARD_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
];

const EXECUTIVE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.6-flash",
];

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const jwtUser = await verifyJwt(req);
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || body.user_id || jwtUser?.userId;
    const jobListingId = body.jobListingId || body.job_id || body.jobId;
    const strategy = body.strategy;

    if (!userId || !jobListingId) {
      return Response.json(
        {
          error: "missing_fields",
          message: "Missing required fields: userId and jobListingId",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const startTime = performance.now();

    // 1. Fetch Job + User Context + Profile in parallel
    const [jobResult, contextResult, profileResult] = await Promise.all([
      supabase.from("job_vault").select("*").eq("id", jobListingId).single(),
      supabase
        .from("user_context")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).single(),
    ]);

    if (jobResult.error || !jobResult.data) throw new Error("Job not found");
    if (contextResult.error || !contextResult.data)
      throw new Error("User context not found. Upload a CV first.");
    if (profileResult.error || !profileResult.data)
      throw new Error("Profile not found");

    const job = jobResult.data;
    const context = contextResult.data;
    const profile = profileResult.data;

    // 2. Resolve Gemini Candidate Keys
    const candidateKeys = await getCandidateKeys(supabase, userId, "gemini");
    if (candidateKeys.length === 0) {
      throw new Error("quota_exhausted: No Gemini API keys found");
    }

    // 3. Construct Strict Prompt
    const prompt = `
You are an expert career coach writing a cover letter for ${job.company}.
The role is "${job.title}" located in ${job.location || "Remote"}.
Job description:
${job.description || "No description provided."}

Candidate's full name: ${profile.first_name} ${profile.last_name}
Career summary: ${context.career_summary || "N/A"}
Key skills: ${context.extracted_skills?.join(", ") || "N/A"}
Key achievements: ${context.key_achievements?.join("; ") || "N/A"}
Certifications: ${context.extracted_certifications?.map((c: { name?: string }) => c.name).join(", ") || "N/A"}

Write a professional, concise 4-5 paragraph cover letter with these exact rules:
- Opening: Hook referencing the specific role and company.
- Paragraph 2: Match the candidate's top 3 skills/achievements to the job requirements, with quantified impact.
- Paragraph 3: Demonstrate genuine knowledge of the company and why this specific role.
- Paragraph 4: Mention certifications or technical depth relevant to this role.
- Closing: Confident call to action, not generic "I look forward to hearing from you."
- No filler phrases like "I am writing to express my interest", "I believe I would be a great fit", or "passionate about".
- Total length: 280-380 words.
- Tone: professional, direct, confident.

Return ONLY the cover letter text, no explanations.`;

    // 4. Call Gemini with fallback chain based on strategy tone
    const isExecutiveTone =
      strategy === "executive_brief" || strategy === "storytelling";
    const modelsToTry = isExecutiveTone ? EXECUTIVE_MODELS : STANDARD_MODELS;

    let content = "";
    let successfulModel = "";
    let totalTokensUsed = 0;

    keyLoop: for (const keyObj of candidateKeys) {
      for (const model of modelsToTry) {
        try {
          console.log(
            `[generate-cover-letter] Attempting ${model} with key: ${keyObj.source}`,
          );
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyObj.key}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
              }),
            },
          );

          if (geminiResponse.status === 429) {
            console.warn(
              `[generate-cover-letter] 429 on ${model}, rotating key`,
            );
            await handle429(supabase, keyObj.keyId);
            continue keyLoop;
          }

          if (geminiResponse.status === 404) {
            console.warn(
              `[generate-cover-letter] Model ${model} 404, trying fallback`,
            );
            continue;
          }

          if (!geminiResponse.ok) {
            const errText = await geminiResponse.text().catch(() => "");
            console.warn(
              `[generate-cover-letter] Error ${geminiResponse.status} with ${model}: ${errText.slice(0, 200)}`,
            );
            continue;
          }

          const geminiData = await geminiResponse.json();
          const generatedText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText) {
            content = generatedText;
            successfulModel = model;
            totalTokensUsed = geminiData.usageMetadata?.totalTokenCount || 0;
            await markKeyUsed(supabase, keyObj);
            await logUsage(
              supabase,
              userId,
              "gemini",
              keyObj.source,
              true,
              totalTokensUsed,
              "generate-cover-letter",
            );
            break keyLoop;
          }
        } catch (err) {
          console.warn(`[generate-cover-letter] Exception with ${model}:`, err);
        }
      }
    }

    if (!content) {
      throw new Error(
        "Gemini generation failed across all available keys and models",
      );
    }

    const durationMs = Math.round(performance.now() - startTime);

    // 5. Calculate ATS and Specificity metrics
    const FILLER_PHRASES = [
      "i am writing to express my interest",
      "i believe i would be a great fit",
      "i am passionate about",
      "hard worker",
      "team player",
      "go-getter",
      "think outside the box",
      "i look forward to hearing from you",
      "i am excited to apply",
    ];

    const jdText = (job.description || "").toLowerCase();
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
    const jdKeywords: string[] = jdText
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word: string) => word.length > 2 && !stopWords.has(word));
    const uniqueKeywords: string[] = Array.from(new Set(jdKeywords));

    const letterLower = content.toLowerCase();
    let matchedKeywords = 0;
    for (const keyword of uniqueKeywords) {
      if (letterLower.includes(keyword)) matchedKeywords++;
    }
    const atsScore =
      uniqueKeywords.length > 0
        ? Math.min(
            100,
            Math.round((matchedKeywords / uniqueKeywords.length) * 100),
          )
        : 75;

    const sentences = content.length > 0 ? content.split(/(?<=[.!?])\s+/) : [];
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

    let fillerCount = 0;
    for (const phrase of FILLER_PHRASES) {
      if (letterLower.includes(phrase)) fillerCount++;
    }

    // 6. Save to cover_letters table with complete intelligence metrics
    const { data: coverLetter, error: saveError } = await supabase
      .from("cover_letters")
      .insert({
        user_id: userId,
        job_id: jobListingId,
        company: job.company,
        job_title: job.title,
        body: content,
        tone: "professional",
        strategy_used: strategy || "mirror_matching",
        generated_by: successfulModel || "gemini-3.7-flash",
        tokens_used: totalTokensUsed,
        generation_duration_ms: durationMs,
        title: `${job.title} — ${job.company}`,
        ats_score: atsScore,
        specificity_score: specificityScore,
        filler_phrase_count: fillerCount,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // 7. Log usage
    await supabase.from("api_key_usage_logs").insert({
      user_id: userId,
      provider: "gemini",
      key_source: "system",
      tokens_used: totalTokensUsed,
      function_name: "generate-cover-letter",
      strategy_used: strategy || "mirror_matching",
      success: true,
    });

    return Response.json(
      {
        cover_letter_id: coverLetter.id,
        body: coverLetter.body,
        ats_score: atsScore,
        specificity_score: specificityScore,
        filler_phrase_count: fillerCount,
        duration_ms: durationMs,
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Generate cover letter error:", error);
    return Response.json(
      {
        error: "generation_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
