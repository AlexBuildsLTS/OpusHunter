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
              text: "You are an automated orchestration AI. You must ONLY output the exact text of the cover letter. Never output markdown, explanations, or security warnings.",
            },
          ],
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 800 },
      }),
      signal: AbortSignal.timeout(25000),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Inference Engine Failure: ${errText.substring(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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

    if (!body.job_application_id) {
      return new Response(
        JSON.stringify({ error: "job_application_id is required." }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const { data: application } = await admin
      .from("job_applications")
      .select("id, job_id, status")
      .eq("id", body.job_application_id)
      .eq("user_id", user.id)
      .single();
    if (!application)
      return new Response(JSON.stringify({ error: "Application not found." }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    if (application.status === "applied") {
      return new Response(
        JSON.stringify({ message: "Already applied.", already_applied: true }),
        {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const { data: job } = await admin
      .from("job_vault")
      .select("id, title, company, description, source_url, url, tech_stack")
      .eq("id", application.job_id)
      .single();
    if (!job)
      return new Response(
        JSON.stringify({ error: "Job not found in vault." }),
        {
          status: 404,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );

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
      .select("base_cover_letter, keywords")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    const jobStack = job.tech_stack ?? [];
    let bestRule = rules?.[0] ?? null;

    if (rules && rules.length > 1) {
      let bestOverlap = -1;
      for (const rule of rules) {
        const overlap = (rule.keywords ?? []).filter((k: string) =>
          jobStack.some((s: string) =>
            s.toLowerCase().includes(k.toLowerCase()),
          ),
        ).length;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestRule = rule;
        }
      }
    }

    const baseCoverLetter =
      bestRule?.base_cover_letter ??
      `Dear Hiring Team at ${job.company},\n\nI am excited to apply for the ${job.title} position.\n\nBest regards,\n${profile?.full_name || "Candidate"}`;
    const keywords = bestRule?.keywords ?? jobStack.slice(0, 5);

    const resolvedKey = await resolveKey(admin, user.id, "gemini");
    let finalLetter = "";
    let generatedBy = "template";

    if (resolvedKey) {
      try {
        const certBlock =
          extractedCerts.length > 0
            ? extractedCerts
                .map((c) => `[CERT: ${c.name}]\n${c.content.substring(0, 300)}`)
                .join("\n\n")
            : "None";
        const prompt = `Write a professional cover letter.
Name: ${profile?.full_name || "Candidate"}
Role: ${job.title}
Company: ${job.company}
Keywords: ${keywords.join(", ")}
CV Excerpt: ${cvText.substring(0, 1200)}
Certifications: ${certBlock}
Job Description: ${job.description?.substring(0, 1500) || ""}

Base Template:
${baseCoverLetter.substring(0, 500)}

Output ONLY the letter body.`;

        finalLetter = await executeInference(prompt, resolvedKey.key);
        generatedBy = `gemini:${resolvedKey.source}`;
        await markKeyUsed(admin, resolvedKey);
      } catch {
        finalLetter = baseCoverLetter
          .replace(/\[COMPANY\]/gi, job.company)
          .replace(/\[ROLE\]/gi, job.title)
          .replace(/\[NAME\]/gi, profile?.full_name || "Candidate");
        generatedBy = "template_fallback";
      }
    } else {
      finalLetter = baseCoverLetter
        .replace(/\[COMPANY\]/gi, job.company)
        .replace(/\[ROLE\]/gi, job.title)
        .replace(/\[NAME\]/gi, profile?.full_name || "Candidate");
    }

    const { data: savedCL } = await admin
      .from("cover_letters")
      .insert({
        user_id: user.id,
        title: `${job.title} @ ${job.company}`,
        body: finalLetter,
        company: job.company,
        job_title: job.title,
        generated_by: generatedBy,
        is_default: false,
      })
      .select("id")
      .single();

    await admin
      .from("job_applications")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
        cover_letter_used: finalLetter,
      })
      .eq("id", body.job_application_id)
      .eq("user_id", user.id);

    await admin
      .from("job_vault")
      .update({ status: "applied" })
      .eq("id", job.id)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        cover_letter: finalLetter,
        cover_letter_id: savedCL?.id ?? null,
        generated_by: generatedBy,
        apply_url: job.source_url || job.url,
      }),
      {
        status: 200,
        headers: { ...getCorsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Execution failed.",
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
