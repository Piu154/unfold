// supabase/functions/opportunity-ingestion/index.ts

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({
        success: false,
        error: "Only POST requests are allowed",
      }, 405);
    }

    const body = await req.json();
    const sourceUrl = body.url;

    if (!sourceUrl) {
      return json({
        success: false,
        error: "url is required",
      }, 400);
    }

    // --------------------------------------------------
    // 1. Fetch source website
    // --------------------------------------------------

    const sourceResponse = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; UnfoldOpportunityBot/1.0)",
      },
    });

    if (!sourceResponse.ok) {
      throw new Error(
        `Source returned HTTP ${sourceResponse.status}`
      );
    }

    const sourceHtml = await sourceResponse.text();

    // --------------------------------------------------
    // 2. Discover links
    // --------------------------------------------------

    const links = extractLinks(sourceHtml, sourceUrl);

    // --------------------------------------------------
    // 3. Select likely opportunity pages
    // --------------------------------------------------

    const candidateLinks = links.filter((url) =>
      looksLikeOpportunity(url)
    );

    // Remove duplicates
    const uniqueCandidates = [...new Set(candidateLinks)].slice(0, 10);

    // --------------------------------------------------
    // 4. Fetch candidate pages
    // --------------------------------------------------

    const opportunities = [];

    for (const url of uniqueCandidates) {
      try {
        const page = await fetchOpportunityPage(url);

        if (!page) continue;

        const opportunity = extractOpportunity(
          page.html,
          url,
          sourceUrl
        );

        if (opportunity) {
          opportunities.push(opportunity);
        }
      } catch (error) {
        console.log(
          `Failed to process ${url}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return json({
      success: true,
      source: sourceUrl,
      discoveredLinks: links.length,
      candidateLinks: uniqueCandidates.length,
      opportunitiesFound: opportunities.length,
      opportunities,
    });
  } catch (error) {
    console.error(error);

    return json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    }, 500);
  }
});

// ======================================================
// Helpers
// ======================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// ------------------------------------------------------
// Extract links from HTML
// ------------------------------------------------------

function extractLinks(
  html: string,
  sourceUrl: string
): string[] {
  const links: string[] = [];

  const regex = /href\s*=\s*["']([^"']+)["']/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];

    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:")
    ) {
      continue;
    }

    try {
      const absoluteUrl = new URL(href, sourceUrl).href;

      const url = new URL(absoluteUrl);

      // Ignore assets
      const ignoredExtensions = [
        ".css",
        ".js",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".webp",
        ".ico",
        ".woff",
        ".woff2",
        ".ttf",
        ".pdf",
        ".zip",
      ];

      if (
        ignoredExtensions.some((extension) =>
          url.pathname.toLowerCase().endsWith(extension)
        )
      ) {
        continue;
      }

      links.push(absoluteUrl);
    } catch {
      // Ignore malformed URLs
    }
  }

  return [...new Set(links)];
}

// ------------------------------------------------------
// Detect likely opportunity pages
// ------------------------------------------------------

function looksLikeOpportunity(url: string): boolean {
  const value = url.toLowerCase();

  const keywords = [
    "opportunit",
    "fellowship",
    "internship",
    "intern",
    "scholarship",
    "grant",
    "vacancy",
    "recruit",
    "career",
    "job",
    "employment",
    "programme",
    "program",
    "apply",
    "application",
    "admission",
    "training",
    "workshop",
    "competition",
    "challenge",
    "award",
    "call-for",
    "call_for",
    "young-professional",
    "young_professional",
  ];

  return keywords.some((keyword) =>
    value.includes(keyword)
  );
}

// ------------------------------------------------------
// Fetch candidate page
// ------------------------------------------------------

async function fetchOpportunityPage(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; UnfoldOpportunityBot/1.0)",
    },
  });

  if (!response.ok) {
    console.log(
      `Skipping ${url}: HTTP ${response.status}`
    );

    return null;
  }

  const html = await response.text();

  if (!html || html.length < 200) {
    return null;
  }

  return {
    html,
  };
}

// ------------------------------------------------------
// Extract opportunity
// ------------------------------------------------------

function extractOpportunity(
  html: string,
  url: string,
  sourceUrl: string
) {
  const text = cleanHtml(html);

  if (!text) {
    return null;
  }

  const lowerText = text.toLowerCase();

  // --------------------------------------------------
  // Check whether this really looks like an opportunity
  // --------------------------------------------------

  const opportunitySignals = [
    "apply",
    "application",
    "eligibility",
    "deadline",
    "last date",
    "vacancy",
    "fellowship",
    "internship",
    "scholarship",
    "recruitment",
    "programme",
    "program",
    "selection",
  ];

  const signalCount = opportunitySignals.filter((signal) =>
    lowerText.includes(signal)
  ).length;

  // Too few signals = probably not an opportunity
  if (signalCount < 2) {
    return null;
  }

  // --------------------------------------------------
  // Title
  // --------------------------------------------------

  const title = extractTitle(html);

  if (!title) {
    return null;
  }

  // --------------------------------------------------
  // Description
  // --------------------------------------------------

  const description = text
    .replace(/\s+/g, " ")
    .slice(0, 3000);

  // --------------------------------------------------
  // Opportunity type
  // --------------------------------------------------

  const opportunityType =
    detectOpportunityType(lowerText);

  // --------------------------------------------------
  // Domain
  // --------------------------------------------------

  const domain = detectDomain(lowerText);

  // --------------------------------------------------
  // Deadline
  // --------------------------------------------------

  const deadline = extractDeadline(text);

  // --------------------------------------------------
  // Application URL
  // --------------------------------------------------

  const applicationUrl = extractApplicationUrl(
    html,
    url
  );

  return {
    title,
    description,

    opportunity_type: opportunityType,

    category: opportunityType,

    domain,

    subdomain: null,

    organization: extractOrganization(
      text,
      sourceUrl
    ),

    source_name: extractOrganization(
      text,
      sourceUrl
    ),

    source_url: url,

    eligibility: extractEligibility(text),

    education_levels: [],

    eligible_degrees: [],

    eligible_age_min: null,

    eligible_age_max: null,

    eligible_locations: [],

    country: "India",

    location: null,

    is_online: null,

    application_url: applicationUrl,

    application_start: null,

    application_end: deadline,

    deadline,

    funding_type: null,

    funding_amount: null,

    currency: null,

    skills: [],

    tags: [],

    verified_source: true,

    last_verified_at: new Date().toISOString(),

    status: "published",

    featured: false,

    trending_score: 0,
  };
}

// ------------------------------------------------------
// Clean HTML
// ------------------------------------------------------

function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ------------------------------------------------------
// Title
// ------------------------------------------------------

function extractTitle(html: string): string | null {
  const titleMatch = html.match(
    /<title[^>]*>([\s\S]*?)<\/title>/i
  );

  if (!titleMatch) {
    return null;
  }

  return decodeHtml(titleMatch[1])
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

// ------------------------------------------------------
// Opportunity type
// ------------------------------------------------------

function detectOpportunityType(
  text: string
): string {
  if (
    text.includes("fellowship")
  ) {
    return "fellowship";
  }

  if (
    text.includes("internship") ||
    text.includes("intern ")
  ) {
    return "internship";
  }

  if (
    text.includes("scholarship")
  ) {
    return "scholarship";
  }

  if (
    text.includes("vacancy") ||
    text.includes("recruitment") ||
    text.includes("employment")
  ) {
    return "job";
  }

  if (
    text.includes("grant")
  ) {
    return "grant";
  }

  if (
    text.includes("workshop") ||
    text.includes("training")
  ) {
    return "training";
  }

  if (
    text.includes("challenge") ||
    text.includes("competition")
  ) {
    return "competition";
  }

  if (
    text.includes("programme") ||
    text.includes("program")
  ) {
    return "program";
  }

  return "other";
}

// ------------------------------------------------------
// Domain
// ------------------------------------------------------

function detectDomain(
  text: string
): string | null {
  const domains = [
    "technology",
    "science",
    "engineering",
    "medicine",
    "health",
    "finance",
    "business",
    "law",
    "philosophy",
    "education",
    "environment",
    "agriculture",
    "public policy",
    "government",
    "defence",
    "arts",
    "design",
    "research",
    "social science",
  ];

  for (const domain of domains) {
    if (text.includes(domain)) {
      return domain;
    }
  }

  return null;
}

// ------------------------------------------------------
// Eligibility
// ------------------------------------------------------

function extractEligibility(
  text: string
): string | null {
  const lower = text.toLowerCase();

  const keywords = [
    "eligibility",
    "eligible",
    "qualification",
    "qualifications",
    "who can apply",
    "eligibility criteria",
  ];

  for (const keyword of keywords) {
    const index = lower.indexOf(keyword);

    if (index !== -1) {
      return text
        .slice(index, index + 1500)
        .trim();
    }
  }

  return null;
}

// ------------------------------------------------------
// Deadline
// ------------------------------------------------------

function extractDeadline(
  text: string
): string | null {
  const patterns = [
    /(?:last date|deadline|closing date|application closes)[^\d]{0,40}(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,

    /(?:last date|deadline|closing date|application closes)[^\d]{0,40}(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// ------------------------------------------------------
// Application URL
// ------------------------------------------------------

function extractApplicationUrl(
  html: string,
  currentUrl: string
): string | null {
  const regex =
    /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const anchorText = cleanHtml(match[2]).toLowerCase();

    if (
      anchorText.includes("apply") ||
      anchorText.includes("application") ||
      anchorText.includes("register")
    ) {
      try {
        return new URL(href, currentUrl).href;
      } catch {
        return null;
      }
    }
  }

  return null;
}

// ------------------------------------------------------
// Organization
// ------------------------------------------------------

function extractOrganization(
  text: string,
  sourceUrl: string
): string {
  try {
    const hostname = new URL(sourceUrl).hostname
      .replace(/^www\./, "");

    if (hostname.includes("niti.gov.in")) {
      return "NITI Aayog";
    }

    return hostname;
  } catch {
    return "Unknown organization";
  }
}

// ------------------------------------------------------
// Basic HTML entities
// ------------------------------------------------------

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}