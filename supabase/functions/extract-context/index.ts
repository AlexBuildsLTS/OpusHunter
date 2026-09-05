/**
 * supabase/functions/extract-context/index.ts
 * OpusHunter — AI Career Context Extraction.
 * Robust multimodal PDF/DOCX/TXT extraction with automatic Gemini model & key rotation.
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const jwtUser = await verifyJwt(req);
    const body = await req.json().catch(() => ({}));
    const userId = jwtUser?.userId;

    if (!userId) {
      return Response.json(
        {
          error: "unauthorized",
          message: "A valid authenticated session is required.",
        },
        { status: 401, headers: corsHeaders },
      );
    }

    // =========================================================================
    // ACTION: REAL AI PROFESSIONAL BIO SYNTHESIS
    // =========================================================================
    if (body.action === "generate_bio") {
      const tone = body.tone || "formal";
      const candidateKeys = await getCandidateKeys(supabase, userId, "gemini");
      if (candidateKeys.length === 0) {
        throw new Error("quota_exhausted: No Gemini API keys found");
      }

      // Fetch verified candidate context & profile from database
      const [profileRes, contextRes, certificationsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase
          .from("user_context")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("certifications")
          .select("cert_name,cert_issuer,file_name")
          .eq("user_id", userId),
      ]);

      const profile = profileRes.data || {};
      const context = contextRes.data || {};
      if (profileRes.error) throw profileRes.error;
      if (contextRes.error) throw contextRes.error;
      if (certificationsRes.error) throw certificationsRes.error;

      const fullName =
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        "Candidate";
      const title = profile.professional_title || "Not provided";
      const years = profile.years_experience || "Not provided";
      const skills = context.extracted_skills || [];
      const roles = profile.target_roles || [];
      const education = Array.isArray(context.extracted_education)
        ? context.extracted_education
            .map((item: { institution?: string; degree?: string }) =>
              [item.degree, item.institution].filter(Boolean).join(" — "),
            )
            .filter(Boolean)
            .join("; ")
        : "";
      const careerSummary = context.career_summary || "";
      const skillClusters =
        context.skill_clusters &&
        typeof context.skill_clusters === "object" &&
        !Array.isArray(context.skill_clusters)
          ? context.skill_clusters
          : {};
      const certifications = [
        ...(Array.isArray(context.extracted_certifications)
          ? context.extracted_certifications.map(
              (item: { name?: string; issuer?: string }) =>
                [item.name, item.issuer].filter(Boolean).join(" — "),
            )
          : []),
        ...(certificationsRes.data || []).map((item) =>
          [item.cert_name, item.cert_issuer, item.file_name]
            .filter(Boolean)
            .join(" — "),
        ),
      ].filter(Boolean);

      const externalEvidence = await Promise.all(
        [skillClusters.github_url, skillClusters.portfolio_url]
          .filter((value): value is string => typeof value === "string" && value.startsWith("http"))
          .map(async (url) => {
            try {
              const response = await fetch(url, {
                headers: { "User-Agent": "OpusHunter-Career-Context/1.0" },
              });
              if (!response.ok) return "";
              const html = await response.text();
              return `Source: ${url}\n${html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi, " ").replace(/\s+/g, " ").slice(0, 6000)}`;
            } catch {
              return "";
            }
          }),
      );

      if (
        skills.length === 0 &&
        roles.length === 0 &&
        !careerSummary &&
        !profile.bio
      ) {
        throw new Error(
          "incomplete_context: Upload and extract a CV before generating a professional bio.",
        );
      }

      let toneInstruction = "";
      switch (tone) {
        case "executive":
          toneInstruction =
            "Executive & Strategic: Focus on leadership, business transformation, measurable ROI, architectural governance, and delivering end-to-end strategic impact.";
          break;
        case "technical":
          toneInstruction =
            "Technical Deep-Dive: Emphasize backend architectures, distributed pipelines, low latency, system reliability, hands-on engineering craftsmanship, and specific technology paradigms.";
          break;
        case "modern":
          toneInstruction =
            "Modern & Agile: Vibrant, user-first, modern engineering velocity, continuous delivery, rapid execution, product focus, and cross-functional team agility.";
          break;
        case "formal":
        default:
          toneInstruction =
            "Formal Corporate: Prestigious, authoritative, standard enterprise governance, rock-solid engineering compliance, structured execution, and industry excellence.";
          break;
      }

      const bioPrompt = `You are an expert executive resume writer and career positioning strategist.
Generate a high-impact, truthful professional summary / biography for ${fullName}.

CANDIDATE PROFILE:
- Current / Target Title: ${title}
- Years of Experience: ${years}
- Core Verified Skills: ${Array.isArray(skills) ? skills.join(", ") : skills}
- Target Roles: ${Array.isArray(roles) ? roles.join(", ") : roles}
${education ? `- Education: ${education}` : ""}
${careerSummary ? `- Career Summary Context: ${careerSummary}` : ""}
- Verified Certifications: ${certifications.join(", ") || "None recorded"}
- GitHub / Portfolio evidence:
${externalEvidence.filter(Boolean).join("\n\n") || "Use only the verified CV context above."}

TONE DIRECTIVE:
${toneInstruction}

STRICT CONSTRAINTS:
1. Ground strictly in the candidate's real skills and experience. Do NOT invent unrelated technologies, fake degrees, or false metrics.
2. Length: Exactly 3 concise, powerful sentences.
3. Return ONLY the raw biography text. No preamble, no quotes, no markdown formatting, no explanations.
4. Never return the instructions, labels, or a description of the requested format.`;

      let generatedBio = "";
      let successfulModel = "";

      bioKeyLoop: for (const keyObj of candidateKeys) {
        for (const model of GEMINI_MODEL_CASCADE) {
          try {
            console.log(
              `[generate_bio] Attempting model ${model} with key source: ${keyObj.source}`,
            );
            const geminiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyObj.key}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: bioPrompt }] }],
                  generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 512,
                  },
                }),
              },
            );

            if (geminiResponse.status === 429) {
              console.warn(
                `[generate_bio] 429 Rate limited on ${model}, rotating key`,
              );
              await handle429(supabase, keyObj.keyId);
              continue bioKeyLoop;
            }

            if (geminiResponse.status === 404) continue;

            if (!geminiResponse.ok) {
              const errText = await geminiResponse.text().catch(() => "");
              console.warn(
                `[generate_bio] Error with ${model} (${geminiResponse.status}): ${errText.slice(0, 200)}`,
              );
              continue;
            }

            const geminiData = await geminiResponse.json();
            const textResult =
              geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResult) {
              const candidateBio = textResult
                .trim()
                .replace(/^["']|["']$/g, "")
                .replace(/^```(?:text|markdown)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();
              const sentenceCount = candidateBio
                .split(/(?<=[.!?])\s+/)
                .filter((sentence: string) => sentence.trim().length > 20)
                .length;
              const containsInstructionLeak =
                /\b(exactly\s+\d+\s+sentences?|tone\s*:|tone directive|return only|candidate profile)\b/i.test(
                  candidateBio,
                );
              if (
                sentenceCount < 2 ||
                sentenceCount > 4 ||
                containsInstructionLeak
              ) {
                console.warn(
                  `[generate_bio] Rejected invalid model output (${sentenceCount} sentences)`,
                );
                continue;
              }
              generatedBio = candidateBio;
              successfulModel = model;
              await markKeyUsed(supabase, keyObj);
              await logUsage(
                supabase,
                userId,
                "gemini",
                keyObj.source,
                true,
                0,
                "generate-bio",
              );
              break bioKeyLoop;
            }
          } catch (e) {
            console.warn(`[generate_bio] Exception with model ${model}:`, e);
          }
        }
      }

      if (!generatedBio) {
        throw new Error(
          "Failed to generate professional bio across all candidate Gemini models & keys",
        );
      }

      return Response.json(
        {
          success: true,
          modelUsed: successfulModel,
          bio: generatedBio,
        },
        { headers: corsHeaders },
      );
    }

    // =========================================================================
    // ACTION: RESUME / CERT CONTEXT EXTRACTION
    // =========================================================================
    const documentPath = body.documentPath || body.storagePath || body.path;
    const bucket = body.bucket || "resumes";

    if (!documentPath) {
      return Response.json(
        {
          error: "missing_fields",
          message: "Missing required field: documentPath",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const documentTable =
      bucket === "resumes" ? "resume_documents" : "certifications";
    const { data: ownedDocument, error: ownershipError } = await supabase
      .from(documentTable)
      .select("id")
      .eq("user_id", userId)
      .eq("storage_path", documentPath)
      .maybeSingle();

    if (ownershipError) throw ownershipError;
    if (!ownedDocument) {
      return Response.json(
        {
          error: "forbidden",
          message: "The requested document does not belong to this account.",
        },
        { status: 403, headers: corsHeaders },
      );
    }

    // 1. Download file binary from Supabase Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(documentPath);

    if (downloadError || !fileBlob) {
      throw new Error(
        `Failed to download file: ${downloadError?.message || "File not found"}`,
      );
    }

    // 2. Prepare payload for Gemini (supports multimodal inline PDF, images, or raw text)
    const arrayBuffer = await fileBlob.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    // Resolve Gemini candidate keys
    const candidateKeys = await getCandidateKeys(supabase, userId, "gemini");
    if (candidateKeys.length === 0) {
      throw new Error("quota_exhausted: No Gemini API keys found");
    }

    const extractionInstruction = `
You are an expert career profiler and resume parser.
Analyze this resume / CV carefully and extract complete and accurate career information.
Return ONLY a valid JSON object matching this exact structure (do not include markdown wrappers, backticks, or other text):
{
  "extracted_skills": ["string"],
  "extracted_experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "achievements": ["string"]
    }
  ],
  "extracted_education": [
    {
      "institution": "string",
      "degree": "string",
      "year": 2024
    }
  ],
  "extracted_certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "career_summary": "Comprehensive 3-4 sentence career summary highlighting key domains, seniority, and technical strengths.",
  "key_achievements": ["Quantifiable accomplishment 1", "Quantifiable accomplishment 2"]
}`;

    let contentsParts: Array<Record<string, unknown>> = [];
    const lowerDoc = documentPath.toLowerCase();

    if (lowerDoc.endsWith(".pdf") || bucket === "resumes") {
      // Base64 encode for Gemini multimodal PDF support
      let binary = "";
      const len = byteArray.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(byteArray[i]);
      }
      const base64Data = btoa(binary);

      contentsParts = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data,
          },
        },
        {
          text: extractionInstruction,
        },
      ];
    } else {
      // Plain text or utf-8 fallback
      const text = new TextDecoder().decode(byteArray);
      contentsParts = [
        {
          text: `${extractionInstruction}\n\nResume Content:\n${text.slice(0, 16000)}`,
        },
      ];
    }

    let parsed: any = null;
    let successfulModel = "";

    // Iterate over candidate keys and supported models
    keyLoop: for (const keyObj of candidateKeys) {
      for (const model of GEMINI_MODEL_CASCADE) {
        try {
          console.log(
            `[extract-context] Attempting model ${model} with key source: ${keyObj.source}`,
          );
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyObj.key}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: contentsParts }],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 4096,
                  responseMimeType: "application/json",
                },
              }),
            },
          );

          if (geminiResponse.status === 429) {
            console.warn(
              `[extract-context] 429 Rate limited on ${model}, rotating key`,
            );
            await handle429(supabase, keyObj.keyId);
            continue keyLoop;
          }

          if (geminiResponse.status === 404) {
            console.warn(
              `[extract-context] Model ${model} returned 404, trying next model`,
            );
            continue;
          }

          if (!geminiResponse.ok) {
            const errText = await geminiResponse.text().catch(() => "");
            console.warn(
              `[extract-context] Error with ${model} (${geminiResponse.status}): ${errText.slice(0, 200)}`,
            );
            continue;
          }

          const geminiData = await geminiResponse.json();
          const jsonString =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonString) {
            // Clean any potential markdown wrapping
            const cleanJson = jsonString
              .replace(/^```json\s*/i, "")
              .replace(/\s*```$/i, "")
              .trim();
            parsed = JSON.parse(cleanJson);
            successfulModel = model;
            await markKeyUsed(supabase, keyObj);
            await logUsage(
              supabase,
              userId,
              "gemini",
              keyObj.source,
              true,
              0,
              "extract-context",
            );
            break keyLoop;
          }
        } catch (e) {
          console.warn(`[extract-context] Exception with model ${model}:`, e);
        }
      }
    }

    if (!parsed) {
      throw new Error(
        "Failed to extract career context across all candidate Gemini models & keys",
      );
    }

    // 3. Upsert into user_context (merge existing data)
    const { data: existingContext } = await supabase
      .from("user_context")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const mergedSkills = Array.from(
      new Set([
        ...(existingContext?.extracted_skills || []),
        ...(parsed.extracted_skills || []),
      ]),
    );

    const mergedPayload = {
      user_id: userId,
      extracted_skills: mergedSkills,
      extracted_experience:
        parsed.extracted_experience ||
        existingContext?.extracted_experience ||
        [],
      extracted_education:
        parsed.extracted_education ||
        existingContext?.extracted_education ||
        [],
      extracted_certifications:
        parsed.extracted_certifications ||
        existingContext?.extracted_certifications ||
        [],
      career_summary:
        parsed.career_summary || existingContext?.career_summary || "",
      key_achievements:
        parsed.key_achievements || existingContext?.key_achievements || [],
      last_extracted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("user_context")
      .upsert(mergedPayload, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Failed to update user_context:", upsertError);
      throw upsertError;
    }

    // 4. Update document status
    await supabase
      .from(documentTable)
      .update({ extraction_status: "complete" })
      .eq("storage_path", documentPath);

    return Response.json(
      {
        success: true,
        modelUsed: successfulModel,
        data: mergedPayload,
      },
      { headers: corsHeaders },
    );
  } catch (error: any) {
    console.error("Context extraction failed:", error);
    return Response.json(
      {
        error: "extraction_failed",
        message: error?.message || "Failed to extract context from document",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
