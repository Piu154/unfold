import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/hidden")({
  head: () => ({ meta: [{ title: "Hidden gems — Unfold" }, { name: "description", content: "Under-applied opportunities and non-obvious paths." }] }),
  component: HiddenPage,
});

function HiddenPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["hidden-gems"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("hidden_gem", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  type Opp = NonNullable<typeof data>[number];
  const byField = (data ?? []).reduce<Record<string, Opp[]>>((acc, o) => {
    (acc[o.field] ||= []).push(o);
    return acc;
  }, {});


  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles size={20} className="text-gold" />
        <h1 className="serif text-2xl font-medium">Hidden gems</h1>
      </div>
      <p className="mb-6 text-sm text-ink-dim">
        Under-applied opportunities that fewer people know about. Fewer applicants, real chances.
      </p>

      {isLoading && <p className="text-sm text-ink-dim">Loading…</p>}

      {!isLoading && Object.keys(byField).length === 0 && (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center">
          <p className="serif text-lg">No hidden gems yet.</p>
          <p className="mt-2 text-sm text-ink-dim">Admins can mark opportunities as hidden gems to feature them here.</p>
        </div>
      )}

      {Object.entries(byField).map(([field, items]) => (
        <section key={field} className="mb-8">
          <h2 className="mono mb-3 text-[10.5px] uppercase text-gold">{field}</h2>
          <div className="space-y-3">
            {items.map((o) => (
              <Link key={o.id} to="/opportunities/$id" params={{ id: o.id }}
                className="block rounded-2xl border border-line bg-panel p-5 transition hover:border-gold/40">
                <div className="mb-1 flex items-center gap-2">
                  <span className="mono rounded-md border border-sage/30 bg-sage-dim px-2 py-0.5 text-[9.5px] uppercase text-sage">
                    {o.kind}
                  </span>
                  {o.deadline && (
                    <span className="mono text-[10.5px] text-danger">
                      {formatDistanceToNow(new Date(o.deadline), { addSuffix: true })}
                    </span>
                  )}
                </div>
                <h3 className="serif text-base font-medium">{o.title}</h3>
                <p className="text-[11.5px] text-ink-faint">{o.organization}</p>
                <p className="mt-2 line-clamp-2 text-sm text-ink-dim">{o.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
