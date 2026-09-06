import { getSupabaseAdmin, verifyJwt } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = getSupabaseAdmin();

type Provider = "greenhouse" | "lever" | "unsupported";

function providerFromUrl(value: string): Provider {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      host === "boards.greenhouse.io" ||
      host === "job-boards.greenhouse.io"
    ) {
      return "greenhouse";
    }
    if (
      host === "jobs.lever.co" ||
      host === "jobs.eu.lever.co" ||
      host === "api.lever.co"
    ) {
      return "lever";
    }
  } catch {
    // The caller receives a validation error below; do not submit an invalid URL.
  }
  return "unsupported";
}

function greenhouseTarget(value: string) {
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean);
  const boardToken = segments[0];
  const pathJobId = segments[2];
  const queryJobId = url.searchParams.get("gh_jid");
  const jobId = pathJobId || queryJobId;
  if (!boardToken || !jobId || !/^\d+$/.test(jobId)) {
    throw new Error(
      "The Greenhouse listing does not contain a valid board token and job id.",
    );
  }
  return { boardToken, jobId };
}

function basicAuth(apiKey: string) {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

function appendText(form: FormData, name: string, value: unknown) {
  if (typeof value === "string" && value.trim())
    form.append(name, value.trim());
}

async function submitGreenhouse(args: {
  apiKey: string;
  listingUrl: string;
  profile: Record<string, unknown>;
  resume: Blob;
  resumeName: string;
  coverLetter?: string | null;
  answers: Record<string, unknown>;
}) {
  const { boardToken, jobId } = greenhouseTarget(args.listingUrl);
  const auth = basicAuth(args.apiKey);
  const jobResponse = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${jobId}?questions=true`,
  );
  if (!jobResponse.ok) {
    throw new Error(
      `Greenhouse job questions could not be loaded (${jobResponse.status}).`,
    );
  }
  const job = (await jobResponse.json()) as {
    questions?: Array<{
      required?: boolean;
      label?: string;
      fields?: Array<{ name?: string; type?: string }>;
    }>;
  };

  const form = new FormData();
  appendText(form, "first_name", args.profile.first_name);
  appendText(form, "last_name", args.profile.last_name);
  appendText(
    form,
    "email",
    args.profile.application_email || args.profile.email,
  );
  appendText(form, "phone", args.profile.phone);
  form.append("resume", args.resume, args.resumeName);
  if (args.coverLetter) appendText(form, "cover_letter", args.coverLetter);

  const missingRequired = (job.questions || [])
    .flatMap((question) =>
      (question.fields || []).map((field) => ({
        required: question.required,
        label: question.label || field.name || "Required question",
        name: field.name || "",
        type: field.type || "",
      })),
    )
    .filter(
      (field) =>
        field.required &&
        field.name &&
        ![
          "first_name",
          "last_name",
          "email",
          "phone",
          "resume",
          "cover_letter",
        ].includes(field.name) &&
        args.answers[field.name] === undefined,
    );

  if (missingRequired.length) {
    return {
      status: 422,
      body: {
        error: "required_provider_questions",
        provider: "greenhouse",
        message:
          "This listing requires answers that must be reviewed before submission.",
        questions: missingRequired,
      },
    };
  }

  for (const [name, value] of Object.entries(args.answers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => appendText(form, name, item));
    } else {
      appendText(form, name, value);
    }
  }

  const response = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${jobId}`,
    { method: "POST", headers: { Authorization: auth }, body: form },
  );
  const text = await response.text();
  let providerBody: Record<string, unknown> = {};
  try {
    providerBody = JSON.parse(text) as Record<string, unknown>;
  } catch {
    providerBody = { message: text.slice(0, 500) };
  }
  return {
    status: response.status,
    body: {
      provider: "greenhouse",
      providerApplicationId:
        typeof providerBody.id === "string" ||
        typeof providerBody.id === "number"
          ? String(providerBody.id)
          : null,
      message: response.ok
        ? "Greenhouse accepted the application."
        : "Greenhouse rejected the application.",
      providerStatus: response.status,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const jwtUser = await verifyJwt(req);
  if (!jwtUser) {
    return Response.json(
      {
        error: "unauthorized",
        message: "A valid authenticated session is required.",
      },
      { status: 401, headers: corsHeaders },
    );
  }

  try {
    const body = await req.json();
    const jobId = typeof body.jobId === "string" ? body.jobId : body.job_id;
    const confirmation =
      body.confirmation === true &&
      typeof body.submissionRequestId === "string";
    if (!jobId || !confirmation) {
      return Response.json(
        {
          error: "confirmation_required",
          message: "A final confirmation and submissionRequestId are required.",
        },
        { status: 400, headers: corsHeaders },
      );
    }
    const { data: previousAttempt } = await supabase
      .from("job_applications")
      .select(
        "status,ats_provider,submission_confirmation,submission_error,provider_response",
      )
      .eq("user_id", jwtUser.userId)
      .eq("submission_request_id", body.submissionRequestId)
      .maybeSingle();
    if (previousAttempt) {
      const previouslyAccepted = previousAttempt.status === "applied";
      return Response.json(
        previouslyAccepted
          ? {
              success: true,
              provider: previousAttempt.ats_provider,
              message: previousAttempt.submission_confirmation,
              providerApplicationId:
                previousAttempt.provider_response?.providerApplicationId ||
                null,
              idempotentReplay: true,
            }
          : {
              error: "provider_rejected",
              provider: previousAttempt.ats_provider,
              message: previousAttempt.submission_error,
              idempotentReplay: true,
            },
        { status: previouslyAccepted ? 200 : 422, headers: corsHeaders },
      );
    }

    const [jobResult, profileResult, resumeResult, coverResult] =
      await Promise.all([
        supabase
          .from("job_vault")
          .select("id,url,source_url,title,company")
          .eq("id", jobId)
          .eq("user_id", jwtUser.userId)
          .single(),
        supabase.from("profiles").select("*").eq("id", jwtUser.userId).single(),
        supabase
          .from("resume_documents")
          .select("file_name,storage_path,is_primary,extraction_status")
          .eq("user_id", jwtUser.userId)
          .eq("is_primary", true)
          .maybeSingle(),
        supabase
          .from("cover_letters")
          .select("body")
          .eq("job_id", jobId)
          .eq("user_id", jwtUser.userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    if (jobResult.error || !jobResult.data) throw new Error("Job not found.");
    if (profileResult.error || !profileResult.data)
      throw new Error("Profile not found.");
    if (resumeResult.error || !resumeResult.data)
      throw new Error("A primary CV is required.");
    if (
      resumeResult.data.extraction_status.toLowerCase() !== "complete" &&
      resumeResult.data.extraction_status.toLowerCase() !== "completed" &&
      resumeResult.data.extraction_status.toLowerCase() !== "extracted"
    ) {
      throw new Error(
        "The primary CV must finish extraction before submission.",
      );
    }

    const listingUrl = jobResult.data.url || jobResult.data.source_url;
    if (!listingUrl) throw new Error("This listing has no application URL.");
    const provider = providerFromUrl(listingUrl);
    if (provider !== "greenhouse") {
      const message =
        provider === "lever"
          ? "Lever direct submission requires an employer-authorized Lever integration; this app has no Lever credential configured."
          : "This ATS is not supported for direct submission. Open the employer form instead.";
      return Response.json(
        { error: "provider_not_configured", provider, message },
        { status: 422, headers: corsHeaders },
      );
    }

    const apiKey = Deno.env.get("GREENHOUSE_JOB_BOARD_API_KEY")?.trim();
    if (!apiKey) {
      return Response.json(
        {
          error: "provider_not_configured",
          provider,
          message:
            "Greenhouse submission is not enabled until an employer-authorized Job Board API key is configured.",
        },
        { status: 422, headers: corsHeaders },
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resumeResult.data.storage_path);
    if (downloadError || !file)
      throw new Error("The primary CV could not be downloaded.");
    const result = await submitGreenhouse({
      apiKey,
      listingUrl,
      profile: profileResult.data,
      resume: file,
      resumeName: resumeResult.data.file_name,
      coverLetter: coverResult.data?.body,
      answers:
        body.answers && typeof body.answers === "object" ? body.answers : {},
    });

    const success = result.status >= 200 && result.status < 300;
    const providerBody = result.body as Record<string, unknown>;
    await supabase.from("job_applications").upsert(
      {
        user_id: jwtUser.userId,
        job_id: jobId,
        status: success ? "applied" : "saved",
        submission_method: "greenhouse_job_board_api",
        ats_provider: "greenhouse",
        sender_email:
          profileResult.data.application_email || profileResult.data.email,
        sender_full_name:
          `${profileResult.data.first_name || ""} ${profileResult.data.last_name || ""}`.trim(),
        submission_confirmation: success ? String(providerBody.message) : null,
        submission_error: success ? null : String(providerBody.message),
        submission_request_id: body.submissionRequestId,
        provider_response: {
          providerStatus: providerBody.providerStatus,
          providerApplicationId: providerBody.providerApplicationId,
        },
        applied_at: success ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,job_id" },
    );

    return Response.json(
      success
        ? { success: true, ...providerBody }
        : { error: "provider_rejected", ...providerBody },
      { status: result.status, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Application submission failed:", error);
    return Response.json(
      {
        error: "submission_failed",
        message:
          error instanceof Error
            ? error.message
            : "Application submission failed.",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
