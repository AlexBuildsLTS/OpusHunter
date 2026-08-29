/**
 * supabase/functions/generate-cover-letter/index.ts
 * OpusHunter — AI Cover Letter Generation (Gemini 2.5 Flash Lite).
 * Refined: Matches cover_letters table exactly, measures generation time, robust prompts.
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { resolveKey } from "../_shared/keyResolver.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, jobListingId, strategy } = await req.json();
    if (!userId || !jobListingId) throw new Error("Missing required fields");

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

    // 2. Resolve Gemini API key
    const geminiKey = (await resolveKey(supabase, userId, "gemini")).key;

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

    // 4. Call Gemini 3.1 Flash
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      },
    );

    if (!geminiResponse.ok)
      throw new Error(`Gemini error: ${geminiResponse.status}`);
    const geminiData = await geminiResponse.json();
    const content =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!content) throw new Error("Gemini returned empty content");

    const durationMs = Math.round(performance.now() - startTime);

    // 5. Save to cover_letters table
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
        generated_by: "gemini-2.5-flash-lite",
        tokens_used: geminiData.usageMetadata?.totalTokenCount || 0,
        generation_duration_ms: durationMs,
        title: `${job.title} — ${job.company}`,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // 6. Log usage
    await supabase.from("api_key_usage_logs").insert({
      user_id: userId,
      provider: "gemini",
      key_source: "system",
      tokens_used: geminiData.usageMetadata?.totalTokenCount || 0,
      function_name: "generate-cover-letter",
      strategy_used: strategy || "mirror_matching",
      success: true,
    });

    return Response.json(
      { cover_letter_id: coverLetter.id, body: coverLetter.body },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Generate cover letter error:", error);
    return Response.json(
      { error: "generation_failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
