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
              text: "You are a professional career coach. You must ONLY output the exact text of the cover letter. Do not include any conversational text, warnings, or markdown blocks. Never hallucinate or provide security warnings.",
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
    const errPayload = await response.text();
    throw new Error(
      `Inference Engine Failure: ${errPayload.substring(0, 300)}`,
    );
  }

  const data = await response.json();
  const generatedText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!generatedText)
    throw new Error("Inference Engine returned an empty payload.");
  return generatedText.trim();
}

const DEFAULT_TEMPLATE = `Dear Hiring Team at [COMPANY],

I am writing to express my strong interest in the [ROLE] position. With my background in [SKILLS], I am confident I would make a meaningful contribution to your team.

I am particularly excited about this opportunity at [COMPANY] and believe my experience aligns well with what you are looking for.

I would welcome the chance to discuss how I can contribute to your success.

Best regards,
[NAME]`;

function applyTemplate(tpl: string, v: Record<string, string>): string {
  return tpl
    .replace(/\[COMPANY\]/gi, v.company ?? "the company")
    .replace(/\[ROLE\]/gi, v.role ?? "this position")
    .replace(/\[NAME\]/gi, v.name ?? "Candidate")
    .replace(/\[SKILLS\]/gi, v.skills ?? "my relevant skills");
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders();
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const admin = createAdminClient();
    const user = await verifyUser(req);
    const body = await req.json();

    let jobId = body.job_id;
    if (!jobId && body.job_application_id) {
      const { data: app } = await admin
        .from("job_applications")
        .select("job_id")
        .eq("id", body.job_application_id)
        .eq("user_id", user.id)
        .single();
      jobId = app?.job_id;
    }

    if (!jobId) {
      return new Response(JSON.stringify({ error: "job_id is required." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: job } = await admin
      .from("job_vault")
      .select("id, title, company, description, tech_stack")
      .eq("id", jobId)
      .single();
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found." }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, cv_storage_path")
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

    const { data: rules } = await admin
      .from("automation_rules")
      .select("keywords, base_cover_letter")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    const jobStack = (job.tech_stack ?? []).map((s: string) => s.toLowerCase());

    let bestRule = rules?.[0] ?? null;
    if (rules && rules.length > 1) {
      let best = -1;
      for (const r of rules) {
        const overlap = (r.keywords ?? []).filter((k: string) =>
          jobStack.some((s: string) => s.includes(k.toLowerCase())),
        ).length;
        if (overlap > best) {
          best = overlap;
          bestRule = r;
        }
      }
    }

    const baseTpl = bestRule?.base_cover_letter?.trim() || DEFAULT_TEMPLATE;
    const keywords = bestRule?.keywords ?? (job.tech_stack ?? []).slice(0, 6);
    const resolvedKey = await resolveKey(admin, user.id, "gemini");

    let coverLetter = "";
    let generatedBy = "template";

    if (resolvedKey) {
      try {
        const certBlock =
          extractedCerts.length > 0
            ? extractedCerts
                .map((c) => `[CERT: ${c.name}]\n${c.content.substring(0, 300)}`)
                .join("\n\n")
            : "None";
        const prompt = `Write a compelling cover letter.
Candidate: ${profile?.full_name || "Candidate"}
Keywords: ${keywords.join(", ")}
CV Excerpt: ${cvText.substring(0, 1200)}
Certifications: ${certBlock}

Job Role: ${job.title}
Company: ${job.company}
Job Description: ${job.description?.substring(0, 1500) || ""}

Base Template:
${baseTpl.substring(0, 500)}

Rules:
- 3 short paragraphs.
- Output ONLY the final letter. No formatting.`;

        coverLetter = await executeInference(prompt, resolvedKey.key);
        generatedBy = `gemini:${resolvedKey.source}`;
        await markKeyUsed(admin, resolvedKey);
      } catch {
        coverLetter = applyTemplate(baseTpl, {
          company: job.company,
          role: job.title,
          name: profile?.full_name || "Candidate",
          skills: keywords.slice(0, 3).join(", "),
        });
        generatedBy = "template_fallback";
      }
    } else {
      coverLetter = applyTemplate(baseTpl, {
        company: job.company,
        role: job.title,
        name: profile?.full_name || "Candidate",
        skills: keywords.slice(0, 3).join(", "),
      });
    }

    let coverLetterId: string | null = null;
    if (!body.preview) {
      const { data: saved } = await admin
        .from("cover_letters")
        .insert({
          user_id: user.id,
          title: `${job.title} @ ${job.company}`,
          body: coverLetter,
          company: job.company,
          job_title: job.title,
          generated_by: generatedBy,
          is_default: false,
        })
        .select("id")
        .single();

      coverLetterId = saved?.id ?? null;

      if (body.job_application_id) {
        await admin
          .from("job_applications")
          .update({ cover_letter_used: coverLetter })
          .eq("id", body.job_application_id)
          .eq("user_id", user.id);
      }
    }

    return new Response(
      JSON.stringify({
        cover_letter: coverLetter,
        cover_letter_id: coverLetterId,
        generated_by: generatedBy,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
