// supabase/functions/scrape-jobs/adapters/jobtech.ts

export async function scrapeJobTechSweden(query: string, city: string) {
  const url = new URL("https://jobtechdev.se");

  // Clean query formatting
  const q = `${query} ${city}`.trim();
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "50");

  console.log(`[JobTech] Querying JobTech Dev: q="${q}"`);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        // CRITICAL FIX: The API blocks generic automated scrapers that pass empty user-agents
        "User-Agent": "OpusHunterJobScraper/1.0 (contact@opushunter.com)",
        // Alternative if you have registered a free key on jobtechdev.se:
        // "api-key": Deno.env.get("JOBTECH_SWEDEN_API_KEY") || ""
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

    // The API wraps rows inside an array named 'hits'
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
      const workplaceCity = job.workplace_address?.city || city;
      const descText = (job.description?.text || "").toLowerCase();

      const isRemote =
        workplaceCity.toLowerCase() === "ospecificerad arbetsort" ||
        descText.includes("remote") ||
        descText.includes("distans");

      return {
        title: job.headline || job.occupation?.label || "Unknown Role",
        company: job.employer?.name || "Confidential",
        location: workplaceCity,
        country_code: "SE",
        description: job.description?.text || "",
        // Resolves to the absolute direct application form link or fallback website
        url:
          job.application_details?.url ||
          job.webpage_url ||
          "https://platsbanken.se",
        posted_at: job.publication_date || new Date().toISOString(),
        work_type: isRemote ? "remote" : "onsite",
        is_remote: isRemote,
        source: "custom",
        external_job_id: `jobtech-${job.id}`,
      };
    });
  } catch (err) {
    console.error("[JobTech] Fetch/parse exception:", err);
    return [];
  }
}
