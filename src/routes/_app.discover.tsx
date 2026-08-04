import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Unfold" },
      {
        name: "description",
        content: "Discover people, posts, sessions and opportunities.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["discover", query],

    enabled: query.trim().length > 0,

    queryFn: async () => {
      const term = query.trim();

      /*
       * ---------------------------------------------
       * PEOPLE / GUIDES
       * ---------------------------------------------
       */

      const { data: guides, error: guidesError } = await supabase
        .from("guides")
        .select("*")
        .or(
          `field.ilike.%${term}%,headline.ilike.%${term}%,bio.ilike.%${term}%`
        )
        .limit(20);

      if (guidesError) throw guidesError;

      const guideUserIds = (guides ?? []).map((g) => g.user_id);

      let profiles: any[] = [];

      if (guideUserIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url, bio")
          .in("id", guideUserIds);

        if (profileError) throw profileError;

        profiles = profileData ?? [];
      }

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const people = (guides ?? []).map((guide) => ({
        ...guide,
        profile: profileMap.get(guide.user_id) ?? null,
      }));

      /*
       * ---------------------------------------------
       * POSTS
       * ---------------------------------------------
       */

      const { data: posts, error: postsError } = await supabase
        .from("feed_posts")
        .select("*")
        .or(
          `title.ilike.%${term}%,body.ilike.%${term}%`
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      /*
       * ---------------------------------------------
       * OPPORTUNITIES
       * ---------------------------------------------
       */

      const { data: opportunities, error: opportunitiesError } =
        await supabase
          .from("opportunities")
          .select("*")
          .or(
            `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`
          )
          .order("created_at", { ascending: false })
          .limit(20);

      if (opportunitiesError) throw opportunitiesError;

      /*
       * ---------------------------------------------
       * SESSIONS
       * ---------------------------------------------
       */

      const { data: sessions, error: sessionsError } = await supabase
        .from("guide_session_types")
        .select("*")
        .or(
          `name.ilike.%${term}%,description.ilike.%${term}%`
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (sessionsError) throw sessionsError;

      return {
        people,
        posts: posts ?? [],
        opportunities: opportunities ?? [],
        sessions: sessions ?? [],
      };
    },
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const value = search.trim();

    if (!value) return;

    setQuery(value);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">

      {/* HEADER */}

      <div className="mb-6">
        <h1 className="serif text-2xl font-medium">
          Discover
        </h1>

        <p className="mt-1 text-sm text-ink-dim">
          Find people, knowledge and opportunities around what interests you.
        </p>
      </div>

      {/* SEARCH */}

      <form
        onSubmit={handleSearch}
        className="mb-8 flex gap-2"
      >
        <div className="relative flex-1">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything — economics, sports, design..."
            className="w-full rounded-xl border border-line bg-panel py-3 pl-10 pr-4 text-sm outline-none transition focus:border-gold"
          />


        </div>

        <button
          type="submit"
          className="rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-white"
        >
          Search
        </button>
      </form>

      {/* EMPTY STATE */}

      {!query && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="serif text-lg">
            What are you interested in?
          </p>

          <p className="mt-2 text-sm text-ink-dim">
            Search for a field, topic, profession, activity or anything you
            want to explore.
          </p>
        </div>
      )}

      {/* LOADING */}

      {query && isLoading && (
        <p className="text-sm text-ink-dim">
          Discovering...
        </p>
      )}

      {/* RESULTS */}

      {query && !isLoading && data && (
        <div className="space-y-8">

          {/* PEOPLE */}

          <section>
            <SectionTitle
              title="People"
              count={data.people.length}
            />

            {data.people.length === 0 ? (
              <EmptyText text="No people found." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">

                {data.people.map((guide) => (
                  <Link
                    key={guide.id}
                    to="/profile/$id"
                    params={{ id: guide.user_id }}
                    className="rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
                  >

                    <div className="flex items-center gap-3">

                      {guide.profile?.avatar_url ? (
                        <img
                          src={guide.profile.avatar_url}
                          alt=""
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-white font-semibold">
                          {(guide.profile?.display_name ?? "U")[0]}
                        </div>
                      )}

                      <div className="min-w-0">

                        <p className="flex items-center gap-1 text-sm font-semibold">
                          {guide.profile?.display_name ?? "Guide"}

                          {guide.verified && (
                            <CheckCircle2
                              size={13}
                              className="text-gold"
                            />
                          )}
                        </p>

                        <p className="text-xs text-ink-faint">
                          {guide.field}
                        </p>

                      </div>

                    </div>

                    {guide.headline && (
                      <p className="mt-3 text-xs text-ink-dim">
                        {guide.headline}
                      </p>
                    )}

                  </Link>
                ))}

              </div>
            )}
          </section>

          {/* POSTS */}

          <section>
            <SectionTitle
              title="Posts"
              count={data.posts.length}
            />

            {data.posts.length === 0 ? (
              <EmptyText text="No related posts found." />
            ) : (
              <div className="space-y-3">

                {data.posts.map((post) => (
                  <Link
                    key={post.id}
                    to="/feed"
                    className="block rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
                  >

                    {post.title && (
                      <h3 className="text-sm font-semibold">
                        {post.title}
                      </h3>
                    )}

                    {post.body && (
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ink-dim">
                        {post.body}
                      </p>
                    )}

                  </Link>
                ))}

              </div>
            )}
          </section>

          {/* SESSIONS */}

          <section>
            <SectionTitle
              title="Sessions"
              count={data.sessions.length}
            />

            {data.sessions.length === 0 ? (
              <EmptyText text="No related sessions found." />
            ) : (
              <div className="space-y-3">

                {data.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-2xl border border-line bg-panel p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <h3 className="text-sm font-semibold">
                          {session.name}
                        </h3>

                        <p className="mt-1 text-xs text-ink-faint">
                          {session.duration_minutes} minutes
                        </p>
                      </div>

                      <span className="rounded-md bg-panel-2 px-2 py-1 text-xs font-semibold">
                        {session.price_cents === 0
                          ? "Free"
                          : `$${(session.price_cents / 100).toFixed(0)}`}
                      </span>

                    </div>

                    {session.description && (
                      <p className="mt-2 text-xs text-ink-dim">
                        {session.description}
                      </p>
                    )}

                  </div>
                ))}

              </div>
            )}
          </section>

          {/* OPPORTUNITIES */}

          <section>
            <SectionTitle
              title="Opportunities"
              count={data.opportunities.length}
            />

            {data.opportunities.length === 0 ? (
              <EmptyText text="No related opportunities found." />
            ) : (
              <div className="space-y-3">

                {data.opportunities.map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    to="/opportunities/$id"
                    params={{ id: opportunity.id }}
                    className="block rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <h3 className="text-sm font-semibold">
                          {opportunity.title}
                        </h3>

                        {opportunity.organization && (
                          <p className="mt-1 text-xs text-ink-faint">
                            {opportunity.organization}
                          </p>
                        )}

                      </div>

                      {opportunity.category && (
                        <span className="rounded-md bg-gold-dim px-2 py-1 text-[10px] font-semibold text-gold">
                          {opportunity.category}
                        </span>
                      )}

                    </div>

                    {opportunity.description && (
                      <p className="mt-2 line-clamp-3 text-xs text-ink-dim">
                        {opportunity.description}
                      </p>
                    )}

                  </Link>
                ))}

              </div>
            )}
          </section>

        </div>
      )}

    </div>
  );
}

function SectionTitle({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="serif text-lg font-medium">
        {title}
      </h2>

      <span className="text-xs text-ink-faint">
        {count}
      </span>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="text-xs text-ink-faint">
        {text}
      </p>
    </div>
  );
}