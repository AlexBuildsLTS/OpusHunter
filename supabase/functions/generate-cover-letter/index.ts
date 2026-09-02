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

export const GEMINI_MODEL_CASCADE = [
  "gemini-3.7-flash", // Stable - August 2026 release (Deep reasoning & 64k output)
  "gemini-3.6-flash", // Stable - High throughput
  "gemini-3.5-flash", // Stable - Direct Pro-tier intelligence replacement
  "gemini-3.5-flash-lite", // Stable - Highly economic Free Tier endpoint
] as const;

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

    // Determine tone guidelines based on strategy and formality
    const toneChoice = body.formality || strategy || "technical_deep_dive";
    let toneGuidance = "Professional, concise, direct, and outcome-oriented.";
    if (toneChoice === "formal_corporate" || toneChoice === "formal") {
      toneGuidance =
        "Highly formal, polished corporate language, traditional executive courtesy, precise and structured.";
    } else if (
      toneChoice === "technical_deep_dive" ||
      toneChoice === "technical"
    ) {
      toneGuidance =
        "Deeply technical, architecture-conscious, systems-minded, focusing on exact implementation mechanics, resilience, and engineering rigor.";
    } else if (toneChoice === "executive_brief" || toneChoice === "executive") {
      toneGuidance =
        "High-level strategic impact, organizational velocity, leadership perspective, and high-ROI outcomes.";
    } else if (toneChoice === "storytelling") {
      toneGuidance =
        "Compelling narrative flow linking past engineering challenges to this company's mission.";
    }

    // Format Candidate Experience & Projects
    const rawExperience = Array.isArray(context.extracted_experience)
      ? context.extracted_experience
      : [];
    const formattedExperience =
      rawExperience.length > 0
        ? rawExperience
            .map(
              (exp: any) =>
                `- ${exp.role || "Role"} at ${exp.company || "Company"} (${exp.duration || ""}): ${Array.isArray(exp.achievements) ? exp.achievements.join("; ") : ""}`,
            )
            .join("\n")
        : "Full-Stack Software Engineer with expertise in Java Spring Boot, React Native, TypeScript, PostgreSQL, and Linux systems.";

    const selectedProjectsPrompt =
      Array.isArray(body.selected_projects) && body.selected_projects.length > 0
        ? `\nPreferred Candidate Projects to Feature: ${body.selected_projects.join(", ")}`
        : "";

    // 3. Construct Strict Prompt with Zero-Hallucination & Concrete Project Selection
    const prompt = `
You are an elite executive career strategist and technical recruiter.
Write a top-tier, highly customized cover letter for:
Company: ${job.company}
Role: "${job.title}" (${job.location || "Remote"})
Job Description:
${job.description || "No description provided."}

CANDIDATE GROUND TRUTH (STRICT SOURCE OF FACT — NEVER FABRICATE OUTSIDE THIS):
Candidate Name: ${profile.first_name || ""} ${profile.last_name || ""}
Professional Title: ${profile.professional_title || "Full-Stack / Systems Engineer"}
Bio: ${profile.bio || "Systems-minded Full-Stack Engineer combining deep Linux administration with robust Java and TypeScript ecosystems."}
Career Summary: ${context.career_summary || "Full-Stack / Systems Engineer"}
Verified Skills: ${context.extracted_skills?.join(", ") || "Java, Spring Boot, React Native, TypeScript, PostgreSQL, Deno, Linux, Supabase, Git, Docker"}
Key Achievements: ${context.key_achievements?.join("; ") || "Architected production-grade microservices and reactive cross-platform applications."}
Experience & Real Projects:
${formattedExperience}${selectedProjectsPrompt}
Certifications: ${context.extracted_certifications?.map((c: { name?: string }) => c.name).join(", ") || "N/A"}

CRITICAL ANTI-HALLUCINATION & APPLICATION INTEGRITY RULES:
1. STRICT FACTUAL ACCURACY (ZERO HALLUCINATION): You must ONLY reference technologies, tools, frameworks, and projects explicitly present in the candidate's verified background above. NEVER invent unverified cloud platforms (e.g. NEVER mention AWS or GCP unless explicitly listed in verified skills), fake employers, or invented metrics.
2. SELECT THE BEST REAL PROJECT EXAMPLE: From the candidate's real experience and projects, identify the single most relevant concrete proof point that matches this job. Cite actual architectural decisions or technical implementations from that project (e.g., Spring Boot microservices, Deno Edge nodes, React Native cross-platform state, PostgreSQL RLS) to prove capability.
3. ATS KEYWORD TARGETING: Carefully analyze the job requirements and mirror the matching technical keywords from the candidate's genuine skill set so ATS automated parsers score this application in the top 1%.
4. BYPASS AI DETECTION / WRITE WITH AUTHENTIC HUMAN INTELLECT:
   - Do NOT use typical AI clichés: "I am writing to express my enthusiasm", "thrilled to apply", "testament to", "delve into", "pivotal role", "beacon of", "in today's fast-paced world", "dynamic landscape".
   - Write with authentic human authority, varying sentence structure and cadence.
   - Root every claim in the candidate's real engineering, architecture, and systems experience.
5. TONE & FORMALITY STRATEGY:
   - Style: ${toneGuidance}
   - Length: 250 - 350 words across 3-4 structured paragraphs.
   - Closing: Direct, confident call to action to discuss architectural alignment and engineering execution.

Return ONLY the raw cover letter text with no conversational intro, markdown wrappers, or commentary.`;

    // 4. Call Gemini with canonical fallback chain
    const isExecutiveTone =
      strategy === "executive_brief" || strategy === "storytelling";
    const modelsToTry = GEMINI_MODEL_CASCADE;

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
                generationConfig: {
                  temperature: isExecutiveTone ? 0.6 : 0.7,
                  maxOutputTokens: 2048,
                },
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
