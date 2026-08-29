/**
 * supabase/functions/extract-context/index.ts
 * OpusHunter — AI Career Context Extraction (Gemini 2.5 Flash Lite).
 * Refined: Handles PDF/DOCX binary extraction, maps exactly to database.types.ts.
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { resolveKey } from "../_shared/keyResolver.ts";
import { corsHeaders } from "../_shared/cors.ts";
import PDFParse from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.8.0";
import { Buffer } from "node:buffer";

const supabase = getSupabaseAdmin();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, documentPath, bucket = "resumes" } = await req.json();
    if (!userId || !documentPath) throw new Error("Missing required fields: userId, documentPath");

    // 1. Download file binary from Supabase Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(documentPath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // 2. Extract raw text based on file type
    let rawText = "";
    const arrayBuffer = await fileBlob.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    try {
      if (documentPath.endsWith(".pdf") || bucket === "resumes") {
        const pdfResult = await PDFParse(Buffer.from(byteArray));
        rawText = pdfResult.text;
      } else if (
        documentPath.endsWith(".docx") ||
        documentPath.endsWith(".doc")
      ) {
        const result = await mammoth.extractRawText({
          buffer: Buffer.from(arrayBuffer),
        });
        rawText = result.value;
      } else {
        rawText = new TextDecoder().decode(byteArray);
      }
    } catch (parseError) {
      console.error("Text extraction failed:", parseError);
      throw new Error("Could not extract text from document");
    }

    if (!rawText || rawText.trim().length < 20) {
      throw new Error("Document text is empty or too short");
    }

    // 3. Resolve Gemini key
    const resolvedKeyObj = await resolveKey(supabase, userId, "gemini");
    const geminiKey = resolvedKeyObj.key;

    const prompt = `
Extract detailed career information from the following resume text.
Return ONLY a valid JSON object matching this exact structure (do not include markdown):
{
  "extracted_skills": ["string"],
  "extracted_experience": [{"company": "string", "role": "string", "duration": "string", "achievements": ["string"]}],
  "extracted_education": [{"institution": "string", "degree": "string", "year": "number"}],
  "extracted_certifications": [{"name": "string", "issuer": "string", "date": "string"}],
  "career_summary": "string",
  "key_achievements": ["string"]
}
Resume Text:
${rawText.slice(0, 12000)}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini error: ${geminiResponse.status}`);
    }
    const geminiData = await geminiResponse.json();
    const jsonString = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonString) throw new Error("Gemini returned empty JSON");

    const parsed = JSON.parse(jsonString);

    // 4. Upsert into user_context (merge existing data)
    const { data: existingContext } = await supabase
      .from("user_context")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const mergedContext = {
      user_id: userId,
      extracted_skills: [
        ...new Set([
          ...(existingContext?.extracted_skills || []),
          ...(parsed.extracted_skills || []),
        ]),
      ],
      extracted_experience: [
        ...(existingContext?.extracted_experience || []),
        ...(parsed.extracted_experience || []),
      ],
      extracted_education: [
        ...(existingContext?.extracted_education || []),
        ...(parsed.extracted_education || []),
      ],
      extracted_certifications: [
        ...(existingContext?.extracted_certifications || []),
        ...(parsed.extracted_certifications || []),
      ],
      career_summary: parsed.career_summary || existingContext?.career_summary,
      key_achievements: [
        ...new Set([
          ...(existingContext?.key_achievements || []),
          ...(parsed.key_achievements || []),
        ]),
      ],
      last_extracted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("user_context")
      .upsert(mergedContext, { onConflict: "user_id" });

    // 5. Update document status
    const docTable =
      bucket === "resumes" ? "resume_documents" : "certifications";
    await supabase
      .from(docTable)
      .update({ extraction_status: "complete" })
      .eq("storage_path", documentPath);

    // 6. Log usage
    await supabase.from("api_key_usage_logs").insert({
      user_id: userId,
      provider: "gemini",
      key_source: resolvedKeyObj.source,
      tokens_used: geminiData.usageMetadata?.totalTokenCount || 0,
      function_name: "extract-context",
      success: true,
    });

    return Response.json(
      {
        success: true,
        skills_extracted: mergedContext.extracted_skills.length,
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("Extract context error:", error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "extraction_failed", message: errMessage },
      { status: 500, headers: corsHeaders }
    );
  }
});
