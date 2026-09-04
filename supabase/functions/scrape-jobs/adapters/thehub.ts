/**
 * supabase/functions/scrape-jobs/adapters/thehub.ts
 * OpusHunter — The Hub Adapter (Nordic Startup Jobs)
 * High conversion rate for Greenhouse/Lever ATS URLs in SE/DK/NO/FI.
 */

export async function scrapeTheHub(
  query: string,
  city: string,
  countryCode: string = "SE",
) {
  const page = 1;
  const targetCountry =
    countryCode === "SWEDEN" ? "SE" : countryCode.toUpperCase();

  let targetUrl = `https://thehub.io/api/jobs?countryCode=${targetCountry}&page=${page}`;

  if (city) {
    targetUrl += `&city=${encodeURIComponent(city)}`;
  }
  if (query) {
    targetUrl += `&search=${encodeURIComponent(query)}`;
  }

  console.log(`[TheHub] Querying Nordic Startup feed: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "OpusHunter-Engine/1.0 (admin@opushunter.com)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.warn(
        `[TheHub] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
      );
      return [];
    }

    const rawData = await response.json();

    if (!rawData.docs || !Array.isArray(rawData.docs)) {
      console.warn("[TheHub] Response had no 'docs' array");
      return [];
    }

    console.log(
      `[TheHub] Successfully fetched ${rawData.docs.length} startup jobs`,
    );

    return rawData.docs.map((job: any) => {
      const locationName = job.location?.city || city || "Sweden";
      const descText = String(
        job.descriptionSnippet || job.description || "",
      ).toLowerCase();
      const workTypeStr = String(job.type || "Full-time").toLowerCase();

      const isRemote =
        workTypeStr.includes("remote") ||
        descText.includes("remote") ||
        descText.includes("distans");

      let salaryStr = undefined;
      let salaryMin = undefined;
      let salaryMax = undefined;
      const currency = job.salary?.currency || "SEK";

      if (job.salary && job.salary.from && job.salary.to) {
        salaryStr = `${job.salary.from} - ${job.salary.to} ${currency}`;
        salaryMin = Number(job.salary.from);
        salaryMax = Number(job.salary.to);
      }

      const jobId = job._id || job.id;
      const applyUrl = `https://thehub.io/jobs/${jobId}`;

      return {
        title: job.title || "Untitled Role",
        company: job.company?.name || "Confidential Startup",
        company_logo_url: job.company?.logo || undefined,
        location: locationName,
        country_code: targetCountry,
        description:
          job.description ||
          job.descriptionSnippet ||
          "No description provided.",
        url: applyUrl,
        posted_at: job.createdAt || new Date().toISOString(),
        work_type: isRemote ? "remote" : "onsite",
        is_remote: isRemote,
        salary: salaryStr,
        salary_min: salaryMin,
        salary_max: salaryMax,
        currency: currency,
        source: "thehub",
        external_job_id: `thehub-${jobId}`,
        source_url: applyUrl,
      };
    });
  } catch (err) {
    console.error("[TheHub] Fetch/parse exception:", err);
    return [];
  }
}
