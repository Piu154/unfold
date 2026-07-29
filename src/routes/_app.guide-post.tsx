import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/guide-post")({
  component: CreateGuidePost,
});

function CreateGuidePost() {
  const { user } = useSession();
  const navigate = useNavigate();

  const [guideId, setGuideId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [tags, setTags] = useState("");

  // Find the guide belonging to logged-in user
  const { data: guide, isLoading } = useQuery({
    queryKey: ["my-guide", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("id, headline, field")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  const createPost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!guide) throw new Error("You must become a guide first");
      if (!body.trim() && !title.trim()) {
        throw new Error("Write something first");
      }

      const cleanTags = tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

      const { error } = await supabase
        .from("feed_posts")
        .insert({
          author_id: user.id,
          title: title.trim() || null,
          body: body.trim() || null,
          media_url: mediaUrl.trim() || null,
          media_type: mediaUrl.trim() ? mediaType : null,
          tags: cleanTags,
        });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Post published");

      navigate({
        to: "/guides/$id",
        params: { id: guide!.id },
      });
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to publish post"
      );
    },
  });

  if (isLoading) {
    return (
      <div className="p-10 text-sm text-ink-dim">
        Loading…
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm text-ink-dim">
          You need to become a guide before creating posts.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">

      <button
        onClick={() => navigate({ to: "/guides/$id", params: { id: guide.id } })}
        className="mb-5 flex items-center gap-2 text-xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back to profile
      </button>

      <h1 className="serif text-2xl font-medium">
        Create a post
      </h1>

      <p className="mt-1 mb-6 text-sm text-ink-dim">
        Share something from your work, experience or daily journey.
      </p>

      <div className="space-y-4 rounded-2xl border border-line bg-panel p-5">

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What are you working on?"
          rows={7}
          className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-3 text-sm outline-none focus:border-gold"
        />

        <input
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="Image / video URL (optional)"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

        {mediaUrl && (
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        )}

        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags: sports, analysis, research"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
        />

        <button
          onClick={() => createPost.mutate()}
          disabled={createPost.isPending}
          className="w-full rounded-lg bg-gold py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {createPost.isPending
            ? "Publishing…"
            : "Publish post"}
        </button>

      </div>
    </div>
  );
}