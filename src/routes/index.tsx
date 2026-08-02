import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { HiddenOpportunityGlobe } from "../components/ui/HiddenOpportunityGlobe";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unfold — The hidden opportunity platform" },
      { name: "description", content: "Not a job board. Unfold surfaces fellowships, research labs, competitions and mentors school never introduces you to — and lets guides and schools get discovered too." },
      { property: "og:title", content: "Unfold — a living discovery universe" },
      { property: "og:description", content: "Discover the opportunities before you realize they existed." },
    ],
  }),
  component: Landing,
});

const TRY_QUERIES = [
  "I love biology and puzzles",
  "make my hometown better",
  "space + music",
  "a career that doesn't have a name yet",
];

const FIELDS = [
  "Biology", "AI / ML", "Design", "Public Policy", "Neuroscience",
  "Robotics", "Climate", "Journalism", "Economics", "Music",
  "Mathematics", "Architecture",
];

const NUMBERED = [
  ["01", "Fellowships & residencies", "outside your country and inside underexplored towns."],
  ["02", "Research labs", "hiring undergrads for real work — with stipends."],
  ["03", "Competitions", "with real prize pools, jobs and grants attached."],
  ["04", "Micro-grants", "for weird ideas, side projects and civic experiments."],
  ["05", "One-of-one mentors", "who did the thing before you knew it existed."],
  ["06", "Emerging fields", "and roles that don't have a formal degree yet."],
];

const WAYS = [
  {
    tag: "01 / SEARCH",
    title: "Explore by curiosity",
    items: ["Type a feeling, not a keyword", "Get living, ranked results", "Save what makes you lean forward"],
  },
  {
    tag: "02 / GUIDES",
    title: "Talk to a human",
    items: ["Book a 30-minute session", "With people who did the path", "No LinkedIn cold DMs, no gate"],
  },
  {
    tag: "03 / HIDDEN",
    title: "Surface the hidden",
    items: ["Under-applied opportunities", "Non-obvious degrees & orgs", "The internet's long tail"],
  },
];

const AUDIENCES = [
  {
    tag: "EXPLORER",
    title: "Find doors you didn't know existed.",
    body: "This isn't a job board. Uncover hidden fellowships, research labs, competitions and micro-grants — then pick a real guide to learn from directly instead of applying and waiting.",
  },
  {
    tag: "GUIDE / EXPERT",
    title: "Get found for what you know.",
    body: "List your experience once and become discoverable — to explorers looking for guidance, and to schools looking for someone to lead a seminar or workshop.",
  },
  {
    tag: "SCHOOL / COLLEGE",
    title: "Hire the right expert for your students.",
    body: "Browse guides and domain experts across fields and bring them in directly for seminars, workshops or mentorship — real-world knowledge beyond the textbook.",
  },
];

// ─────────────────────────────────────────────────────────
// Role switcher content. Swap the ctaTo routes below for
// your actual guide-signup / school-hire pages if these
// placeholder routes don't exist in your router yet.
// ─────────────────────────────────────────────────────────
type Role = "explorer" | "guide" | "school";

const HERO_CONTENT: Record<
  Role,
  {
    pill: string;
    headline: React.ReactNode;
    sub: string;
    showSearch: boolean;
    ctaLabel: string;
    ctaTo: string;
  }
