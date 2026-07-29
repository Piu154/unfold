import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { ArrowLeft, Bookmark, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/opportunities/$id")({
  head: () => ({ meta: [{ title: "Opportunity — Unfold" }] }),
  component: OppDetail,
});

function OppDetail() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const qc = useQueryClient();

  const { data: opp, isLoading } = useQuery({
    queryKey: ["opp", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isSaved } = useQuery({
    queryKey: ["saved", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("saved_opportunities")
        .select("opportunity_id").eq("user_id", user!.id).eq("opportunity_id", id).maybeSingle();
      return !!data;
    },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (isSaved) {
        const { error } = await supabase.from("saved_opportunities").delete().eq("user_id", user.id).eq("opportunity_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_opportunities").insert({ user_id: user.id, opportunity_id: id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved", id] });
      qc.invalidateQueries({ queryKey: ["my-saved"] });
      toast.success(isSaved ? "Removed" : "Saved");
    },
  });

  if (isLoading) return <div className="p-10 text-sm text-ink-dim">Loading…</div>;
  if (!opp) return <div className="p-10 text-sm text-ink-dim">Not found.</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/search" className="mb-4 inline-flex items-center gap-2 text-xs text-ink-dim hover:text-ink">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="mb-4 flex items-center gap-2">
        <span className="mono rounded-md border border-gold/30 bg-gold-dim px-2 py-0.5 text-[9.5px] uppercase text-gold">{opp.kind}</span>
        {opp.hidden_gem && <span className="mono rounded-md border border-sage/30 bg-sage-dim px-2 py-0.5 text-[9.5px] uppercase text-sage">Hidden gem</span>}
        {opp.deadline && <span className="mono ml-auto text-[10.5px] text-danger">
          Closes {formatDistanceToNow(new Date(opp.deadline), { addSuffix: true })}
        </span>}
      </div>

      <h1 className="serif mb-2 text-3xl font-medium">{opp.title}</h1>
      <p className="mb-6 text-sm text-ink-dim">{opp.organization} · {opp.field}{opp.location ? ` · ${opp.location}` : ""}{opp.stipend ? ` · ${opp.stipend}` : ""}</p>

      <p className="mb-4 text-base leading-relaxed text-ink">{opp.summary}</p>
      {opp.description && <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">{opp.description}</p>}

      {opp.tags && opp.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {opp.tags.map((t: string) => (
            <span key={t} className="rounded-md bg-panel-2 px-2 py-1 text-[10.5px] text-ink-dim">#{t}</span>
          ))}
        </div>
      )}

      <div className="sticky bottom-16 mt-8 flex gap-2 border-t border-line bg-bg/95 py-4 md:bottom-0">
        {opp.url && (
          <a href={opp.url} target="_blank" rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-3 text-sm font-semibold text-white">
            Apply <ExternalLink size={14} />
          </a>
        )}
        <button onClick={() => toggleSave.mutate()} disabled={!user || toggleSave.isPending}
          className={`flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium ${
            isSaved ? "border-gold bg-gold-dim text-gold" : "border-line text-ink hover:bg-panel-2"
          }`}>
          <Bookmark size={14} /> {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}
