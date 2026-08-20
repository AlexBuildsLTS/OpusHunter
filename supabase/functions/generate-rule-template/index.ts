import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { resolveKey, markKeyUsed } from "../_shared/keyResolver.ts";
import { verifyUser } from "../_shared/auth.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CV_BUCKET = "cv_vault";
const MAX_CERTS = 10;

interface DocumentAsset {
  name: string;
  content: string;
}

async function fetchNormalizedDocument(
  adminClient: any,
  path: string,
): Promise<string> {
  try {
    const { data, error } = await adminClient.storage
      .from(CV_BUCKET)
      .download(path);
    if (error || !data) return "";

    const buffer = await data.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    return decoder
      .decode(buffer)
      .replace(/[^\x20-\x7E\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

async function executeInference(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are a professional career coach. You must ONLY output the exact text of the cover letter template. Do not include any conversational text, warnings, or markdown blocks. Never hallucinate or provide security warnings.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.65,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
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
      signal: AbortSignal.timeout(25000),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Inference Engine Failure: ${err.substring(0, 300)}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!text) throw new Error("Inference Engine returned an empty payload.");
  return text.trim();
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders();
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = createAdminClient();
    const user = await verifyUser(req);
    const body = await req.json();

    const keywords: string[] = body.keywords ?? [];
    if (keywords.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Keywords are required to generate a template.",
        }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("cv_storage_path, full_name")
      .eq("id", user.id)
      .single();
    const { data: certs } = await admin
      .from("certifications")
      .select("file_name, storage_path")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(MAX_CERTS);

    const fetchPromises: Promise<void>[] = [];
    let cvText = "";
    const extractedCerts: DocumentAsset[] = [];

    if (profile?.cv_storage_path) {
      fetchPromises.push(
        fetchNormalizedDocument(admin, profile.cv_storage_path).then((t) => {
          cvText = t;
        }),
      );
    }

    if (certs) {
      for (const cert of certs) {
        if (cert.storage_path) {
          fetchPromises.push(
            fetchNormalizedDocument(admin, cert.storage_path).then((t) => {
              if (t) extractedCerts.push({ name: cert.file_name, content: t });
            }),
          );
        }
      }
    }

    await Promise.all(fetchPromises);

    const resolvedKey = await resolveKey(admin, user.id, "gemini");
    if (!resolvedKey) {
      return new Response(
        JSON.stringify({ error: "No inference key available." }),
        {
          status: 503,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const certBlock =
      extractedCerts.length > 0
        ? extractedCerts
            .map((c) => `[CERT: ${c.name}]\n${c.content.substring(0, 300)}`)
            .join("\n\n")
        : "None";
    const workModeLabel =
      {
        remote: "fully remote",
        hybrid: "hybrid",
        onsite: "on-site",
        any: "remote, hybrid, or on-site",
      }[body.remote_preference as string] ?? "any work arrangement";

    const prompt = `Write a base cover letter TEMPLATE for an applicant.
Name: ${profile?.full_name || "[NAME]"}
Keywords: ${keywords.join(", ")}
Location: ${body.location || "Any"}
Work Mode: ${workModeLabel}
Experience: ${body.experience_levels?.join(", ") || "Any"}
CV Excerpt: ${cvText.substring(0, 1500)}
Certifications: ${certBlock}

Requirements:
- Use [COMPANY] and [ROLE] placeholders exactly.
- 3 short paragraphs.
- Highly professional, strictly factual.
- Output ONLY the letter text.`;

    const draft = await executeInference(prompt, resolvedKey.key);
    await markKeyUsed(admin, resolvedKey);

    return new Response(
      JSON.stringify({ draft, generated_by: resolvedKey.source }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Execution failed.",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
