import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Compass,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const { user } = useSession();

  /* ---------------------------------------------
   * PROFILE
   * --------------------------------------------- */

  const { data: profile } = useQuery({
    queryKey: ["explore-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          display_name,
          username,
          interests,
          skills,
          education,
          career_goal,
          location,
          headline
        `)
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  /* ---------------------------------------------
   * OPPORTUNITIES
   * --------------------------------------------- */

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["explore-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(
          "id, title, description, category, organization, location, deadline, featured"
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return data ?? [];
    },
  });

  /* ---------------------------------------------
   * GUIDES
   * --------------------------------------------- */

  const { data: guides = [] } = useQuery({
    queryKey: ["explore-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("id, user_id, field, verified")
        .eq("accepting_bookings", true)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;

      if (!data?.length) return [];

      const userIds = data.map((guide) => guide.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile,
        ])
      );

      return data.map((guide) => ({
        ...guide,
        profile: profileMap.get(guide.user_id) ?? null,
      }));
    },
  });

  /* ---------------------------------------------
   * PERSONALIZATION
   * --------------------------------------------- */

  const interests = profile?.interests ?? [];
  const skills = profile?.skills ?? [];

  const keywords = [
    ...interests,
    ...skills,
    profile?.education,
    profile?.career_goal,
    profile?.location,
  ]
    .filter(Boolean)
    .map((value) => value!.toString().toLowerCase().trim());

  const personalizedOpportunities = opportunities
    .map((opportunity) => {
      const text = [
        opportunity.title,
        opportunity.description,
        opportunity.category,
        opportunity.organization,
        opportunity.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matches = keywords.filter((keyword) =>
        text.includes(keyword)
      );

      return {
        ...opportunity,
        matches,
        score: matches.length,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const displayName =
    profile?.display_name ||
    profile?.username ||
    "there";

  return (
    <div className="mx-auto max-w-6xl px-4 py-7">

      {/* ============================================
          HERO
      ============================================ */}

      <section className="mb-9">

        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gold">
          Your exploration
        </p>

        <h1 className="serif text-3xl font-medium tracking-tight sm:text-4xl">
          Hello, {displayName}.
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-dim">
          There is more than one path. Explore opportunities, people,
          fields and ideas that could take you somewhere unexpected.
        </p>

      </section>

      {/* ============================================
          QUICK ACTIONS
      ============================================ */}

      <section className="mb-10">

        <div className="grid gap-3 sm:grid-cols-3">

          <QuickCard
            icon={Search}
            title="Find something"
            description="Search opportunities, people and fields."
            href="/search"
          />

          <QuickCard
            icon={Users}
            title="Meet guides"
            description="Learn from people with real experience."
            href="/guides"
          />

          <QuickCard
            icon={Bookmark}
            title="Your saved"
            description="Return to things you want to explore."
            href="/saved"
          />

        </div>

      </section>

      {/* ============================================
          YOUR INTERESTS
      ============================================ */}

      {interests.length > 0 && (
        <section className="mb-10">

          <SectionHeader
            title="What you're curious about"
            subtitle="Your interests help Unfold understand what you may want to explore."
          />

          <div className="flex flex-wrap gap-2">

            {interests.slice(0, 12).map((interest: string) => (
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
          FOR YOU
      ============================================ */}

      <section className="mb-10">

        <SectionHeader
          title="Worth exploring"
          subtitle="Opportunities that may connect with your interests and goals."
          href="/search"
          linkText="See all"
        />

        {isLoading ? (
          <Loading />
        ) : personalizedOpportunities.length === 0 ? (
          <Empty text="No opportunities available yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">

            {personalizedOpportunities.map((opportunity) => (
              <Link
                key={opportunity.id}
                to="/opportunities/$id"
                params={{ id: opportunity.id }}
                className="group rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/40"
              >

                <div className="flex items-start justify-between gap-4">

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
                    size={15}
                    className="mt-1 shrink-0 text-ink-faint transition group-hover:translate-x-1 group-hover:text-gold"
                  />

                </div>

                {opportunity.organization && (
                  <p className="mt-2 text-xs text-ink-faint">
                    {opportunity.organization}
                  </p>
                )}

                {opportunity.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-dim">
                    {opportunity.description}
                  </p>
                )}

                {opportunity.matches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">

                    {opportunity.matches
                      .slice(0, 3)
                      .map((match: string) => (
                        <span
                          key={match}
                          className="rounded-md bg-gold-dim px-2 py-0.5 text-[10px] text-gold"
                        >
                          {match}
                        </span>
                      ))}

                  </div>
                )}

              </Link>
            ))}

          </div>
        )}

      </section>

      {/* ============================================
          GUIDES
      ============================================ */}

      <section className="mb-10">

        <SectionHeader
          title="People worth discovering"
          subtitle="Guides and experts who are open to connecting."
          href="/guides"
          linkText="See all"
        />

        {guides.length === 0 ? (
          <Empty text="No guides are available yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            {guides.map((guide) => (

              <Link
                key={guide.id}
                to="/guides/$id"
                params={{ id: guide.id }}
                className="group rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-dim text-sm font-semibold text-gold">
                    {getInitials(
                      guide.profile?.display_name
                    )}
                  </div>

                  <div className="min-w-0">

                    <div className="flex items-center gap-1">

                      <p className="truncate text-sm font-semibold group-hover:text-gold">
                        {guide.profile?.display_name ||
                          "Guide"}
                      </p>

                      {guide.verified && (
                        <span className="text-[10px] text-gold">
                          ✓
                        </span>
                      )}

                    </div>

                    {guide.field && (
                      <p className="mt-0.5 truncate text-xs text-ink-faint">
                        {guide.field}
                      </p>
                    )}

                  </div>

                </div>

              </Link>

            ))}

          </div>
        )}

      </section>

      {/* ============================================
          DISCOVER SOMETHING UNEXPECTED
      ============================================ */}

      <section className="rounded-2xl border border-line bg-panel p-6">

        <div className="flex items-start gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
            <Sparkles size={18} />
          </div>

          <div className="flex-1">

            <h2 className="serif text-lg font-medium">
              Don't know what to look for?
            </h2>

            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-dim">
              That's okay. You don't have to know your destination
              before you start exploring.
            </p>

            <Link
              to="/discover"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:underline"
            >
              Discover something unexpected
              <ArrowRight size={13} />
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}

/* =====================================================
   QUICK CARD
===================================================== */

function QuickCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Search;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
    >

      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-panel-2 text-ink-dim group-hover:text-gold">
        <Icon size={17} />
      </div>

      <h3 className="text-sm font-semibold group-hover:text-gold">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-relaxed text-ink-dim">
        {description}
      </p>

    </Link>
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
   HELPERS
===================================================== */

function getInitials(
  name: string | null | undefined
) {
  if (!name) return "U";

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Loading() {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <p className="text-sm text-ink-dim">
        Loading...
      </p>
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <p className="text-sm text-ink-faint">
        {text}
      </p>
    </div>
  );
}