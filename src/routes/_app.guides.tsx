import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { CheckCircle2, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/guides")({
  head: () => ({
    meta: [
      { title: "Guides — Unfold" },
      {
        name: "description",
        content: "Discover and follow people who did the path before you.",
      },
    ],
  }),
  component: GuidesPage,
});

function GuidesPage() {
  const { user } = useSession();
  const qc = useQueryClient();

  // Get all guides
  const { data, isLoading } = useQuery({
    queryKey: ["guides-list"],
    queryFn: async () => {
      const { data: guides, error } = await supabase
        .from("guides")
        .select("*")
        .eq("accepting_bookings", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!guides?.length) return [];

      const userIds = guides.map((g) => g.user_id);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );

      return guides.map((g) => ({
        ...g,
        profile: profileMap.get(g.user_id) ?? null,
      }));
    },
  });

  // Get all follows
  const { data: follows } = useQuery({
    queryKey: ["guide-follows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, guide_id")
        .eq("follower_id", user!.id);

      if (error) throw error;

      return data ?? [];
    },
  });

  // Get follower counts
  const { data: followerRows } = useQuery({
    queryKey: ["guide-follower-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("guide_id");

      if (error) throw error;

      return data ?? [];
    },
  });

  const followMutation = useMutation({
    mutationFn: async ({
      guideId,
      following,
    }: {
      guideId: string;
      following: boolean;
    }) => {
      if (!user) {
        throw new Error("Please sign in first");
      }

      if (following) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("guide_id", guideId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: user.id,
          guide_id: guideId,
        });

        if (error) throw error;
      }
    },

    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["guide-follows", user?.id],
      });

      qc.invalidateQueries({
        queryKey: ["guide-follower-counts"],
      });

      toast.success(
        variables.following ? "Unfollowed guide" : "Following guide"
      );
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const isFollowing = (guideId: string) => {
    return (
      follows?.some((f) => f.guide_id === guideId) ?? false
    );
  };

  const followerCount = (guideId: string) => {
    return (
      followerRows?.filter((f) => f.guide_id === guideId).length ?? 0
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="serif mb-1 text-2xl font-medium">
          Guides
        </h1>

        <p className="text-sm text-ink-dim">
          Discover people who actually work in the fields you care about.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-ink-dim">
          Loading guides…
        </p>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="serif text-lg">
            No guides yet.
          </p>

          <p className="mt-2 text-sm text-ink-dim">
            <Link
              to="/me"
              className="text-gold hover:underline"
            >
              Become a guide
            </Link>{" "}
            to appear here.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((g) => {
          const p = g.profile;
          const following = isFollowing(g.id);
          const followers = followerCount(g.id);
          const isOwnGuide = user?.id === g.user_id;

          return (
            <div
              key={g.id}
              className="rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/40"
            >
              {/* Profile header */}
              <Link
                to="/guides/$id"
                params={{ id: g.id }}
                className="block"
              >
                <div className="mb-3 flex items-center gap-3">
                  {/* Avatar */}
                  {p?.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.display_name ?? "Guide"}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-base font-semibold text-white">
                      {(p?.display_name ?? "U")[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-semibold">
                      <span className="truncate">
                        {p?.display_name ?? "Guide"}
                      </span>

                      {g.verified && (
                        <CheckCircle2
                          size={13}
                          className="shrink-0 text-sage"
                        />
                      )}
                    </p>

                    <p className="text-[11.5px] text-ink-faint">
                      {g.field}
                    </p>
                  </div>
                </div>

                {/* Headline */}
                <p className="serif text-sm text-ink">
                  {g.headline}
                </p>

                {/* Bio */}
                <p className="mt-2 line-clamp-2 text-xs text-ink-dim">
                  {g.bio}
                </p>
              </Link>

              {/* Followers */}
              <div className="mt-4 flex items-center gap-1.5 text-xs text-ink-faint">
                <Users size={13} />
                <span>
                  {followers}{" "}
                  {followers === 1 ? "follower" : "followers"}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Link
                  to="/guides/$id"
                  params={{ id: g.id }}
                  className="flex-1 rounded-lg border border-line px-3 py-2 text-center text-xs font-semibold text-ink-dim transition hover:border-gold/40 hover:text-ink"
                >
                  View profile
                </Link>

                {!isOwnGuide && (
                  <button
                    onClick={() =>
                      followMutation.mutate({
                        guideId: g.id,
                        following,
                      })
                    }
                    disabled={followMutation.isPending}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                      following
                        ? "border border-line bg-panel-2 text-ink-dim hover:border-danger/40 hover:text-danger"
                        : "bg-gold text-white hover:opacity-90"
                    }`}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}