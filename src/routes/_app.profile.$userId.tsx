import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Grid3x3,
  Play,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_app/profile/$userId")({
  head: () => ({
    meta: [{ title: "Profile — Unfold" }],
  }),
  component: ProfilePage,
});

function initials(name: string | null | undefined) {
  if (!name) return "U";

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function ProfilePage() {
  const { userId } = Route.useParams();

  // ---------------------------------------
  // PROFILE
  // ---------------------------------------

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  // ---------------------------------------
  // POSTS
  // ---------------------------------------

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["profile-posts", userId],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  // ---------------------------------------
  // GUIDE
  // ---------------------------------------

  const { data: guide, isLoading: guideLoading } = useQuery({
    queryKey: ["profile-guide", userId],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  // ---------------------------------------
  // GUIDE SESSION TYPES
  // Only loaded if this person is a guide
  // ---------------------------------------

  const { data: sessions } = useQuery({
    queryKey: ["profile-guide-sessions", guide?.id],

    enabled: !!guide?.id,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_session_types")
        .select("*")
        .eq("guide_id", guide!.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });

  // ---------------------------------------
  // FOLLOWERS
  // ---------------------------------------

  const { data: followers } = useQuery({
    queryKey: ["profile-followers", guide?.id],

    enabled: !!guide?.id,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("guide_id", guide!.id);

      if (error) throw error;

      return data ?? [];
    },
  });

  // ---------------------------------------
  // LOADING
  // ---------------------------------------

  if (profileLoading || guideLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-sm text-ink-dim">Loading profile...</p>
      </div>
    );
  }

  // ---------------------------------------
  // USER NOT FOUND
  // ---------------------------------------

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="serif text-xl text-ink">
            Profile not found
          </p>

          <p className="mt-2 text-sm text-ink-dim">
            This profile may no longer exist.
          </p>

          <Link
            to="/feed"
            className="mt-5 inline-block rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white"
          >
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name ?? "Unnamed";

  const postCount = posts?.length ?? 0;

  const followerCount = followers?.length ?? 0;

  const isGuide = !!guide;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      {/* =====================================
          PROFILE HEADER
      ====================================== */}

      <div className="mb-6">

        <div className="flex items-center gap-5">

          {/* Avatar */}

          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-panel-2"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gold text-3xl font-semibold text-white ring-4 ring-panel-2">
              {initials(displayName)}
            </div>
          )}

          {/* Stats */}

          <div className="flex-1">

            <h1 className="serif text-xl font-semibold text-ink">
              {displayName}
            </h1>

            {profile.username && (
              <p className="mt-0.5 text-xs text-ink-faint">
                @{profile.username}
              </p>
            )}

            <div className="mt-4 flex gap-6">

              <div>
                <p className="text-sm font-semibold text-ink">
                  {postCount}
                </p>

                <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                  Posts
                </p>
              </div>

              {isGuide && (
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {followerCount}
                  </p>

                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                    Followers
                  </p>
                </div>
              )}

              {isGuide && (
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {sessions?.length ?? 0}
                  </p>

                  <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                    Sessions
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* =====================================
            BIO
        ====================================== */}

        <div className="mt-4">

          <div className="flex items-center gap-1.5">

            <p className="text-sm font-semibold text-ink">
              {displayName}
            </p>

            {guide?.verified && (
              <CheckCircle2
                size={14}
                className="text-gold"
              />
            )}

            {isGuide && (
              <span className="rounded-md bg-gold-dim px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                Guide
              </span>
            )}

          </div>

          {profile.bio && (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">
              {profile.bio}
            </p>
          )}

        </div>

        {/* =====================================
            GUIDE INFORMATION
            Only appears for guides
        ====================================== */}

        {isGuide && (
          <div className="mt-4 rounded-xl border border-line bg-panel p-4">

            <div className="flex items-center gap-2">

              <span className="rounded-md bg-gold-dim px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
                {guide.field}
              </span>

              {guide.verified && (
                <span className="flex items-center gap-1 text-[10px] text-gold">
                  <CheckCircle2 size={12} />
                  Verified
                </span>
              )}

            </div>

            {guide.headline && (
              <p className="serif mt-3 text-base font-semibold text-ink">
                {guide.headline}
              </p>
            )}

            {guide.bio && (
              <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                {guide.bio}
              </p>
            )}

            {guide.affiliations &&
              guide.affiliations.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">

                  {guide.affiliations.map((item: string) => (
                    <span
                      key={item}
                      className="rounded-full bg-panel-2 px-2.5 py-1 text-[10px] text-ink-dim"
                    >
                      {item}
                    </span>
                  ))}

                </div>
              )}
          </div>
        )}

      </div>

      {/* =====================================
          GUIDE SESSIONS
          Only appears for guides
      ====================================== */}

      {isGuide && sessions && sessions.length > 0 && (
        <section className="mb-6">

          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={15} className="text-gold" />

            <h2 className="text-sm font-semibold text-ink">
              Sessions
            </h2>
          </div>

          <div className="space-y-2">

            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-line bg-panel p-4"
              >

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {session.name}
                    </p>

                    {session.description && (
                      <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                        {session.description}
                      </p>
                    )}
                  </div>

                  <span className="shrink-0 rounded-md bg-panel-2 px-2 py-1 text-[10px] text-ink-dim">
                    {session.duration_minutes} min
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <p className="text-xs font-semibold text-ink">
                    {session.price_cents === 0
                      ? "Free"
                      : `$${(session.price_cents / 100).toFixed(0)}`}
                  </p>

                  <button
                    className="rounded-lg bg-gold px-3 py-2 text-[11px] font-semibold text-white hover:opacity-90"
                    onClick={() => {
                      alert(
                        "Booking flow will be connected here."
                      );
                    }}
                  >
                    Book session
                  </button>

                </div>

              </div>
            ))}

          </div>

        </section>
      )}

      {/* =====================================
          INSTAGRAM STYLE TABS
      ====================================== */}

      <div className="mb-1 flex border-t border-line">

        <div className="flex flex-1 items-center justify-center gap-1.5 border-t-2 border-gold py-3 text-[11px] font-medium uppercase tracking-wide text-gold">
          <Grid3x3 size={15} />
          Posts
        </div>

      </div>

      {/* =====================================
          POSTS
      ====================================== */}

      {postsLoading && (
        <p className="py-8 text-center text-sm text-ink-dim">
          Loading posts...
        </p>
      )}

      {!postsLoading &&
        (!posts || posts.length === 0) && (
          <div className="rounded-xl border border-line bg-panel p-8 text-center">
            <Grid3x3
              size={24}
              className="mx-auto text-ink-faint"
            />

            <p className="mt-3 text-sm font-medium text-ink">
              No posts yet
            </p>

            <p className="mt-1 text-xs text-ink-faint">
              When this person shares something, it will appear here.
            </p>
          </div>
        )}

      {posts && posts.length > 0 && (
        <div className="grid grid-cols-3 gap-0.5">

          {posts.map((post) => {

            const isVideo =
              post.media_type === "video" ||
              !!post.video_url;

            const mediaUrl =
              post.image_url ||
              post.video_url ||
              post.media_url;

            return (
              <div
                key={post.id}
                className="group relative aspect-square overflow-hidden bg-panel-2"
              >

                {/* IMAGE */}

                {!isVideo && mediaUrl && (
                  <img
                    src={mediaUrl}
                    alt={post.title ?? ""}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}

                {/* VIDEO */}

                {isVideo && mediaUrl && (
                  <video
                    src={mediaUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}

                {/* TEXT ONLY POST */}

                {!mediaUrl && (
                  <div className="flex h-full w-full items-center justify-center bg-panel-2 p-4">
                    <p className="serif line-clamp-6 text-center text-xs font-medium text-ink">
                      {post.title || post.body || "Post"}
                    </p>
                  </div>
                )}

                {/* VIDEO ICON */}

                {isVideo && (
                  <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5">
                    <Play
                      size={11}
                      fill="white"
                      className="text-white"
                    />
                  </div>
                )}

                {/* HOVER */}

                <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-2 opacity-0 transition group-hover:bg-black/60 group-hover:opacity-100">

                  {post.title && (
                    <p className="line-clamp-2 text-[10px] font-semibold text-white">
                      {post.title}
                    </p>
                  )}

                  <p className="mt-1 text-[9px] text-white/70">
                    {formatDistanceToNow(
                      new Date(post.created_at),
                      { addSuffix: true }
                    )}
                  </p>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}