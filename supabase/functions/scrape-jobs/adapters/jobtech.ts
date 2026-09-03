/**
 * supabase/functions/scrape-jobs/adapters/jobtech.ts
 * OpusHunter — Arbetsförmedlingen JobTech API Adapter.
 * Direct extraction of comprehensive Swedish job postings.
 * Provides detailed descriptions to fuel the ATS Intelligence Scorer.
 */

export async function scrapeJobTechSweden(query: string, city: string) {
  const url = new URL("https://jobsearch.api.jobtechdev.se/search");

  url.searchParams.set("q", `${query} ${city}`.trim());
  url.searchParams.set("limit", "50");

  const response = await fetch(url.toString(), {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  if (!data.hits || !Array.isArray(data.hits)) {
    return [];
  }

  return data.hits.map((job: any) => {
    const workplaceCity = job.workplace_address?.city || city;
    const isRemote =
      workplaceCity.toLowerCase() === "ospecificerad arbetsort" ||
      (job.description?.text || "").toLowerCase().includes("remote") ||
      (job.description?.text || "").toLowerCase().includes("distans");

    return {
      external_job_id: `jobtech-${job.id}`,
      title: job.headline || job.occupation?.label || "Unknown Role",
      company: job.employer?.name || "Confidential",
      location: workplaceCity,
      country_code: "SE",
      is_remote: isRemote,
      description: job.description?.text || "",
      url: job.application_details?.url || job.webpage_url || "",
      source: "custom",
      posted_at: job.publication_date || new Date().toISOString(),
    };
  });
}
