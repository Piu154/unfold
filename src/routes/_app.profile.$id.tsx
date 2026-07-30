import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Play,
} from "lucide-react";

export const Route = createFileRoute("/_app/profile/$id")({
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
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ProfilePage() {
  const { id } = Route.useParams();

  // ==================================================
  // PROFILE + GUIDE
  // ==================================================

  const { data, isLoading } = useQuery({
    queryKey: ["profile", id],

    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error("Profile not found");
      }

      const { data: guide, error: guideError } = await supabase
        .from("guides")
        .select("*")
        .eq("user_id", id)
        .maybeSingle();

      if (guideError) throw guideError;

      return {
        profile,
        guide,
      };
    },
  });

  // ==================================================
  // POSTS
  // ==================================================

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["profile-posts", id],

    enabled: !!id,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .eq("author_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  // ==================================================
  // GUIDE SESSIONS
  // ==================================================

  const guideId = data?.guide?.id;

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["profile-guide-sessions", guideId],

    enabled: !!guideId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_session_types")
        .select("*")
        .eq("guide_id", guideId!)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return data ?? [];
    },
  });

  // ==================================================
  // LOADING
  // ==================================================

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-ink-dim">
          Loading profile...
        </p>
      </div>
    );
  }

  // ==================================================
  // NOT FOUND
  // ==================================================

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-danger">
          Profile not found.
        </p>
      </div>
    );
  }

  const { profile, guide } = data;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">

      {/* ==================================================
          BACK
      ================================================== */}

      <Link
        to="/feed"
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back to feed
      </Link>

      {/* ==================================================
          PROFILE HEADER
      ================================================== */}

      <div className="mb-6">

        <div className="flex items-center gap-5">

          {/* Avatar */}

          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? "Profile"}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-panel-2"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gold text-3xl font-semibold text-white ring-4 ring-panel-2">
              {initials(profile.display_name)}
            </div>
          )}

          {/* Name + username + guide */}

          <div className="min-w-0">

            <h1 className="serif text-xl font-semibold">
              {profile.display_name ?? "Unnamed"}
            </h1>

            {profile.username && (
              <p className="mt-0.5 text-xs text-ink-faint">
                @{profile.username}
              </p>
            )}

            {guide && (
              <div className="mt-2 flex items-center gap-1.5">

                <span className="rounded-full bg-gold-dim px-2.5 py-1 text-[10px] font-semibold text-gold">
                  Guide
                </span>

                {guide.verified && (
                  <CheckCircle2
                    size={14}
                    className="text-gold"
                  />
                )}

              </div>
            )}

          </div>

        </div>

        {/* Bio */}

        {profile.bio && (
          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            {profile.bio}
          </p>
        )}

        {/* ==================================================
            PROFILE STATS
        ================================================== */}

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-panel">

          <div className="border-r border-line py-3 text-center">
            <p className="text-sm font-semibold">
              {posts?.length ?? 0}
            </p>

            <p className="text-[10px] uppercase tracking-wide text-ink-faint">
              Posts
            </p>
          </div>

          <div className="py-3 text-center">
            <p className="text-sm font-semibold">
              {guide ? "Guide" : "Explorer"}
            </p>

            <p className="text-[10px] uppercase tracking-wide text-ink-faint">
              Type
            </p>
          </div>

        </div>

      </div>

      {/* ==================================================
          POSTS / MEDIA
      ================================================== */}

      <section className="mb-6">

        <div className="mb-3 border-t border-line">

          <div className="flex items-center justify-center gap-2 border-t-2 border-gold py-3 text-[11px] font-medium uppercase tracking-wide text-gold">
            Posts
          </div>

        </div>

        {postsLoading ? (
          <div className="rounded-xl border border-line bg-panel p-6 text-center">
            <p className="text-sm text-ink-dim">
              Loading posts...
            </p>
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="rounded-xl border border-line bg-panel p-8 text-center">
            <p className="serif text-lg">
              No posts yet
            </p>

            <p className="mt-2 text-xs text-ink-faint">
              {profile.display_name ?? "This user"} hasn't shared anything yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">

            {posts.map((post) => (
              <ProfilePostTile
                key={post.id}
                post={post}
              />
            ))}

          </div>
        )}

      </section>

      {/* ==================================================
          GUIDE INFORMATION
          ONLY FOR GUIDES
      ================================================== */}

      {guide && (
        <section className="mb-6 rounded-2xl border border-line bg-panel p-5">

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-1.5">

                <h2 className="text-sm font-semibold">
                  {guide.headline}
                </h2>

                {guide.verified && (
                  <CheckCircle2
                    size={14}
                    className="text-gold"
                  />
                )}

              </div>

              {guide.field && (
                <p className="mt-1 text-xs text-ink-faint">
                  {guide.field}
                </p>
              )}

            </div>

            <span className="shrink-0 rounded-full bg-gold-dim px-2.5 py-1 text-[10px] font-semibold text-gold">
              Guide
            </span>

          </div>

          {guide.bio && (
            <p className="mt-3 text-sm leading-relaxed text-ink-dim">
              {guide.bio}
            </p>
          )}

          {guide.affiliations?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">

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

        </section>
      )}

      {/* ==================================================
          GUIDE SESSIONS
      ================================================== */}

      {guide && (
        <section className="mb-6">

          <div className="mb-3 flex items-center gap-2">

            <CalendarDays
              size={16}
              className="text-gold"
            />

            <h2 className="text-sm font-semibold">
              Sessions
            </h2>

          </div>

          {sessionsLoading ? (
            <div className="rounded-xl border border-line bg-panel p-5">
              <p className="text-xs text-ink-faint">
                Loading sessions...
              </p>
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="rounded-xl border border-line bg-panel p-5">

              <p className="text-sm font-medium">
                No sessions available
              </p>

              <p className="mt-1 text-xs text-ink-faint">
                This guide has not added any sessions yet.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-line bg-panel p-4"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <h3 className="text-sm font-semibold">
                        {session.name}
                      </h3>

                      <p className="mt-1 text-[11px] text-ink-faint">
                        {session.duration_minutes} minutes
                      </p>

                    </div>

                    <span className="shrink-0 rounded-md bg-panel-2 px-2 py-1 text-xs font-semibold text-ink">
                      {session.price_cents === 0
                        ? "Free"
                        : `$${(session.price_cents / 100).toFixed(0)}`}
                    </span>

                  </div>

                  {session.description && (
                    <p className="mt-3 text-xs leading-relaxed text-ink-dim">
                      {session.description}
                    </p>
                  )}

                  <button
                    className="mt-4 w-full rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    Book session
                  </button>

                </div>
              ))}

            </div>
          )}

        </section>
      )}

      {/* ==================================================
          NORMAL EXPLORER
      ================================================== */}

      {!guide && (
        <section className="rounded-2xl border border-line bg-panel p-5 text-center">

          <p className="text-sm font-semibold">
            {profile.display_name ?? "This user"}
          </p>

          <p className="mt-1 text-xs text-ink-faint">
            Community member
          </p>

        </section>
      )}

    </div>
  );
}

