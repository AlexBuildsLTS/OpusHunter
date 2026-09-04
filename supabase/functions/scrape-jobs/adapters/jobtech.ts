/**
 * supabase/functions/scrape-jobs/adapters/jobtech.ts
 * OpusHunter — JobTech Sweden Adapter
 * Interfaces directly with the official Arbetsförmedlingen JobSearch API.
 */

export async function scrapeJobTechSweden(query: string, city: string) {
  // Official endpoint for Arbetsförmedlingen open data
  const url = new URL("https://jobsearch.api.jobtechdev.se/search");

  const q = `${query} ${city}`.trim();
  if (q) {
    url.searchParams.set("q", q);
  }

  // Cap at 50 to maintain high fidelity and avoid memory bloat
  url.searchParams.set("limit", "50");

  console.log(`[JobTech] Querying official JobTech API: q="${q}"`);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        "User-Agent": "OpusHunter-Engine/1.0 (admin@opushunter.com)",
      },
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.warn(
        `[JobTech] HTTP Error ${response.status}: ${errBody.slice(0, 200)}`,
      );
      return [];
    }

    const data = await response.json();

    if (!data.hits || !Array.isArray(data.hits)) {
      console.warn(
        "[JobTech] Response had no 'hits' array",
        Object.keys(data || {}),
      );
      return [];
    }

    console.log(
      `[JobTech] Live Data Intercepted! Fetched ${data.hits.length} jobs.`,
    );

    return data.hits.map((job: any) => {
      const workplaceCity = job.workplace_address?.city || city || "Sweden";
      const descText = (job.description?.text || "").toLowerCase();

      const isRemote =
        workplaceCity.toLowerCase() === "ospecificerad arbetsort" ||
        descText.includes("remote") ||
        descText.includes("distans");

      return {
        title: job.headline || job.occupation?.label || "Untitled Role",
        company: job.employer?.name || "Confidential",
        location: workplaceCity,
        country_code: "SE",
        description: job.description?.text || "No description provided.",
        url:
          job.application_details?.url ||
          job.webpage_url ||
          "https://platsbanken.se",
        posted_at: job.publication_date || new Date().toISOString(),
        work_type: isRemote ? "remote" : "onsite",
        is_remote: isRemote,
        source: "jobtech",
        external_job_id: `jobtech-${job.id}`,
        source_url:
          job.webpage_url ||
          job.application_details?.url ||
          "https://platsbanken.se",
      };
    });
  } catch (err) {
    console.error("[JobTech] Fetch/parse exception:", err);
    return [];
  }
}
