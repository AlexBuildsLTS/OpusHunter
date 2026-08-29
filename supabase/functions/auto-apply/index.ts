/**
 * supabase/functions/auto-apply/index.ts
 * OpusHunter — Application Dispatcher (Refined).
 * Packages the AI cover letter, Primary CV, and sender email into a seamless application flow.
 * Updates job_applications with submission metadata.
 */

import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, jobId, coverLetterId } = await req.json();
    if (!userId || !jobId) throw new Error("Missing required fields");

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
    const senderEmail = emailResult.data || {
      email: profile.gmail_linked_email || profile.email,
      provider: "manual",
    };

    // 2. Fetch or prepare cover letter
    let coverLetter = letterResult.data;
    if (!coverLetter) {
      // If no cover letter ID provided, generate one on the fly
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
      const genData = await genResponse.json();
      if (genData.cover_letter_id) {
        const { data } = await supabase
          .from("cover_letters")
          .select("*")
          .eq("id", genData.cover_letter_id)
          .single();
        coverLetter = data;
      }
    }

    const fullName =
      `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    const subject = `Application for ${job.title} at ${job.company}`;

    // 3. Construct Gmail Compose Link (mailto:)
    const emailBody = coverLetter?.body || "";
    const mailtoLink = `mailto:${senderEmail.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    // 4. Insert into job_applications
    const { error: appError } = await supabase.from("job_applications").upsert(
      {
        user_id: userId,
        job_id: jobId,
        status: "applied",
        applied_at: new Date().toISOString(),
        cover_letter_used: coverLetter?.id || null,
        resume_document_id: primaryResume?.id || null,
        sender_email: senderEmail.email,
        sender_full_name: fullName,
        submission_method: "mailto_link",
        submission_confirmation: "Draft prepared for Gmail",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,job_id" },
    );

    if (appError) throw appError;

    return Response.json(
      {
        success: true,
        status: "applied",
        mailto_link: mailtoLink,
        resume_attached: primaryResume?.file_name || "No primary CV found",
        sender: senderEmail.email,
      },
      { headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("Auto-apply error:", error);
    return Response.json(
      { error: "apply_failed", message: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: corsHeaders },
    );
  }
});
