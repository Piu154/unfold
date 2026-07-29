import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, Flame, Clock, SlidersHorizontal, Search } from "lucide-react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { DOMAINS, OPPORTUNITY_TYPES, useRankedOpportunities, type Filters } from "@/lib/opportunities";

export const Route = createFileRoute("/_app/discover")({
  head: () => ({
    meta: [
      { title: "Discover opportunities — Unfold" },
      { name: "description", content: "Personalized, deadline-aware opportunities from every field, ranked for you." },
      { property: "og:title", content: "Discover opportunities — Unfold" },
      { property: "og:description", content: "Hidden gems, trending calls and closing-soon deadlines, personalized." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverPage,
});

const TABS = [
  { id: "hidden", label: "Hidden Gems", icon: Sparkles },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "deadline", label: "Deadline soon", icon: Clock },
] as const;

function DiscoverPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("hidden");
  const [filters, setFilters] = useState<Filters>({});
  const [q, setQ] = useState("");

  const { ranked, isLoading, profile } = useRankedOpportunities({ ...filters, q: q || undefined });

  const list = useMemo(() => {
    const now = Date.now();
    if (tab === "hidden") return ranked.filter((r) => r.item.hidden_gem || r.reasons.length > 0).slice(0, 60);
    if (tab === "trending")
      return [...ranked].sort((a, b) => (b.item.trending_score ?? 0) - (a.item.trending_score ?? 0)).slice(0, 60);
    return ranked
      .filter((r) => r.item.deadline && new Date(r.item.deadline).getTime() > now)
      .sort((a, b) => new Date(a.item.deadline!).getTime() - new Date(b.item.deadline!).getTime())
      .slice(0, 60);
  }, [ranked, tab]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-7 animate-rise">
        <h1 className="serif text-4xl font-medium tracking-tight text-gradient">Discover</h1>
        <p className="mt-1.5 text-sm text-ink-dim">
          Rare, official opportunities from every field — ranked by what you actually care about.
        </p>
      </header>

      {/* Search + filters */}
      <div className="mb-5 grid gap-2.5 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search opportunities, organizations…"
            className="w-full rounded-xl glass py-2.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-gold/50"
          />
        </div>
        <select
          value={filters.type ?? ""}
          onChange={(e) => set({ type: e.target.value || undefined })}
          className="rounded-xl glass px-3 py-2.5 text-sm text-ink-dim outline-none focus:border-gold/50"
        >
          <option value="">All types</option>
          {OPPORTUNITY_TYPES.map((t) => (
            <option key={t} value={t} className="bg-bg">
              {t}
            </option>
          ))}
        </select>
        <select
          value={filters.domain ?? ""}
          onChange={(e) => set({ domain: e.target.value || undefined })}
          className="rounded-xl glass px-3 py-2.5 text-sm text-ink-dim outline-none focus:border-gold/50"
        >
          <option value="">All domains</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d} className="bg-bg">
              {d}
            </option>
          ))}
        </select>
        <input
          value={filters.country ?? ""}
          onChange={(e) => set({ country: e.target.value || undefined })}
          placeholder="Country"
          className="rounded-xl glass px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-gold/50"
        />
        <button
          onClick={() => set({ remote: filters.remote ? undefined : true })}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm transition ${
            filters.remote ? "border border-gold/50 bg-gold-dim text-gold" : "glass text-ink-dim hover:text-ink"
          }`}
        >
          <SlidersHorizontal size={14} /> Remote
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 inline-flex gap-1 rounded-2xl glass p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] transition ${
                active
                  ? "bg-gradient-to-r from-violet/30 to-gold/25 font-semibold text-ink glow-ring"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {profile.isEmpty && (
        <div className="mb-5 rounded-2xl glass p-4 text-sm text-ink-dim">
          Save a few opportunities and follow organizations — the feed sharpens itself with every action you take.
        </div>
      )}

      {isLoading && <p className="text-sm text-ink-dim">Aligning the constellation…</p>}

      {!isLoading && list.length === 0 && (
        <div className="rounded-2xl glass p-12 text-center">
          <p className="serif text-xl">Nothing matches yet.</p>
          <p className="mt-2 text-sm text-ink-dim">Loosen the filters, or check the Sources page for what we track.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((r, i) => (
          <OpportunityCard key={r.item.id} o={r.item} reasons={r.reasons} index={i} />
        ))}
      </div>
    </div>
  );
}
