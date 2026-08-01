import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Compass,
  Users,
  Rss,
  Search,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Unfold" },
      {
        name: "description",
        content:
          "Discover people, ideas, conversations and opportunities around what interests you.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { user } = useSession();

  /* ---------------------------------------------
   * PROFILE
   * --------------------------------------------- */

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["discover-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username, interests")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  /* ---------------------------------------------
   * RECENT OPPORTUNITIES
   *
   * Discover only shows a small overview.
   * Full searching stays on /search.
   * --------------------------------------------- */

  const { data: opportunities = [], isLoading: opportunitiesLoading } =
    useQuery({
      queryKey: ["discover-opportunities"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("opportunities")
          .select(
            "id, title, description, category, organization, location, deadline, featured"
          )
          .order("created_at", { ascending: false })
          .limit(4);

        if (error) throw error;

        return data ?? [];
      },
    });

  /* ---------------------------------------------
   * RECENT POSTS
   * --------------------------------------------- */

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["discover-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      return data ?? [];
    },
  });

  const displayName =
    profile?.display_name ||
    profile?.username ||
    "there";

  const interests = profile?.interests ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-7">

      {/* ============================================
          HERO
      ============================================ */}

      <section className="mb-8">

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold">
          Discover
        </p>

        <h1 className="serif text-3xl font-medium tracking-tight sm:text-4xl">
          Hello, {displayName}.
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-dim">
          Explore people, ideas, conversations and opportunities that might
          take you somewhere unexpected.
        </p>

      </section>

      {/* ============================================
          QUICK SEARCH
          Small entry point — actual search stays /search
      ============================================ */}

      <Link
        to="/search"
        className="mb-8 flex max-w-3xl items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3.5 transition hover:border-gold/40"
      >
        <Search size={17} className="text-ink-faint" />

        <span className="flex-1 text-sm text-ink-faint">
          Search people, fields, opportunities...
        </span>

        <span className="hidden text-xs text-gold sm:block">
          Explore
        </span>

        <ArrowRight size={15} className="text-ink-faint" />
      </Link>

      {/* ============================================
          YOUR INTERESTS
      ============================================ */}

      {!profileLoading && interests.length > 0 && (
        <section className="mb-9">

          <SectionHeader
            title="Your interests"
            subtitle="Things you've told Unfold you're curious about."
          />

          <div className="flex flex-wrap gap-2">
            {interests.slice(0, 10).map((interest: string) => (
              <span
                key={interest}
                className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs text-ink-dim"
              >
                {interest}
              </span>
            ))}
          </div>

        </section>
      )}

      {/* ============================================
          EXPLORE UNFOLD
      ============================================ */}

      <section className="mb-10">

        <SectionHeader
          title="Explore Unfold"
          subtitle="Start wherever your curiosity takes you."
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <ExploreCard
            icon={Users}
            title="People & Guides"
            description="Discover people sharing knowledge and experience."
            href="/guides"
          />

          <ExploreCard
            icon={Rss}
            title="Feed"
            description="See what people are sharing and discussing."
            href="/feed"
          />

          <ExploreCard
            icon={Compass}
            title="Search"
            description="Search across fields, people and opportunities."
            href="/search"
          />

          <ExploreCard
            icon={Bookmark}
            title="Saved"
            description="Come back to things you want to explore later."
            href="/saved"
          />

        </div>

      </section>

      {/* ============================================
          LATEST OPPORTUNITIES
      ============================================ */}

      <section className="mb-10">

        <SectionHeader
          title="Latest opportunities"
          subtitle="A few things worth looking at."
          href="/search"
          linkText="Explore all"
        />

        {opportunitiesLoading ? (
          <LoadingText />
        ) : opportunities.length === 0 ? (
          <EmptyText text="No opportunities available yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">

            {opportunities.map((opportunity) => (
              <Link
                key={opportunity.id}
                to="/opportunities/$id"
                params={{ id: opportunity.id }}
                className="group rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
              >

                <div className="mb-2 flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    {opportunity.category && (
                      <span className="mb-2 inline-block rounded-md bg-gold-dim px-2 py-1 text-[10px] font-medium text-gold">
                        {opportunity.category}
                      </span>
                    )}

                    <h3 className="text-sm font-semibold group-hover:text-gold">
                      {opportunity.title}
                    </h3>

                  </div>

                  <ArrowRight
                    size={14}
                    className="mt-1 shrink-0 text-ink-faint transition group-hover:translate-x-1 group-hover:text-gold"
                  />

                </div>

                {opportunity.organization && (
                  <p className="text-xs text-ink-faint">
                    {opportunity.organization}
                  </p>
                )}

                {opportunity.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-dim">
                    {opportunity.description}
                  </p>
                )}

                {opportunity.location && (
                  <p className="mt-3 text-[11px] text-ink-faint">
                    {opportunity.location}
                  </p>
                )}

              </Link>
            ))}

          </div>
        )}

      </section>

      {/* ============================================
          FROM THE COMMUNITY
      ============================================ */}

      <section className="mb-10">

        <SectionHeader
          title="From the community"
          subtitle="Recent things people are sharing."
          href="/feed"
          linkText="Open feed"
        />

        {postsLoading ? (
          <LoadingText />
        ) : posts.length === 0 ? (
          <EmptyText text="Nothing has been shared yet." />
        ) : (
          <div className="space-y-3">

            {posts.map((post: any) => (
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
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-dim">
                    {post.body}
                  </p>
                )}

              </Link>
            ))}

          </div>
        )}

      </section>

      {/* ============================================
          BOTTOM MESSAGE
      ============================================ */}

      <section className="rounded-2xl border border-line bg-panel p-6">

        <div className="flex items-start gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
            <Sparkles size={18} />
          </div>

          <div>

            <h2 className="serif text-lg font-medium">
              There is more than one path.
            </h2>

            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-dim">
              Follow people, explore different fields, read what others are
              sharing, and discover possibilities you might not have searched
              for yourself.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}

/* =====================================================
   SECTION HEADER
===================================================== */

function SectionHeader({
  title,
  subtitle,
  href,
  linkText,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">

      <div>

        <h2 className="serif text-xl font-medium">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-xs text-ink-faint">
            {subtitle}
          </p>
        )}

      </div>

      {href && linkText && (
        <Link
          to={href}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-gold hover:underline"
        >
          {linkText}
          <ArrowRight size={13} />
        </Link>
      )}

    </div>
  );
}

/* =====================================================
   EXPLORE CARD
===================================================== */

function ExploreCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
    >

      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-panel-2 text-ink-dim transition group-hover:text-gold">
        <Icon size={17} />
      </div>

      <h3 className="text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">
        {description}
      </p>

    </Link>
  );
}

/* =====================================================
   EMPTY / LOADING
===================================================== */

function LoadingText() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <p className="text-sm text-ink-dim">
        Loading...
      </p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <p className="text-sm text-ink-faint">
        {text}
      </p>
    </div>
  );
}