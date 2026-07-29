import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Star, Share2, CheckCircle2, Play } from "lucide-react";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/feed")({
  head: () => ({ meta: [{ title: "Feed — Unfold" }, { name: "description", content: "Live discoveries from your guides." }] }),
  component: FeedPage,
});

function initials(name: string | null | undefined) {
  if (!name) return "U";
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
}

function FeedPage() {
  const { user } = useSession();

  const { data: guides } = useQuery({
    queryKey: ["feed-guide-strip"],
    queryFn: async () => {
      const { data: gs } = await supabase
        .from("guides")
        .select("id, user_id, field, verified")
        .eq("accepting_bookings", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (!gs?.length) return [];
      const ids = gs.map((g) => g.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return gs.map((g) => ({ ...g, profile: map.get(g.user_id) ?? null }));
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!posts?.length) return [];
      const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
      const [{ data: profs }, { data: gs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").in("id", authorIds),
        supabase.from("guides").select("id, user_id, field, verified").in("user_id", authorIds),
      ]);
      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
      const guideMap = new Map((gs ?? []).map((g) => [g.user_id, g]));
      return posts.map((p) => ({ ...p, author: profMap.get(p.author_id) ?? null, guide: guideMap.get(p.author_id) ?? null }));
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["feed-featured-opp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      {/* Guides strip — like Instagram stories */}
      {guides && guides.length > 0 && (
        <div className="mb-5">
          <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {guides.map((g) => {
              const name = g.profile?.display_name ?? "Guide";
              return (
                <Link
                  key={g.id}
                  to="/guides/$id"
                  params={{ id: g.id }}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <span className="ring-avatar">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-gold">
                      {initials(name)}
                    </span>
                  </span>
                  <span className="max-w-[64px] truncate text-center text-[10px] leading-tight text-ink-dim">
                    {name.split(" ")[0]}
                  </span>
                  <span className="max-w-[64px] truncate text-center text-[9px] leading-tight text-ink-faint">
                    {g.field}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="h-px w-full bg-line" />
        </div>
      )}

      {featured && (
        <FeaturedOppCard opp={featured} />
      )}

      {isLoading && <p className="text-sm text-ink-dim">Loading posts…</p>}

      {!isLoading && (!posts || posts.length === 0) && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="serif text-lg text-ink">The feed is quiet.</p>
          <p className="mt-2 text-sm text-ink-dim">
            Follow guides or ask an admin to publish opportunities to see posts here.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} />
        ))}
      </div>
    </div>
  );
}

function FeaturedOppCard({ opp }: { opp: any }) {
  return (
    <div className="mb-5 rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="mono rounded-md border border-gold/30 bg-gold-dim px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-gold">
          {opp.category || "Opportunity"}
        </span>
        {opp.deadline && (
          <span className="mono text-[10.5px] font-medium text-danger">
            Closes in {formatDistanceToNow(new Date(opp.deadline))}
          </span>
        )}
      </div>
      <h3 className="serif mb-1 text-lg font-semibold text-ink">{opp.title}</h3>
      <p className="mb-4 text-xs text-ink-faint">
        {opp.organization ? `${opp.organization} · ` : ""}{opp.location ?? "Global"}
      </p>
      <Link
        to="/opportunities/$id" params={{ id: opp.id }}
        className="block w-full rounded-lg bg-gold py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
      >
        See who's walked this path
      </Link>
    </div>
  );
}

function PostCard({ post, currentUserId }: { post: any; currentUserId?: string }) {
  const author = post.author;
  const guide = post.guide;
  const isVideo = post.media_type === "video" || !!post.video_url;

  return (
    <article className="rounded-2xl border border-line bg-panel shadow-sm">
      <header className="flex items-start gap-3 p-4">
        <span className="ring-avatar shrink-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-gold">
            {initials(author?.display_name)}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-ink">
            {author?.display_name ?? "Unknown"}
            {guide?.verified && <CheckCircle2 size={13} className="text-gold" />}
          </p>
          {guide?.field && (
            <p className="truncate text-[11.5px] text-ink-faint">{guide.field}</p>
          )}
        </div>
        {guide?.field && (
          <span className="mono shrink-0 rounded-md border border-gold/30 bg-gold-dim px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-gold">
            {guide.field.split(/[,/]/)[0].slice(0, 12)}
          </span>
        )}
      </header>

      {post.body && (
        <p className="whitespace-pre-wrap px-4 pb-3 text-[14px] leading-relaxed text-ink">{post.body}</p>
      )}

      {isVideo && post.video_url && (
        <VideoEmbed url={post.video_url} />
      )}

      {!isVideo && post.image_url && (
        <img src={post.image_url} alt="" className="w-full border-y border-line object-cover" />
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {post.tags.map((t: string) => (
            <span key={t} className="rounded-md bg-panel-2 px-2 py-0.5 text-[10.5px] font-medium text-ink-dim">#{t}</span>
          ))}
        </div>
      )}

      <footer className="flex items-center gap-6 px-4 py-3 text-[12px] text-ink-dim">
        <button className="flex items-center gap-1.5 transition hover:text-gold"><Star size={14} /> Like</button>
        <button className="flex items-center gap-1.5 transition hover:text-gold"><MessageCircle size={14} /> Comment</button>
        <button className="ml-auto flex items-center gap-1.5 transition hover:text-gold"><Share2 size={14} /> Share</button>
      </footer>
    </article>
  );
}

function VideoEmbed({ url }: { url: string }) {
  // YouTube
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) {
    return (
      <div className="relative aspect-video w-full border-y border-line bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${yt[1]}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) {
    return (
      <div className="relative aspect-video w-full border-y border-line bg-black">
        <iframe src={`https://player.vimeo.com/video/${vm[1]}`} className="absolute inset-0 h-full w-full" allowFullScreen />
      </div>
    );
  }
  // Direct mp4/webm
  return (
    <video src={url} controls playsInline className="w-full border-y border-line bg-black">
      <track kind="captions" />
    </video>
  );
}