> = {
  explorer: {
    pill: "I'm exploring",
    headline: (
      <>
        Discover the opportunities
        <br />
        <em className="font-normal not-italic text-ink-dim italic">before you realize they existed.</em>
      </>
    ),
    sub: "Not a job board. Uncover hidden fellowships, research labs, competitions, micro-grants and mentors school never introduces you to — then pick a real guide to learn from directly.",
    showSearch: true,
    ctaLabel: "Start exploring",
    ctaTo: "/feed",
  },
  guide: {
    pill: "I'm a guide",
    headline: (
      <>
        Get found
        <br />
        <em className="font-normal not-italic text-ink-dim italic">for what you know.</em>
      </>
    ),
    sub: "List your experience once and become discoverable — to explorers looking for real guidance, and to schools looking for someone to lead a seminar or workshop.",
    showSearch: false,
    ctaLabel: "List yourself as a guide",
    ctaTo: "/guides/apply",
  },
  school: {
    pill: "I'm a school or college",
    headline: (
      <>
        Hire the right expert
        <br />
        <em className="font-normal not-italic text-ink-dim italic">for your students.</em>
      </>
    ),
    sub: "Browse guides and domain experts across every field and bring them in directly for seminars, workshops or mentorship — real-world knowledge beyond the textbook. No job listings, no recruiters.",
    showSearch: false,
    ctaLabel: "Browse experts to hire",
    ctaTo: "/guides",
  },
};

