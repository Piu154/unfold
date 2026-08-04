import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  MessageCircle,
  Star,
  Share2,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Unfold" },
      {
        name: "description",
        content:
          "Discover what people are sharing, discussing and exploring on Unfold.",
      },
    ],
  }),

  component: FeedPage,
});

/* =====================================================
   HELPERS
===================================================== */

function initials(name: string | null | undefined) {
  if (!name) return "U";

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/* =====================================================
   FEED
===================================================== */

function FeedPage() {
  const { user } = useSession();

  /* ===================================================
     POSTS
  =================================================== */

  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["feed-posts"],

    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!posts?.length) {
        return [];
      }

      /* -----------------------------------------------
         Get all post authors
      ------------------------------------------------ */

      const authorIds = Array.from(
        new Set(posts.map((post) => post.author_id))
      );

      const { data: profiles, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, display_name, username, avatar_url, headline"
          )
          .in("id", authorIds);

      if (profileError) {
        throw profileError;
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile,
        ])
      );

      return posts.map((post) => ({
        ...post,
        author:
          profileMap.get(post.author_id) ?? null,
      }));
    },
  });

  /* ===================================================
     FEATURED OPPORTUNITY
  =================================================== */

  const { data: featured } = useQuery({
    queryKey: ["feed-featured-opportunity"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(
          "id, title, description, category, organization, location, deadline, application_url, featured"
        )
        .eq("featured", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="mb-6">
        <h1 className="serif text-2xl font-medium">
          Feed
        </h1>

        <p className="mt-1 text-sm text-ink-dim">
          Discover what people are sharing on Unfold.
        </p>
      </section>

      {/* =================================================
          CREATE POST
      ================================================= */}

      {user && (
        <Link
          to="/feed"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 transition hover:border-gold/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-gold">
            You
          </div>

          <div className="flex-1 rounded-xl border border-line bg-panel-2 px-4 py-2.5 text-sm text-ink-faint">
            Share something with the community...
          </div>
        </Link>
      )}

      {/* =================================================
          FEATURED OPPORTUNITY
      ================================================= */}

      {featured && (
        <FeaturedOpportunity opportunity={featured} />
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {isLoading && (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center">
          <p className="text-sm text-ink-dim">
            Loading feed...
          </p>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!isLoading && error && (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center">
          <p className="text-sm text-danger">
            Unable to load the feed.
          </p>

          <p className="mt-1 text-xs text-ink-faint">
            Please try again later.
          </p>
        </div>
      )}

      {/* =================================================
          EMPTY
      ================================================= */}

      {!isLoading &&
        !error &&
        posts.length === 0 && (
          <div className="rounded-2xl border border-line bg-panel p-10 text-center">
            <p className="serif text-lg text-ink">
              The feed is quiet.
            </p>

            <p className="mt-2 text-sm leading-relaxed text-ink-dim">
              When people start sharing ideas, experiences,
              discoveries and opportunities, they'll appear
              here.
            </p>
          </div>
        )}

      {/* =================================================
          POSTS
      ================================================= */}

      {!isLoading &&
        !error &&
        posts.length > 0 && (
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
    </div>
  );
}

/* =====================================================
   FEATURED OPPORTUNITY
===================================================== */

function FeaturedOpportunity({
  opportunity,
}: {
  opportunity: any;
}) {
  return (
    <article className="mb-5 rounded-2xl border border-line bg-panel p-5 shadow-sm">

      <div className="mb-3 flex items-center justify-between gap-3">

        <span className="mono rounded-md border border-gold/30 bg-gold-dim px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-gold">
          {opportunity.category || "Opportunity"}
        </span>

        {opportunity.deadline && (
          <span className="mono text-[10.5px] font-medium text-danger">
            Closes in{" "}
            {formatDistanceToNow(
              new Date(opportunity.deadline)
            )}
          </span>
        )}
      </div>

      <h2 className="serif text-lg font-semibold text-ink">
        {opportunity.title}
      </h2>

      {opportunity.organization && (
        <p className="mt-1 text-xs text-ink-faint">
          {opportunity.organization}
        </p>
      )}

      {opportunity.description && (
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-dim">
          {opportunity.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">

        <Link
          to="/opportunities/$id"
          params={{ id: opportunity.id }}
          className="flex-1 rounded-lg bg-gold py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
        >
          View details
        </Link>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-dim transition hover:border-gold/40 hover:text-gold"
          aria-label="Save opportunity"
        >
          <Bookmark size={16} />
        </button>

      </div>
    </article>
  );
}

/* =====================================================
   POST CARD
===================================================== */

function PostCard({
  post,
  currentUserId,
}: {
  post: any;
  currentUserId?: string;
}) {
  const author = post.author;

  const isVideo =
    post.media_type === "video" ||
    !!post.video_url;

  const isOwnPost =
    currentUserId &&
    currentUserId === post.author_id;

  return (
    <article className="rounded-2xl border border-line bg-panel shadow-sm">

      {/* =================================================
          AUTHOR
      ================================================= */}

      <header className="flex items-start gap-3 p-4">

        <Link
          to="/profile/$userId"
          params={{
            userId: post.author_id,
          }}
          className="shrink-0"
        >
          {author?.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.display_name ?? "User"}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-gold">
              {initials(author?.display_name)}
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-1">

            <Link
              to="/profile/$userId"
              params={{
                userId: post.author_id,
              }}
              className="truncate text-sm font-semibold text-ink hover:underline"
            >
              {author?.display_name ?? "Unknown"}
            </Link>

            {author?.verified && (
              <CheckCircle2
                size={13}
                className="shrink-0 text-gold"
              />
            )}

          </div>

          {author?.headline && (
            <p className="truncate text-[11.5px] text-ink-faint">
              {author.headline}
            </p>
          )}

          <p className="text-[10.5px] text-ink-faint">
            {post.created_at
              ? formatDistanceToNow(
                  new Date(post.created_at),
                  {
                    addSuffix: true,
                  }
                )
              : ""}
          </p>

        </div>

        {isOwnPost && (
          <span className="shrink-0 rounded-md bg-panel-2 px-2 py-1 text-[9px] text-ink-faint">
            You
          </span>
        )}

      </header>

      {/* =================================================
          POST BODY
      ================================================= */}

      {post.body && (
        <p className="whitespace-pre-wrap px-4 pb-3 text-[14px] leading-relaxed text-ink">
          {post.body}
        </p>
      )}

      {/* =================================================
          VIDEO
      ================================================= */}

      {isVideo && post.video_url && (
        <VideoEmbed url={post.video_url} />
      )}

      {/* =================================================
          IMAGE
      ================================================= */}

      {!isVideo && post.image_url && (
        <img
          src={post.image_url}
          alt=""
          className="w-full border-y border-line object-cover"
        />
      )}

      {/* =================================================
          TAGS
      ================================================= */}

      {post.tags &&
        post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">

            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded-md bg-panel-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-dim"
              >
                #{tag}
              </span>
            ))}

          </div>
        )}

      {/* =================================================
          ACTIONS
      ================================================= */}

      <footer className="flex items-center gap-6 px-4 py-3 text-[12px] text-ink-dim">

        <button
          type="button"
          className="flex items-center gap-1.5 transition hover:text-gold"
        >
          <Star size={14} />
          Like
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 transition hover:text-gold"
        >
          <MessageCircle size={14} />
          Comment
        </button>

        <button
          type="button"
          className="flex items-center gap-1.5 transition hover:text-gold"
        >
          <Share2 size={14} />
          Share
        </button>

        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 transition hover:text-gold"
        >
          <Bookmark size={14} />
          Save
        </button>

      </footer>
    </article>
  );
}

/* =====================================================
   VIDEO EMBED
===================================================== */

function VideoEmbed({ url }: { url: string }) {

  /* YouTube */

  const youtube = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );

  if (youtube) {
    return (
      <div className="relative aspect-video w-full border-y border-line bg-black">

        <iframe
          src={`https://www.youtube.com/embed/${youtube[1]}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />

      </div>
    );
  }

  /* Vimeo */

  const vimeo = url.match(
    /vimeo\.com\/(\d+)/
  );

  if (vimeo) {
    return (
      <div className="relative aspect-video w-full border-y border-line bg-black">

        <iframe
          src={`https://player.vimeo.com/video/${vimeo[1]}`}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          title="Video"
        />

      </div>
    );
  }

  /* Direct video */

  return (
    <video
      src={url}
      controls
      playsInline
      className="w-full border-y border-line bg-black"
    >
      <track kind="captions" />
    </video>
  );
}