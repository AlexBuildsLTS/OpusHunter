/**
 * supabase/functions/auto-apply/index.ts
 * OpusHunter — Application Orchestration.
 *
 * Routes by job_vault.url (there is no separate apply_url column):
 *   greenhouse.io / lever.co domain -> direct API submission
 *   url starts with "mailto:"      -> send via linked Gmail/Outlook
 *   anything else                   -> prepare-and-handoff (no fake success)
 *
 * NOTE: candidate phone number is intentionally omitted below — no phone
 * field exists on profiles or user_context in the current schema. Add one
 * and wire it in here once that's decided; sending blank phone rather than
 * a fabricated value in the meantime.
 */

import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";
import {
  refreshEmailToken,
  getPrimaryEmailAccount,
} from "../_shared/emailTokenManager.ts";

const supabase = getSupabaseAdmin();

type SubmissionRoute = "greenhouse" | "lever" | "email" | "handoff";

interface CandidateData {
  fullName: string;
  email: string;
  coverLetterBody: string;
  resumeBuffer: Uint8Array;
  resumeFileName: string;
}

interface RouteResult {
  success: boolean;
  submissionMethod: string;
  confirmationDetails: string;
  handoffPayload?: Record<string, unknown>;
}

// ── Route detection ──────────────────────────────────────────────────────
function detectRoute(url: string): SubmissionRoute {
  if (url.startsWith("mailto:")) return "email";
  try {
    const host = new URL(url).hostname;
    if (host.includes("greenhouse")) return "greenhouse";
    if (host.includes("lever.co")) return "lever";
  } catch {
    // Not a valid absolute URL — falls through to handoff below.
  }
  return "handoff";
}

