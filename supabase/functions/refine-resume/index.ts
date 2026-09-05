/**
 * OpusHunter — Evidence-grounded resume refinement.
 *
 * Creates a separate reviewable resume artifact. The uploaded source document
 * is never overwritten and the generated artifact is never made primary
 * automatically.
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import {
  getCandidateKeys,
  handle429,
  logUsage,
  markKeyUsed,
} from "../_shared/keyResolver.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();
const MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"];

function jsonError(message: string, status: number) {
  return Response.json(
    { error: status === 401 ? "unauthorized" : "refinement_failed", message },
    { status, headers: corsHeaders },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwtUser = await verifyJwt(req);
    if (!jwtUser) return jsonError("A valid authenticated session is required.", 401);

    const body = await req.json().catch(() => ({}));
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    if (!documentId) return jsonError("Missing required field: documentId", 400);

    const { data: sourceDoc, error: sourceError } = await supabase
      .from("resume_documents")
      .select("*")
      .eq("id", documentId)
      .eq("user_id", jwtUser.userId)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!sourceDoc) return jsonError("Resume not found for this account.", 404);

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(sourceDoc.storage_path);
    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message || "Resume file could not be read.");
    }

    const [profileRes, contextRes, certificationsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name,last_name,professional_title,bio,target_roles")
        .eq("id", jwtUser.userId)
        .maybeSingle(),
      supabase
        .from("user_context")
        .select(
          "extracted_skills,extracted_experience,extracted_education,extracted_certifications,career_summary,key_achievements",
        )
        .eq("user_id", jwtUser.userId)
        .maybeSingle(),
      supabase
        .from("certifications")
        .select("cert_name,cert_issuer,file_name")
        .eq("user_id", jwtUser.userId),
    ]);
    if (profileRes.error) throw profileRes.error;
    if (contextRes.error) throw contextRes.error;
    if (certificationsRes.error) throw certificationsRes.error;

    const context = contextRes.data;
    const profile = profileRes.data;
    const uploadedCertifications = certificationsRes.data || [];
    const hasEvidence =
      Boolean(profile?.bio) ||
      Boolean(context?.career_summary) ||
      (context?.extracted_skills?.length ?? 0) > 0 ||
      (context?.extracted_experience?.length ?? 0) > 0;
    if (!hasEvidence) {
      return jsonError(
        "Extract the resume first. Refinement requires verified candidate evidence.",
        422,
      );
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const base64Data = btoa(binary);
    const mimeType = sourceDoc.file_type || "application/pdf";
    const candidateKeys = await getCandidateKeys(supabase, jwtUser.userId, "gemini");
    if (candidateKeys.length === 0) {
      return jsonError("No Gemini key is configured for resume refinement.", 503);
    }

    const evidence = JSON.stringify({
      profile,
      extracted_context: context,
      uploaded_certifications: uploadedCertifications,
    });
    const prompt = `You are a senior resume editor optimizing a real resume for truthful ATS parsing and human review.

Rewrite the supplied resume into a clean, plain-text, ATS-readable resume.

Rules:
- Use only facts present in the supplied resume or VERIFIED CONTEXT.
- Never invent employers, dates, job titles, degrees, certifications, technologies, metrics, responsibilities, or achievements.
- Preserve every material fact unless it is clearly duplicated or malformed.
- Use standard headings: NAME, PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, CERTIFICATIONS.
- Put the most relevant verified skills and experience first, but do not keyword-stuff.
- Use plain text bullets, normal section headings, and no tables, columns, icons, graphics, text boxes, or decorative symbols.
- If a fact is missing, omit it; never fill the gap.
- Return only the revised resume text.

VERIFIED CONTEXT:
${evidence}`;

    let refined = "";
    let modelUsed = "";
    for (const keyObj of candidateKeys) {
      for (const model of MODELS) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keyObj.key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inlineData: { mimeType, data: base64Data } },
                  { text: prompt },
                ],
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
              },
            }),
          },
        );
        if (response.status === 429) {
          await handle429(supabase, keyObj.keyId);
          break;
        }
        if (!response.ok) continue;
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text === "string" && text.trim().length >= 200) {
          refined = text.trim().replace(/^```(?:text|markdown)?\s*/i, "").replace(/\s*```$/, "");
          modelUsed = model;
          await markKeyUsed(supabase, keyObj);
          await logUsage(supabase, jwtUser.userId, "gemini", keyObj.source, true, 0, "refine-resume");
          break;
        }
      }
      if (refined) break;
    }

    if (!refined) throw new Error("Gemini could not produce a valid refined resume.");

    return Response.json(
      {
        success: true,
        modelUsed,
        sourceDocumentId: sourceDoc.id,
        refinedText: refined,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Resume refinement failed:", error);
    return jsonError(error instanceof Error ? error.message : "Resume refinement failed.", 500);
  }
});
