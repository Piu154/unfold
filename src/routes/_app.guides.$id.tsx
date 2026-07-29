import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import {
  CheckCircle2,
  Clock,
  ArrowLeft,
  Users,
  CalendarDays,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/guides/$id")({
  head: () => ({
    meta: [{ title: "Guide — Unfold" }],
  }),
  component: GuideDetail,
});

function GuideDetail() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState("");
  const [note, setNote] = useState("");

  // GUIDE + PROFILE
  const { data: guide, isLoading } = useQuery({
    queryKey: ["guide", id],
    queryFn: async () => {
      const { data: g, error } = await supabase
        .from("guides")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!g) return null;

      const { data: prof, error: profileError } = await supabase
        .from("profiles")
        .select(
          "display_name, avatar_url, bio, username, headline, location"
        )
        .eq("id", g.user_id)
        .maybeSingle();

      if (profileError) throw profileError;

      return {
        ...g,
        profile: prof,
      };
    },
  });

  // GUIDE POSTS
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["guide-posts", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_guide_posts", {
        p_guide_id: id,
      });

      if (error) throw error;

      return data ?? [];
    },
  });

  // FOLLOWERS
  const { data: followerRows } = useQuery({
    queryKey: ["guide-followers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("guide_id", id);

      if (error) throw error;

      return data ?? [];
    },
  });

  const followerCount = followerRows?.length ?? 0;

  // FOLLOWING STATE
  const { data: following } = useQuery({
    queryKey: ["following-guide", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("guide_id")
        .eq("follower_id", user!.id)
        .eq("guide_id", id)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    },
  });

  // FOLLOW / UNFOLLOW
  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");

      if (following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("guide_id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          guide_id: id,
        });

        if (error) throw error;
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["following-guide", user?.id, id],
      });

      qc.invalidateQueries({
        queryKey: ["guide-followers", id],
      });

      qc.invalidateQueries({
        queryKey: ["guide-follows", user?.id],
      });

      qc.invalidateQueries({
        queryKey: ["guide-follower-counts"],
      });

      toast.success(following ? "Unfollowed guide" : "Following guide");
    },

    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Something went wrong"
      );
    },
  });

  // SESSION TYPES
  const { data: sessionTypes } = useQuery({
    queryKey: ["guide-sessions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_session_types")
        .select("*")
        .eq("guide_id", id)
        .order("price_cents");

      if (error) throw error;

      return data ?? [];
    },
  });

  // BOOKING
  const book = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");

      if (!selectedType || !scheduled) {
        throw new Error("Pick a session and time");
      }

      const { error } = await supabase.from("bookings").insert({
        guide_id: id,
        session_type_id: selectedType,
        learner_id: user.id,
        scheduled_at: new Date(scheduled).toISOString(),
        note: note.trim() || null,
      });

      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["my-bookings"],
      });

      toast.success("Booking requested");

      setSelectedType(null);
      setScheduled("");
      setNote("");
    },

    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Booking failed"
      );
    },
  });

  if (isLoading) {
    return (
      <div className="p-10 text-sm text-ink-dim">
        Loading guide…
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="p-10 text-sm text-ink-dim">
        Guide not found.{" "}
        <Link to="/guides" className="text-gold">
          Back to guides
        </Link>
      </div>
    );
  }

  const p = guide.profile;
  const isOwnGuide = user?.id === guide.user_id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">

      {/* BACK */}
      <Link
        to="/guides"
        className="mb-5 inline-flex items-center gap-2 text-xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft size={14} />
        All guides
      </Link>

      {/* PROFILE */}
      <section className="rounded-2xl border border-line bg-panel p-6">

        <div className="flex gap-5">

          {/* AVATAR */}
          {p?.avatar_url ? (
            <img
              src={p.avatar_url}
              alt={p.display_name ?? "Guide"}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-gold/30"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gold text-3xl font-semibold text-white">
              {(p?.display_name ?? "U")[0]?.toUpperCase()}
            </div>
          )}

          {/* NAME */}
          <div className="min-w-0 flex-1">

            <h1 className="flex items-center gap-2 text-xl font-semibold">
              {p?.display_name ?? "Guide"}

              {guide.verified && (
                <CheckCircle2
                  size={17}
                  className="text-sage"
                />
              )}
            </h1>

            {p?.username && (
              <p className="text-xs text-ink-faint">
                @{p.username}
              </p>
            )}

            <p className="mt-1 text-sm text-ink-dim">
              {guide.field}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs text-ink-dim">
              <span className="flex items-center gap-1">
                <Users size={13} />
                <strong className="text-ink">
                  {followerCount}
                </strong>{" "}
                followers
              </span>

              <span className="flex items-center gap-1">
                <CalendarDays size={13} />
                Sessions
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        {isOwnGuide && (
  <Link
    to="/guide-post"
    className="mt-5 block w-full rounded-lg bg-gold py-2.5 text-center text-sm font-semibold text-white"
  >
    Create post
  </Link>
)}
        {!isOwnGuide && (
          <div className="mt-5 flex gap-2">

            <button
              onClick={() => followMutation.mutate()}
              disabled={
                followMutation.isPending || !user
              }
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                following
                  ? "border border-line bg-panel-2 text-ink-dim hover:text-danger"
                  : "bg-gold text-white hover:opacity-90"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>

            <button
              onClick={() =>
                document
                  .getElementById("sessions")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
              className="flex-1 rounded-lg border border-line py-2.5 text-sm font-semibold text-ink-dim hover:border-gold/40 hover:text-ink"
            >
              Book session
            </button>

          </div>
        )}

        {/* BIO */}
        <div className="mt-6">

          <p className="serif text-lg">
            {guide.headline}
          </p>

          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            {guide.bio}
          </p>

          {guide.affiliations?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {guide.affiliations.map(
                (a: string) => (
                  <span
                    key={a}
                    className="rounded-md border border-sage/30 bg-sage-dim px-2 py-1 text-[11px] text-sage"
                  >
                    {a}
                  </span>
                )
              )}
            </div>
          )}

        </div>
      </section>

      {/* TABS */}
      <div className="my-6 flex border-b border-line">

        <button className="flex-1 border-b-2 border-gold py-3 text-xs font-semibold text-ink">
          Posts
        </button>

        <button
          onClick={() =>
            document
              .getElementById("sessions")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
          className="flex-1 py-3 text-xs text-ink-faint hover:text-ink"
        >
          Sessions
        </button>

      </div>

      {/* POSTS */}
      <section className="mb-10">

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Posts
          </h2>

          <span className="text-xs text-ink-faint">
            {posts?.length ?? 0} posts
          </span>
        </div>

        {postsLoading && (
          <p className="text-sm text-ink-dim">
            Loading posts…
          </p>
        )}

        {!postsLoading && (!posts || posts.length === 0) && (
          <div className="rounded-2xl border border-line bg-panel p-10 text-center">
            <p className="serif text-lg">
              No posts yet
            </p>

            <p className="mt-2 text-sm text-ink-dim">
              This guide hasn't shared anything yet.
            </p>
          </div>
        )}

        <div className="space-y-4">

          {posts?.map((post) => (

            <article
              key={post.id}
              className="overflow-hidden rounded-2xl border border-line bg-panel"
            >

              {/* POST HEADER */}
              <div className="flex items-center gap-3 p-4">

                {post.avatar_url ? (
                  <img
                    src={post.avatar_url}
                    alt={post.display_name ?? "Guide"}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-xs font-semibold text-white">
                    {(post.display_name ?? "U")[0]?.toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs font-semibold">
                    {post.display_name ?? "Guide"}
                  </p>

                  <p className="text-[10px] text-ink-faint">
                    {formatDistanceToNow(
                      new Date(post.created_at),
                      { addSuffix: true }
                    )}
                  </p>
                </div>

              </div>

              {/* POST CONTENT */}
              <div className="px-4 pb-4">

                {post.title && (
                  <h3 className="serif text-lg font-medium">
                    {post.title}
                  </h3>
                )}

                {post.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">
                    {post.body}
                  </p>
                )}

              </div>

              {/* IMAGE */}
              {post.media_url && (
                <div className="relative bg-bg">

                  <img
                    src={post.media_url}
                    alt=""
                    className="max-h-[600px] w-full object-cover"
                  />

                  <div className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white">
                    <ImageIcon size={14} />
                  </div>

                </div>
              )}

              {/* VIDEO */}
              {post.video_url && (
                <div className="relative bg-black">

                  <video
                    src={post.video_url}
                    controls
                    className="max-h-[600px] w-full"
                  />

                  <div className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white">
                    <Video size={14} />
                  </div>

                </div>
              )}

              {/* TAGS */}
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 py-3">

                  {post.tags.map(
                    (tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-panel-2 px-2.5 py-1 text-[10px] text-ink-faint"
                      >
                        #{tag}
                      </span>
                    )
                  )}

                </div>
              )}

            </article>

          ))}

        </div>
      </section>

      {/* SESSIONS */}
      <section id="sessions">

        <div className="mb-3">
          <h2 className="text-sm font-semibold">
            Book a session
          </h2>

          <p className="mt-1 text-xs text-ink-faint">
            Learn directly from their experience.
          </p>
        </div>

        <div className="mb-4 space-y-2">

          {sessionTypes?.length ? (
            sessionTypes.map((st) => (

              <button
                key={st.id}
                onClick={() =>
                  setSelectedType(st.id)
                }
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                  selectedType === st.id
                    ? "border-gold bg-gold-dim"
                    : "border-line bg-panel hover:border-gold/40"
                }`}
              >

                <div>

                  <p className="text-sm font-semibold">
                    {st.name}
                  </p>

                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                    <Clock size={11} />

                    {st.duration_minutes} min

                    {st.description
                      ? ` · ${st.description}`
                      : ""}
                  </p>

                </div>

                <span className="mono text-sm text-gold">
                  {st.price_cents === 0
                    ? "Free"
                    : `$${(
                        st.price_cents / 100
                      ).toFixed(0)}`}
                </span>

              </button>

            ))
          ) : (
            <p className="rounded-xl border border-line bg-panel p-4 text-sm text-ink-dim">
              This guide hasn't set up sessions yet.
            </p>
          )}

        </div>

        {/* BOOKING FORM */}
        {selectedType && (

          <div className="rounded-2xl border border-line bg-panel p-5">

            <label className="mb-2 block text-xs text-ink-dim">
              Choose a time
            </label>

            <input
              type="datetime-local"
              value={scheduled}
              onChange={(e) =>
                setScheduled(e.target.value)
              }
              className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold"
            />

            <label className="mb-2 block text-xs text-ink-dim">
              What do you want to talk about?
            </label>

            <textarea
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              maxLength={500}
              rows={3}
              placeholder="I'm exploring…"
              className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold"
            />

            <button
              disabled={
                book.isPending || !scheduled
              }
              onClick={() => book.mutate()}
              className="w-full rounded-lg bg-gold py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {book.isPending
                ? "Booking…"
                : "Request booking"}
            </button>

          </div>
        )}

      </section>
    </div>
  );
}