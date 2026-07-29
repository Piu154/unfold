import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const KINDS = [
  "all",
  "fellowship",
  "competition",
  "research",
  "internship",
  "scholarship",
  "grant",
  "residency",
  "bootcamp",
  "other",
] as const;

const searchSchema = z.object({
  q: z.string().optional(),
  kind: z.enum(KINDS).optional(),
});

export const Route = createFileRoute("/_app/search")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Search — Unfold" }] }),
  component: SearchPage,
});

function SearchPage() {
  const s = Route.useSearch();
  const nav = Route.useNavigate();

  const [q, setQ] = useState(s.q ?? "");
  const kind = s.kind ?? "all";

  /* -----------------------------
     SEARCH OPPORTUNITIES
  ----------------------------- */

  const {
    data: opportunities,
    isLoading: opportunitiesLoading,
  } = useQuery({
    queryKey: ["search-opportunities", s.q, kind],

    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (s.q) {
        query = query.or(
          `title.ilike.%${s.q}%,summary.ilike.%${s.q}%,field.ilike.%${s.q}%,organization.ilike.%${s.q}%`
        );
      }

      if (kind !== "all") {
        query = query.eq("kind", kind);
      }

      const { data, error } = await query.limit(60);

      if (error) throw error;

      return data ?? [];
    },
  });

  /* -----------------------------
     SEARCH GUIDES / PEOPLE
  ----------------------------- */

  const { data: guides, isLoading: guidesLoading } = useQuery({
    queryKey: ["search-guides", s.q],

    enabled: !!s.q?.trim(),

    queryFn: async () => {
      const search = s.q!.trim();

      // Search guide information first
      const { data, error } = await supabase
        .from("guides")
        .select(`
          id,
          user_id,
          headline,
          bio,
          field,
          affiliations,
          verified,
          accepting_bookings,
          profiles:user_id (
            display_name,
            username,
            avatar_url
          )
        `)
        .or(
          `headline.ilike.%${search}%,bio.ilike.%${search}%,field.ilike.%${search}%`
        )
        .limit(30);

      if (error) throw error;

      return data ?? [];
    },
  });

  /* -----------------------------
     SEARCH SUBMIT
  ----------------------------- */

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    nav({
      search: (p: z.infer<typeof searchSchema>) => ({
        ...p,
        q: q.trim() || undefined,
      }),
    });
  };

  const searching = opportunitiesLoading || guidesLoading;

  const hasOpportunities =
    !!opportunities && opportunities.length > 0;

  const hasGuides =
    !!guides && guides.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">

      {/* HEADER */}

      <h1 className="serif mb-4 text-2xl font-medium">
        Search
      </h1>

      {/* SEARCH */}

      <form
        onSubmit={submit}
        className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2.5"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, fields, opportunities..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
        />

        <button className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-white">
          Search
        </button>
      </form>

      {/* OPPORTUNITY FILTERS */}

      <div className="mb-6 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() =>
              nav({
                search: (
                  p: z.infer<typeof searchSchema>
                ) => ({
                  ...p,
                  kind: k === "all" ? undefined : k,
                }),
              })
            }
            className={`rounded-full border px-3 py-1.5 text-[11.5px] capitalize ${
              kind === k
                ? "border-gold bg-gold-dim text-gold"
                : "border-line text-ink-dim hover:border-gold/40"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* LOADING */}

      {searching && (
        <p className="mb-5 text-sm text-ink-dim">
          Searching...
        </p>
      )}

      {/* =========================
          GUIDES / PEOPLE
      ========================= */}

      {s.q && (
        <section className="mb-8">

          <div className="mb-3 flex items-center justify-between">
            <h2 className="serif text-xl font-medium">
              People & Guides
            </h2>

            {hasGuides && (
              <span className="text-xs text-ink-faint">
                {guides.length} found
              </span>
            )}
          </div>

          {!guidesLoading && !hasGuides && (
            <div className="rounded-2xl border border-line bg-panel p-6">
              <p className="text-sm text-ink-dim">
                No guides found for "{s.q}".
              </p>
            </div>
          )}

          <div className="space-y-3">

            {guides?.map((guide) => {

              const profile = Array.isArray(guide.profiles)
                ? guide.profiles[0]
                : guide.profiles;

              return (
                <Link
                  key={guide.id}
                  to="/guides/$id"
                  params={{ id: guide.id }}
                  className="block rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
                >

                  <div className="flex gap-3">

                    {/* AVATAR */}

                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-dim text-sm font-semibold text-gold">
                        {(
                          profile?.display_name ||
                          profile?.username ||
                          "G"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    {/* GUIDE INFO */}

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center gap-2">

                        <h3 className="text-sm font-semibold">
                          {profile?.display_name ||
                            profile?.username ||
                            "Guide"}
                        </h3>

                        {guide.verified && (
                          <span className="text-[10px] text-gold">
                            ✓ Verified
                          </span>
                        )}

                      </div>

                      <p className="text-xs text-ink-dim">
                        {guide.headline}
                      </p>

                      <p className="mt-1 text-[11px] text-ink-faint">
                        {guide.field}
                      </p>

                      {guide.bio && (
                        <p className="mt-2 line-clamp-2 text-xs text-ink-dim">
                          {guide.bio}
                        </p>
                      )}

                    </div>

                  </div>

                </Link>
              );
            })}

          </div>
        </section>
      )}

      {/* =========================
          OPPORTUNITIES
      ========================= */}

      <section>

        <div className="mb-3 flex items-center justify-between">

          <h2 className="serif text-xl font-medium">
            Opportunities
          </h2>

          {hasOpportunities && (
            <span className="text-xs text-ink-faint">
              {opportunities.length} found
            </span>
          )}

        </div>

        {!opportunitiesLoading && !hasOpportunities && (
          <div className="rounded-2xl border border-line bg-panel p-10 text-center">
            <p className="serif text-lg">
              Nothing matched.
            </p>

            <p className="mt-2 text-sm text-ink-dim">
              Try a broader query.
            </p>
          </div>
        )}

        <div className="space-y-3">

          {opportunities?.map((o) => (

            <Link
              key={o.id}
              to="/opportunities/$id"
              params={{ id: o.id }}
              className="block rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/40"
            >

              <div className="mb-2 flex items-center justify-between">

                <span className="mono rounded-md border border-gold/30 bg-gold-dim px-2 py-0.5 text-[9.5px] uppercase text-gold">
                  {o.kind}
                </span>

                {o.deadline && (
                  <span className="mono text-[10.5px] text-danger">
                    {formatDistanceToNow(
                      new Date(o.deadline),
                      { addSuffix: true }
                    )}
                  </span>
                )}

              </div>

              <h3 className="serif text-base font-medium">
                {o.title}
              </h3>

              <p className="text-[11.5px] text-ink-faint">
                {o.organization} · {o.field}
                {o.location ? ` · ${o.location}` : ""}
              </p>

              <p className="mt-2 line-clamp-2 text-sm text-ink-dim">
                {o.summary}
              </p>

            </Link>

          ))}

        </div>

      </section>

    </div>
  );
}