import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExtractedOpportunity = {
  title: string;
  organization: string;
  kind: string;
  field: string;
  summary: string;
  description: string;
  location: string;
  stipend: string;
  deadline: string; // YYYY-MM-DD or ""
  url: string;
  tags: string[];
  hidden_gem: boolean;
  confidence: number;
};

const KINDS = [
  "fellowship",
  "competition",
  "research",
  "internship",
  "scholarship",
  "grant",
  "residency",
  "bootcamp",
  "other",
];

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14000);
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned) as T;
}

/** Admin-only: read an official page and turn it into a structured opportunity draft. */
export const extractOpportunityFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { url: string }) => {
    const u = new URL(input.url);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("Only http(s) URLs");
    return { url: u.toString() };
  })
  .handler(async ({ data, context }): Promise<ExtractedOpportunity> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const res = await fetch(data.url, {
      headers: { "user-agent": "UnfoldBot/1.0 (+opportunity indexing)" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Could not fetch page (${res.status})`);
    const text = htmlToText(await res.text());
    if (text.length < 200) throw new Error("That page had almost no readable text");

    const { data: topics } = await context.supabase.from("topics").select("slug");
    const slugs = (topics ?? []).map((t) => t.slug);

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const { text: out } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      prompt: `You extract student/early-career opportunities from official web pages.

Page URL: ${data.url}
Page text:
"""${text}"""

Return ONLY JSON with exactly these keys:
{"title":"","organization":"","kind":"","field":"","summary":"","description":"","location":"","stipend":"","deadline":"","url":"","tags":[],"hidden_gem":false,"confidence":0}

Rules:
- kind must be one of: ${KINDS.join(", ")}.
- tags must be 2-5 slugs chosen ONLY from this list: ${slugs.join(", ")}.
- field is a short human-readable subject (e.g. "Marine biology").
- summary is one sentence, max 160 chars. description is 2-5 sentences of plain text.
- deadline is YYYY-MM-DD if a clear application deadline exists, otherwise "".
- url is the direct application/details link, defaulting to the page URL.
- hidden_gem = true only if this looks genuinely under-applied (niche, small, little publicity).
- confidence is 0-1: how sure you are that this page really describes one concrete opportunity.
- Use "" for anything you cannot find. Never invent facts.`,
    });

    const parsed = parseJson<ExtractedOpportunity>(out);
    return {
      title: parsed.title ?? "",
      organization: parsed.organization ?? "",
      kind: KINDS.includes(parsed.kind) ? parsed.kind : "other",
      field: parsed.field ?? "",
      summary: parsed.summary ?? "",
      description: parsed.description ?? "",
      location: parsed.location ?? "",
      stipend: parsed.stipend ?? "",
      deadline: /^\d{4}-\d{2}-\d{2}$/.test(parsed.deadline ?? "") ? parsed.deadline : "",
      url: parsed.url || data.url,
      tags: (parsed.tags ?? []).filter((t) => slugs.includes(t)).slice(0, 5),
      hidden_gem: !!parsed.hidden_gem,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    };
  });

/** Any signed-in user: check a post/submission is on-topic for this site before publishing. */
export const screenContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; kind: "post" | "opportunity" }) => {
    const t = (input.text ?? "").trim();
    if (t.length < 5) throw new Error("Too short to publish");
    return { text: t.slice(0, 6000), kind: input.kind };
  })
  .handler(async ({ data }): Promise<{ allowed: boolean; reason: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { allowed: true, reason: "" };

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const { text: out } = await generateText({
      model: gateway("google/gemini-3.1-flash-lite"),
      prompt: `Unfold is a platform where students discover academic and career opportunities (fellowships, research, competitions, scholarships, grants, internships, residencies) and get guidance from mentors.

Decide if this ${data.kind} belongs on Unfold.

Allow: opportunity announcements, application advice, research/field insight, mentorship offers, study/career guidance, event or deadline notices.
Reject: unrelated personal/lifestyle content, ads or dropshipping, crypto/gambling/adult content, hate or harassment, scams, paid-essay or exam-cheating services, pure spam.

Content:
"""${data.text}"""

Return ONLY JSON: {"allowed": true|false, "reason": "one short sentence"}`,
    });

    try {
      const parsed = parseJson<{ allowed: boolean; reason: string }>(out);
      return { allowed: !!parsed.allowed, reason: parsed.reason ?? "" };
    } catch {
      return { allowed: true, reason: "" };
    }
  });
