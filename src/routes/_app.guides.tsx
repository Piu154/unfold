import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/guides")({
  head: () => ({ meta: [{ title: "Guides — Unfold" }, { name: "description", content: "Book a session with people who did the path." }] }),
  component: GuidesPage,
});

function GuidesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["guides-list"],
    queryFn: async () => {
      const { data: guides, error } = await supabase
        .from("guides").select("*")
        .eq("accepting_bookings", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!guides?.length) return [];
      const ids = guides.map((g) => g.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return guides.map((g) => ({ ...g, profile: map.get(g.user_id) ?? null }));
    },
  });


  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="serif mb-1 text-2xl font-medium">Guides</h1>
      <p className="mb-6 text-sm text-ink-dim">People who did the thing before you knew it existed. Book a session.</p>

      {isLoading && <p className="text-sm text-ink-dim">Loading…</p>}
      {!isLoading && (!data || data.length === 0) && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="serif text-lg">No guides yet.</p>
          <p className="mt-2 text-sm text-ink-dim">
            <Link to="/me" className="text-gold hover:underline">Become a guide</Link> to appear here.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((g) => {
          const p = g.profile;

          return (
            <Link key={g.id} to="/guides/$id" params={{ id: g.id }}
              className="rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/40">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-base font-semibold text-white">
                  {(p?.display_name ?? "U")[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="flex items-center gap-1 font-semibold">
                    {p?.display_name ?? "Guide"}
                    {g.verified && <CheckCircle2 size={13} className="text-sage" />}
                  </p>
                  <p className="text-[11.5px] text-ink-faint">{g.field}</p>
                </div>
              </div>
              <p className="serif text-sm text-ink">{g.headline}</p>
              <p className="mt-2 line-clamp-2 text-xs text-ink-dim">{g.bio}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