/* ======================================================
   POST TILE
====================================================== */

function ProfilePostTile({
  post,
}: {
  post: any;
}) {
  const isVideo =
    post.media_type === "video" ||
    !!post.video_url;

  const imageUrl =
    post.image_url ||
    (post.media_type === "image" ? post.media_url : null);

  const videoUrl =
    post.video_url ||
    (post.media_type === "video" ? post.media_url : null);

  return (
    <Link
      to="/feed"
      className="group relative aspect-square overflow-hidden bg-panel-2"
    >

      {/* ==================================================
          IMAGE
      ================================================== */}

      {!isVideo && imageUrl ? (
        <img
          src={imageUrl}
          alt={post.title ?? ""}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
        />
      ) : null}

      {/* ==================================================
          VIDEO / REEL
      ================================================== */}

      {isVideo && videoUrl ? (
        <div className="relative h-full w-full bg-black">

          <video
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />

          <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5">
            <Play
              size={13}
              fill="white"
              className="text-white"
            />
          </div>

        </div>
      ) : null}

      {/* ==================================================
          TEXT-ONLY POST
      ================================================== */}

      {!imageUrl && !videoUrl && (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gold/25 to-panel-2 p-4">

          <p className="serif line-clamp-6 text-center text-xs font-medium leading-relaxed text-ink">
            {post.title || post.body || "Post"}
          </p>

        </div>
      )}

      {/* ==================================================
          HOVER OVERLAY
      ================================================== */}

      <div className="absolute inset-0 flex items-end bg-black/0 p-3 opacity-0 transition group-hover:bg-black/60 group-hover:opacity-100">

        <div className="w-full">

          {post.title && (
            <p className="line-clamp-2 text-xs font-semibold text-white">
              {post.title}
            </p>
          )}

          {post.body && (
            <p className="mt-1 line-clamp-2 text-[10px] text-white/80">
              {post.body}
            </p>
          )}

        </div>

      </div>

    </Link>
  );
}