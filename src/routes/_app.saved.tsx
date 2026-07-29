import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { OpportunityCard } from "@/components/OpportunityCard";
import type { Opportunity } from "@/lib/opportunities";
import { Bookmark } from "lucide-react";

export const Route = createFileRoute("/_app/saved")({
  head: () => ({
    meta: [
      { title: "Saved opportunities — Unfold" },
      { name: "description", content: "Everything you bookmarked, with deadlines front and centre." },
      { property: "og:title", content: "Saved opportunities — Unfold" },
      { property: "og:description", content: "Your bookmarked opportunities and upcoming deadlines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["saved-opportunities", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("created_at, opportunity:opportunities(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.opportunity as unknown as Opportunity)
        .filter(Boolean);
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 flex items-center gap-2 animate-rise">
        <Bookmark size={20} className="text-gold" />
        <h1 className="serif text-3xl font-medium text-gradient">Saved</h1>
      </header>

      {isLoading && <p className="text-sm text-ink-dim">Loading…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <div className="rounded-2xl glass p-12 text-center">
          <p className="serif text-xl">Nothing saved yet.</p>
          <p className="mt-2 text-sm text-ink-dim">Bookmark opportunities from Discover and they land here.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(data ?? []).map((o, i) => (
          <OpportunityCard key={o.id} o={o} index={i} />
        ))}
      </div>
    </div>
  );
}