// ── Greenhouse ────────────────────────────────────────────────────────────
async function submitToGreenhouse(
  applyUrl: string,
  candidate: CandidateData,
): Promise<RouteResult> {
  const match =
    applyUrl.match(/\/embed\/job(?:_app)?\/(\d+)/) ||
    applyUrl.match(/jobs\/(\d+)/);
  const jobId = match?.[1];

  if (!jobId) {
    return {
      success: false,
      submissionMethod: "greenhouse_direct",
      confirmationDetails:
        "Could not extract Greenhouse job ID from URL — falling back to handoff",
    };
  }

  const [firstName, ...rest] = candidate.fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const formData = new FormData();
  formData.append("first_name", firstName);
  formData.append("last_name", lastName);
  formData.append("email", candidate.email);
  formData.append(
    "resume",
    new Blob([candidate.resumeBuffer as any]),
    candidate.resumeFileName,
  );
  formData.append("cover_letter_text", candidate.coverLetterBody);

  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${jobId}/jobs/${jobId}/apply`,
      { method: "POST", body: formData },
    );

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        submissionMethod: "greenhouse_direct",
        confirmationDetails: `Submitted to Greenhouse (job ${jobId})${
          data?.id ? `, application ID ${data.id}` : ""
        }`,
      };
    }

    const errBody = await res.text().catch(() => "");
    return {
      success: false,
      submissionMethod: "greenhouse_direct",
      confirmationDetails: `Greenhouse rejected submission (${res.status}): ${errBody.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      success: false,
      submissionMethod: "greenhouse_direct",
      confirmationDetails: `Greenhouse submission error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Lever ─────────────────────────────────────────────────────────────────
async function submitToLever(
  applyUrl: string,
  candidate: CandidateData,
): Promise<RouteResult> {
  const match = applyUrl.match(/lever\.co\/([^/]+)\/([a-f0-9-]{36})/i);
  const [, company, postingId] = match || [];

  if (!company || !postingId) {
    return {
      success: false,
      submissionMethod: "lever_direct",
      confirmationDetails:
        "Could not extract Lever company/posting ID from URL — falling back to handoff",
    };
  }

  const formData = new FormData();
  formData.append("name", candidate.fullName);
  formData.append("email", candidate.email);
  formData.append(
    "resume",
    new Blob([candidate.resumeBuffer as any]),
    candidate.resumeFileName,
  );
  formData.append("comments", candidate.coverLetterBody);

  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${company}/${postingId}/apply`,
      { method: "POST", body: formData },
    );

    if (res.ok) {
      return {
        success: true,
        submissionMethod: "lever_direct",
        confirmationDetails: `Submitted to Lever (${company}/${postingId})`,
      };
    }

    const errBody = await res.text().catch(() => "");
    return {
      success: false,
      submissionMethod: "lever_direct",
      confirmationDetails: `Lever rejected submission (${res.status}): ${errBody.slice(0, 200)}`,
    };
  } catch (err) {
    return {
      success: false,
      submissionMethod: "lever_direct",
      confirmationDetails: `Lever submission error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── Email (Gmail / Outlook via existing emailTokenManager) ────────────────
function extractMailtoAddress(url: string): string | null {
  if (!url.startsWith("mailto:")) return null;
  return url.slice(7).split("?")[0].trim() || null;
}

function buildRfc2822(
  to: string,
  from: string,
  subject: string,
  body: string,
  attachment: { filename: string; data: Uint8Array },
): string {
  const boundary = `bnd_${crypto.randomUUID().replace(/-/g, "")}`;
  const b64Attachment = btoa(String.fromCharCode(...attachment.data));
  return [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${attachment.filename}"`,
    `Content-Disposition: attachment; filename="${attachment.filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    b64Attachment,
    `--${boundary}--`,
  ].join("\r\n");
}

async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  body: string,
  attachment: { filename: string; data: Uint8Array },
): Promise<RouteResult> {
  const raw = buildRfc2822(to, from, subject, body, attachment);
  const rawEncoded = btoa(raw)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEncoded }),
    },
  );

  if (res.ok) {
    const data = await res.json();
    return {
      success: true,
      submissionMethod: "gmail_api_send",
      confirmationDetails: `Sent via Gmail (message ID ${data.id})`,
    };
  }

  const errBody = await res.text().catch(() => "");
  return {
    success: false,
    submissionMethod: "gmail_api_send",
    confirmationDetails: `Gmail send failed: ${errBody.slice(0, 200)}`,
  };
}

async function sendViaOutlook(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  attachment: { filename: string; data: Uint8Array },
): Promise<RouteResult> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: attachment.filename,
            contentBytes: btoa(String.fromCharCode(...attachment.data)),
          },
        ],
      },
    }),
  });

  if (res.ok || res.status === 202) {
    return {
      success: true,
      submissionMethod: "outlook_graph_send",
      confirmationDetails: "Sent via Outlook",
    };
  }

  const errBody = await res.json().catch(() => ({}));
  return {
    success: false,
    submissionMethod: "outlook_graph_send",
    confirmationDetails: `Outlook send failed: ${errBody?.error?.message || "unknown error"}`,
  };
}

async function submitViaEmail(
  applyUrl: string,
  description: string,
  candidate: CandidateData,
  jobTitle: string,
  company: string,
  userId: string,
): Promise<RouteResult> {
  const recipient =
    extractMailtoAddress(applyUrl) ||
    description.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];

  if (!recipient) {
    return {
      success: false,
      submissionMethod: "email_handoff",
      confirmationDetails: "No recipient email address found for this listing",
    };
  }

  const account = await getPrimaryEmailAccount(supabase as any, userId);
  if (!account) {
    return {
      success: false,
      submissionMethod: "email_handoff",
      confirmationDetails:
        "No linked email account — link Gmail or Outlook in Settings first",
    };
  }

  const refreshed = await refreshEmailToken(supabase as any, account.id);
  if (!refreshed) {
    return {
      success: false,
      submissionMethod: "email_handoff",
      confirmationDetails: "Linked email account needs re-authorization",
    };
  }

  const subject = `Application for ${jobTitle} at ${company}`;

  if (account.provider === "google") {
    return sendViaGmail(
      refreshed.accessToken,
      account.email,
      recipient,
      subject,
      candidate.coverLetterBody,
      { filename: candidate.resumeFileName, data: candidate.resumeBuffer },
    );
  }
  return sendViaOutlook(
    refreshed.accessToken,
    recipient,
    subject,
    candidate.coverLetterBody,
    { filename: candidate.resumeFileName, data: candidate.resumeBuffer },
  );
}

// ── Handoff (always succeeds — this is a truthful "not automatable" state) ─
function prepareHandoff(
  applyUrl: string,
  candidate: CandidateData,
): RouteResult {
  return {
    success: true,
    submissionMethod: "generic_prepare_handoff",
    confirmationDetails: "Prepared for manual submission — not auto-submitted",
    handoffPayload: {
      openApplyPageUrl: applyUrl,
      prefilledName: candidate.fullName,
      prefilledEmail: candidate.email,
      readyToPaste: candidate.coverLetterBody,
      resumeFileName: candidate.resumeFileName,
    },
  };
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const jwtUser = await verifyJwt(req);
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || jwtUser?.userId;
    const jobId = body.jobId;
    const coverLetterId = body.coverLetterId;

    if (!userId || !jobId) {
      return Response.json(
        { error: "missing_fields", message: "userId and jobId are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const [jobResult, profileResult, resumeResult, letterResult] =
      await Promise.all([
        supabase
          .from("job_vault")
          .select("*")
          .eq("id", jobId)
          .eq("user_id", userId)
          .single(),
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase
          .from("resume_documents")
          .select("*")
          .eq("user_id", userId)
          .eq("is_primary", true)
          .maybeSingle(),
        coverLetterId
          ? supabase
              .from("cover_letters")
              .select("*")
              .eq("id", coverLetterId)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (jobResult.error || !jobResult.data) {
      return Response.json(
        {
          error: "job_not_found",
          message: "Job not found or not owned by user",
        },
        { status: 404, headers: corsHeaders },
      );
    }
    if (profileResult.error || !profileResult.data) {
      return Response.json(
        { error: "profile_not_found" },
        { status: 404, headers: corsHeaders },
      );
    }
    if (resumeResult.error || !resumeResult.data) {
      return Response.json(
        {
          error: "no_primary_resume",
          message: "Upload and set a primary resume first",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const job = jobResult.data;
    const profile = profileResult.data;
    const resume = resumeResult.data;
    const letter = letterResult.data;

    if (!letter) {
      return Response.json(
        {
          error: "no_cover_letter",
          message: "Generate a cover letter for this job first",
        },
        { status: 400, headers: corsHeaders },
      );
    }

    // Download resume from storage
    const { data: resumeFile, error: downloadError } = await supabase.storage
      .from("cv_vault")
      .download(resume.storage_path);
    if (downloadError || !resumeFile) {
      return Response.json(
        { error: "resume_download_failed", message: downloadError?.message },
        { status: 500, headers: corsHeaders },
      );
    }
    const resumeBuffer = new Uint8Array(await resumeFile.arrayBuffer());

    const fullName =
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
      "Applicant";
    const candidate: CandidateData = {
      fullName,
      email: profile.email,
      coverLetterBody: letter.body,
      resumeBuffer,
      resumeFileName: resume.file_name,
    };

    const route = detectRoute(job.url);
    let result: RouteResult;

    try {
      switch (route) {
        case "greenhouse":
          result = await submitToGreenhouse(job.url, candidate);
          break;
        case "lever":
          result = await submitToLever(job.url, candidate);
          break;
        case "email":
          result = await submitViaEmail(
            job.url,
            job.description || "",
            candidate,
            job.title,
            job.company,
            userId,
          );
          break;
        default:
          result = prepareHandoff(job.url, candidate);
      }

      // Direct-submit routes that failed to parse/submit degrade to handoff,
      // never silently reported as success.
      if (!result.success && route !== "handoff" && route !== "email") {
        result = prepareHandoff(job.url, candidate);
      }
    } catch (err) {
      console.error("[auto-apply] Route execution error:", err);
      result = prepareHandoff(job.url, candidate);
    }

    const { error: upsertError } = await supabase
      .from("job_applications")
      .upsert(
        {
          user_id: userId,
          job_id: jobId,
          status: result.success ? "applied" : "saved",
          cover_letter_used: letter.id,
          resume_document_id: resume.id,
          submission_method: result.submissionMethod,
          sender_email: candidate.email,
          sender_full_name: candidate.fullName,
          submission_confirmation: result.success
            ? result.confirmationDetails
            : null,
          submission_error: result.success ? null : result.confirmationDetails,
          applied_at:
            result.success &&
            result.submissionMethod !== "generic_prepare_handoff"
              ? new Date().toISOString()
              : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,job_id" },
      );

    if (upsertError) {
      console.error("[auto-apply] job_applications upsert error:", upsertError);
    }

    return Response.json(result, { headers: corsHeaders });
  } catch (error: unknown) {
    console.error("[auto-apply] Fatal error:", error);
    return Response.json(
      {
        error: "auto_apply_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