function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role>("explorer");

  const go = (q?: string) => {
    const target = (q ?? query).trim();
    navigate({ to: "/search", search: { q: target || undefined } });
  };

  const hero = HERO_CONTENT[role];

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/85 px-[5vw] py-4 backdrop-blur">
        <Logo />
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-xs font-medium text-ink-dim hover:text-ink" >Sign in</Link>
          <Link
            to="/feed"
            className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            style={{
              color:"#1c1919"
            }}
          >
            Start exploring
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-[5vw] pb-8 pt-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[10.5px] uppercase tracking-wider text-ink-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-sage" />
          The hidden opportunity platform
        </span>

        {/* Role switcher — pick who you are, hero content changes below */}
        <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-2">
          {(Object.keys(HERO_CONTENT) as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full border px-3.5 py-1.5 text-[11.5px] font-medium transition ${
                role === r
                  ? "border-gold bg-gold text-white"
                  : "border-line text-ink-dim hover:border-gold hover:text-gold"
              }`}
              style={role === r ? { color: "#1c1919" } : undefined}
            >
              {HERO_CONTENT[r].pill}
            </button>
          ))}
        </div>

        <h1 className="serif mx-auto mt-6 max-w-3xl text-4xl font-medium leading-[1.18] tracking-tight sm:text-5xl">
          {hero.headline}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-ink-dim">
          {hero.sub}
        </p>

        {hero.showSearch ? (
          <>
            <div className="mx-auto mt-7 flex max-w-md items-center gap-2 rounded-2xl border border-line bg-panel p-3">
              <input
                className="flex-1 bg-transparent px-2 text-[13.5px] text-ink outline-none placeholder:italic placeholder:text-ink-faint"
                style={{ fontFamily: "var(--font-serif)" }}
                placeholder="what makes you lose track of time?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && go()}
              />
              <button
                onClick={() => go()}
                className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white"
                 style={{
                  color:"#1c1919"
                }}
              >
                Discover →
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10.5px] text-ink-faint">try:</span>
              {TRY_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuery(q); go(q); }}
                  className="rounded-full border border-line px-3 py-1.5 text-[11.5px] text-ink-dim hover:border-gold hover:text-gold"
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mx-auto mt-7">
            <Link
              to={hero.ctaTo}
              className="inline-block rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-white hover:opacity-90"
              style={{ color: "#1c1919" }}
            >
              {hero.ctaLabel}
            </Link>
          </div>
        )}
      </section>

      {/* Globe */}
      <div className="px-[5vw]">
        <HiddenOpportunityGlobe />
      </div>

      {/* Who it's for */}
      <section className="border-t border-line px-[5vw] py-14">
        <div className="mx-auto max-w-5xl">
          <p className="mono mb-3 flex items-center gap-2 text-[10.5px] text-ink-faint">
            <span className="text-gold">·</span> WHO UNFOLD IS FOR
            <span className="ml-2 h-px flex-1 bg-line" />
          </p>
          <h2 className="serif max-w-xl text-[26px] font-medium leading-tight">
            Different people, <em className="italic text-ink-dim">different doors.</em>
          </h2>
          <div className="mt-8 grid gap-3.5 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.tag} className="rounded-2xl border border-line p-5">
                <p className="mono mb-2 text-[10px] uppercase tracking-wider text-gold">{a.tag}</p>
                <h3 className="serif mb-2 text-[16px] font-medium">{a.title}</h3>
                <p className="text-[12.5px] leading-relaxed text-ink-dim">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fields */}
      <section className="border-t border-line px-[5vw] py-14">
        <div className="mx-auto max-w-5xl">
          <p className="mono mb-3 flex items-center gap-2 text-[10.5px] text-ink-faint">
            <span className="text-gold">01</span> BROWSE BY FIELD
            <span className="ml-2 h-px flex-1 bg-line" />
          </p>
          <h2 className="serif max-w-xl text-[26px] font-medium leading-tight">
            Or start from a curiosity <em className="italic text-ink-dim">you already know.</em>
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <button
                key={f}
                onClick={() => navigate({ to: "/search", search: { q: f } })}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-3 text-left text-xs text-ink-dim transition hover:border-gold hover:text-gold"
              >
                {f}
                <span className="ml-auto text-[11px] text-ink-faint">→</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Numbered list */}
      <section className="border-t border-line px-[5vw] py-14">
        <div className="mx-auto max-w-5xl">
          <p className="mono mb-3 flex items-center gap-2 text-[10.5px] text-ink-faint">
            <span className="text-gold">02</span> WHAT LIVES HERE
            <span className="ml-2 h-px flex-1 bg-line" />
          </p>
          <h2 className="serif max-w-xl text-[26px] font-medium leading-tight">
            Six kinds of doors <em className="italic text-ink-dim">school forgets to mention.</em>
          </h2>
          <ul className="mt-8 grid gap-x-10 sm:grid-cols-2">
            {NUMBERED.map(([n, title, sub]) => (
              <li key={n} className="flex gap-3 border-b border-line py-3.5 text-sm text-ink-dim">
                <span className="mono pt-1 text-[10.5px] text-gold">{n}</span>
                <span><b className="font-medium text-ink">{title}</b> — {sub}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Ways */}
      <section className="border-t border-line px-[5vw] py-14">
        <div className="mx-auto max-w-5xl">
          <p className="mono mb-3 flex items-center gap-2 text-[10.5px] text-ink-faint">
            <span className="text-gold">03</span> THREE WAYS IN
            <span className="ml-2 h-px flex-1 bg-line" />
          </p>
          <h2 className="serif max-w-xl text-[26px] font-medium leading-tight">
            However you want to <em className="italic text-ink-dim">start unfolding.</em>
          </h2>
          <div className="mt-8 grid gap-3.5 md:grid-cols-3">
            {WAYS.map((w) => (
              <div key={w.tag} className="rounded-2xl border border-line p-5">
                <p className="mono mb-2 text-[10px] uppercase text-ink-faint">{w.tag}</p>
                <h3 className="serif mb-3 text-[17px] font-medium">{w.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {w.items.map((i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] text-ink-dim">
                      <span className="text-gold">·</span>{i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="border-t border-line px-6 py-16 text-center">
        <h2 className="serif mx-auto max-w-xl text-[25px] font-medium leading-snug">
          The internet is a library, <em className="italic text-ink-dim">but nobody handed you the map.</em>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-ink-dim">
          Unfold is that map — for explorers hunting hidden doors, guides ready to be
          found, and schools looking for the right expert to bring in.
        </p>
        <p className="mt-6 text-sm">
          Ready? <b className="font-medium text-gold">Find your door, or open one for someone else.</b>
        </p>
        <Link
          to="/feed"
          className="mt-5 inline-block rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-white hover:opacity-90"
          style={{
              color:"#1c1919"
            }}
        >
          Start exploring
        </Link>
      </section>

      <footer className="border-t border-line px-[5vw] py-8 text-center text-[11px] text-ink-faint">
        © {new Date().getFullYear()} Unfold. Built for the curious.
      </footer>
    </div>
  );
}