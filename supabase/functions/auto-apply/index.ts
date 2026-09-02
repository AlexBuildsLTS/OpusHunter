/**
 * supabase/functions/auto-apply/index.ts
 * OpusHunter — Autonomous Application Router & Dispatcher
 *
 * Routes job applications to appropriate channels:
 * 1. Greenhouse/Lever → Direct form submission (API)
 * 2. mailto: links → Email submission via Gmail/Outlook OAuth
 * 3. Generic forms → Prepare-and-handoff (user completes form)
 *
 * Strictly guarantees that status is NEVER marked 'applied' unless verified
 * real transmission to the recipient succeeds.
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { refreshEmailToken } from "../_shared/emailTokenManager.ts";

const supabase = getSupabaseAdmin();

/**
 * Detect submission route by analyzing apply_url
 */
function detectSubmissionRoute(
  applyUrl: string,
): "greenhouse" | "lever" | "mailto" | "generic" {
  if (!applyUrl) return "generic";

  const url = applyUrl.toLowerCase();
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  if (url.startsWith("mailto:")) return "mailto";

  return "generic";
}

/**
 * Base64url encoder for RFC 2822 email payload (Gmail API)
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Submit application via Gmail API
 */
async function submitViaGmail(
  accessToken: string,
  senderEmail: string,
  senderFullName: string,
  recipientEmail: string,
  subject: string,
  emailBody: string,
  resumeBuffer?: Uint8Array,
  resumeFileName?: string,
): Promise<{
  success: boolean;
  method: "gmail_send" | "gmail_draft";
  messageId?: string;
  confirmation: string;
}> {
  try {
    // Build RFC 2822 email
    const boundaryStr = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    let rfcEmail = [
      `From: "${senderFullName}" <${senderEmail}>`,
      `To: <${recipientEmail}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundaryStr}"`,
      ``,
      `--${boundaryStr}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      emailBody,
    ];

    // Add resume as attachment if provided
    if (resumeBuffer && resumeFileName) {
      const resumeBase64 = btoa(String.fromCharCode(...resumeBuffer));
      rfcEmail.push(
        ``,
        `--${boundaryStr}`,
        `Content-Type: application/pdf; name="${resumeFileName}"`,
        `Content-Disposition: attachment; filename="${resumeFileName}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        resumeBase64.match(/.{1,76}/g)?.join("\n") || "",
      );
    }

    rfcEmail.push(``, `--${boundaryStr}--`);

    const rfcEmailStr = rfcEmail.join("\r\n");
    const rawEncoded = base64UrlEncode(rfcEmailStr);

    // Send via Gmail API
    const sendRes = await fetch(
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

    if (sendRes.ok) {
      const data = await sendRes.json();
      return {
        success: true,
        method: "gmail_send",
        messageId: data.id,
        confirmation: `Sent via Gmail (Message ID: ${data.id})`,
      };
    } else {
      const errText = await sendRes.text();
      console.warn("Gmail API send failed:", errText);
      return {
        success: false,
        method: "gmail_draft",
        confirmation: `Failed to send: ${errText.slice(0, 100)}`,
      };
    }
  } catch (err) {
    console.error("Gmail submission error:", err);
    return {
      success: false,
      method: "gmail_draft",
      confirmation: `Email submission error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Submit application via Outlook Graph API (Mail.Send)
 */
async function submitViaOutlook(
  accessToken: string,
  senderEmail: string,
  senderFullName: string,
  recipientEmail: string,
  subject: string,
  emailBody: string,
  resumeBuffer?: Uint8Array,
  resumeFileName?: string,
): Promise<{
  success: boolean;
  method: "outlook_send";
  confirmation: string;
}> {
  try {
    const attachments: any[] = [];

    if (resumeBuffer && resumeFileName) {
      const resumeBase64 = btoa(String.fromCharCode(...resumeBuffer));
      attachments.push({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: resumeFileName,
        contentBytes: resumeBase64,
      });
    }

    const payload = {
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: emailBody.replace(/\n/g, "<br/>"),
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipientEmail,
            },
          },
        ],
        attachments,
      },
      saveToSentItems: true,
    };

    const sendRes = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (sendRes.ok || sendRes.status === 202) {
      return {
        success: true,
        method: "outlook_send",
        confirmation: "Sent via Outlook",
      };
    } else {
      const errText = await sendRes.text();
      console.warn("Outlook API send failed:", errText);
      return {
        success: false,
        method: "outlook_send",
        confirmation: `Failed to send: ${errText.slice(0, 100)}`,
      };
    }
  } catch (err) {
    console.error("Outlook submission error:", err);
    return {
      success: false,
      method: "outlook_send",
      confirmation: `Email submission error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Prepare generic form handoff payload
 */
function prepareGenericHandoff(
  job: any,
  profile: any,
  coverLetter: any,
  primaryResume: any,
  subject: string,
): {
  success: boolean;
  method: "generic_prepare_handoff";
  payload: any;
} {
  return {
    success: true,
    method: "generic_prepare_handoff",
    payload: {
      openUrl: job.url || job.apply_url,
      prefilledData: {
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
        email: profile.email,
        phone: profile.phone_number || "",
      },
      readyToPaste: coverLetter?.body || `Application for ${job.title}`,
      resumeReady: primaryResume
        ? {
            fileName: primaryResume.file_name || "resume.pdf",
            sizeKb: Math.round((primaryResume.file_size || 0) / 1024),
            note: "Download and upload this file",
          }
        : {
            fileName: "No resume uploaded",
            sizeKb: 0,
            note: "Upload your resume",
          },
      steps: [
        "1. Tap 'Open Apply Page' below",
        "2. Fill in your information (pre-filled above)",
        "3. Copy the cover letter and paste into the form",
        "4. Upload your resume",
        "5. Submit the application",
      ],
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, jobId, coverLetterId, forceDraft } = await req.json();
    if (!userId || !jobId)
      throw new Error("Missing required fields: userId, jobId");

    // 1. Fetch all required data in parallel
    const [profileResult, jobResult, resumeResult, emailResult, letterResult] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("job_vault").select("*").eq("id", jobId).single(),
        supabase
          .from("resume_documents")
          .select("*")
          .eq("user_id", userId)
          .eq("is_primary", true)
          .maybeSingle(),
        supabase
          .from("connected_email_accounts")
          .select("*")
          .eq("user_id", userId)
          .eq("is_primary_sender", true)
          .maybeSingle(),
        coverLetterId
          ? supabase
              .from("cover_letters")
              .select("*")
              .eq("id", coverLetterId)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

    if (profileResult.error || !profileResult.data)
      throw new Error("Profile not found");
    if (jobResult.error || !jobResult.data) throw new Error("Job not found");

    const profile = profileResult.data;
    const job = jobResult.data;
    const primaryResume = resumeResult.data;
    const connectedAccount = emailResult.data;
    const senderEmail =
      connectedAccount?.email || profile.gmail_linked_email || profile.email;

    // 2. Fetch or generate cover letter if needed
    let coverLetter = letterResult.data;
    if (!coverLetter) {
      const genResponse = await fetch(
        new URL("/functions/v1/generate-cover-letter", req.url).toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("Authorization") || "",
          },
          body: JSON.stringify({ userId, jobListingId: jobId }),
        },
      );
      if (genResponse.ok) {
        const genData = await genResponse.json();
        if (genData.cover_letter_id) {
          const { data } = await supabase
            .from("cover_letters")
            .select("*")
            .eq("id", genData.cover_letter_id)
            .single();
          coverLetter = data;
        } else if (genData.primary?.body) {
          coverLetter = { id: null, body: genData.primary.body };
        }
      }
    }

    const fullName =
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
      "Applicant";
    const subject = `Application for ${job.title} at ${job.company}`;
    const emailBody =
      coverLetter?.body ||
      `Dear Hiring Team,\n\nPlease find my application for the ${job.title} position attached.\n\nBest regards,\n${fullName}`;

    // 3. Detect submission route
    const submissionRoute = detectSubmissionRoute(
      job.apply_url || job.url || "",
    );

    let submissionMethod = "manual_dispatch";
    let submissionConfirmation =
      "Application prepared for candidate submission";
    let applicationStatus: "applied" | "saved" = "saved";
    let resultPayload: any = {};

    // 4. Route to appropriate submission handler
    switch (submissionRoute) {
      case "greenhouse":
      case "lever":
        // TODO: Implement direct form submission for Greenhouse/Lever
        submissionMethod = "greenhouse_lever_direct_pending";
        submissionConfirmation =
          "Direct submission endpoint not yet implemented";
        resultPayload = prepareGenericHandoff(
          job,
          profile,
          coverLetter,
          primaryResume,
          subject,
        );
        break;

      case "mailto":
        // Extract recipient email from mailto: link
        const mailtoMatch = (job.apply_url || "").match(/mailto:([^?&]+)/);
        const recipientEmail = mailtoMatch ? mailtoMatch[1] : job.contact_email;

        if (!recipientEmail || !connectedAccount) {
          // No email account linked or no recipient found - fallback to handoff
          resultPayload = prepareGenericHandoff(
            job,
            profile,
            coverLetter,
            primaryResume,
            subject,
          );
          submissionMethod = "email_handoff_no_account";
          break;
        }

        // Try to refresh access token
        const tokenResult = await refreshEmailToken(
          supabase as any,
          connectedAccount.id,
        );

        if (!tokenResult) {
          // Token refresh failed - fallback to handoff
          resultPayload = prepareGenericHandoff(
            job,
            profile,
            coverLetter,
            primaryResume,
            subject,
          );
          submissionMethod = "email_handoff_token_expired";
          submissionConfirmation =
            "Email account token expired. Please re-link.";
          break;
        }

        // Send via appropriate provider
        let emailResult: any;
        if (connectedAccount.provider === "google") {
          emailResult = await submitViaGmail(
            tokenResult.accessToken,
            senderEmail,
            fullName,
            recipientEmail,
            subject,
            emailBody,
            primaryResume?.file_buffer,
            primaryResume?.file_name,
          );
        } else if (connectedAccount.provider === "outlook") {
          emailResult = await submitViaOutlook(
            tokenResult.accessToken,
            senderEmail,
            fullName,
            recipientEmail,
            subject,
            emailBody,
            primaryResume?.file_buffer,
            primaryResume?.file_name,
          );
        } else {
          throw new Error(
            `Unknown email provider: ${connectedAccount.provider}`,
          );
        }

        submissionMethod = emailResult.method;
        submissionConfirmation = emailResult.confirmation;
        applicationStatus = emailResult.success ? "applied" : "saved";
        resultPayload = {
          success: emailResult.success,
          method: emailResult.method,
          confirmation: emailResult.confirmation,
        };
        break;

      case "generic":
      default:
        // Generic form handoff
        resultPayload = prepareGenericHandoff(
          job,
          profile,
          coverLetter,
          primaryResume,
          subject,
        );
        submissionMethod = "generic_prepare_handoff";
        break;
    }

    // 5. Upsert job application with submission metadata
    const { error: appError } = await supabase.from("job_applications").upsert(
      {
        user_id: userId,
        job_id: jobId,
        status: applicationStatus,
        applied_at:
          applicationStatus === "applied" ? new Date().toISOString() : null,
        cover_letter_used: coverLetter?.id || null,
        resume_document_id: primaryResume?.id || null,
        sender_email: senderEmail,
        sender_full_name: fullName,
        submission_method: submissionMethod,
        submission_confirmation: submissionConfirmation,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,job_id" },
    );

    if (appError) throw appError;

    return Response.json(
      {
        success: true,
        status: applicationStatus,
        submission_method: submissionMethod,
        submission_confirmation: submissionConfirmation,
        submission_route: submissionRoute,
        ...resultPayload,
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Auto-apply error:", error);
    return Response.json(
      {
        success: false,
        error: "apply_failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
