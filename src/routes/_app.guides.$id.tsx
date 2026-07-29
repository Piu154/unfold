import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/guides/$id")({
  head: () => ({ meta: [{ title: "Guide — Unfold" }] }),
  component: GuideDetail,
});

function GuideDetail() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState("");
  const [note, setNote] = useState("");

  const { data: guide, isLoading } = useQuery({
    queryKey: ["guide", id],
    queryFn: async () => {
      const { data: g, error } = await supabase.from("guides").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!g) return null;
      const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url, bio, username").eq("id", g.user_id).maybeSingle();
      return { ...g, profile: prof };
    },

  });

  const { data: sessionTypes } = useQuery({
    queryKey: ["guide-sessions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("guide_session_types").select("*").eq("guide_id", id).order("price_cents");
      if (error) throw error;
      return data;
    },
  });

  const book = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (!selectedType || !scheduled) throw new Error("Pick a session and time");
      const { error } = await supabase.from("bookings").insert({
        guide_id: id, session_type_id: selectedType, learner_id: user.id,
        scheduled_at: new Date(scheduled).toISOString(),
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      toast.success("Booking requested");
      setSelectedType(null); setScheduled(""); setNote("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <div className="p-10 text-sm text-ink-dim">Loading…</div>;
  if (!guide) return <div className="p-10 text-sm text-ink-dim">Guide not found. <Link to="/guides" className="text-gold">Back</Link></div>;

  const p = guide.profile;


  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/guides" className="mb-4 inline-flex items-center gap-2 text-xs text-ink-dim hover:text-ink">
        <ArrowLeft size={14} /> All guides
      </Link>

      <div className="mb-6 rounded-2xl border border-line bg-panel p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-xl font-semibold text-white ring-2 ring-gold">
            {(p?.display_name ?? "U")[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              {p?.display_name ?? "Guide"}
              {guide.verified && <CheckCircle2 size={16} className="text-sage" />}
            </h1>
            <p className="text-sm text-ink-dim">{guide.field}</p>
          </div>
        </div>
        <p className="serif mb-3 text-lg">{guide.headline}</p>
        <p className="text-sm leading-relaxed text-ink-dim">{guide.bio}</p>
        {guide.affiliations && guide.affiliations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {guide.affiliations.map((a: string) => (
              <span key={a} className="rounded-md border border-sage/30 bg-sage-dim px-2 py-1 text-[11px] text-sage">{a}</span>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold">Book a session</h2>
      <div className="mb-4 space-y-2">
        {sessionTypes?.length ? sessionTypes.map((st) => (
          <button key={st.id} onClick={() => setSelectedType(st.id)}
            className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
              selectedType === st.id ? "border-gold bg-gold-dim" : "border-line bg-panel hover:border-gold/40"
            }`}>
            <div>
              <p className="text-sm font-semibold">{st.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                <Clock size={11} /> {st.duration_minutes} min
                {st.description ? ` · ${st.description}` : ""}
              </p>
            </div>
            <span className="mono text-sm text-gold">
              {st.price_cents === 0 ? "Free" : `$${(st.price_cents / 100).toFixed(0)}`}
            </span>
          </button>
        )) : (
          <p className="rounded-xl border border-line bg-panel p-4 text-sm text-ink-dim">This guide hasn't set up sessions yet.</p>
        )}
      </div>

      {selectedType && (
        <div className="rounded-2xl border border-line bg-panel p-5">
          <label className="mb-2 block text-xs text-ink-dim">Choose a time</label>
          <input type="datetime-local" value={scheduled} onChange={(e) => setScheduled(e.target.value)}
            className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold" />
          <label className="mb-2 block text-xs text-ink-dim">What do you want to talk about?</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3}
            placeholder="I'm exploring…"
            className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-gold" />
          <button disabled={book.isPending || !scheduled} onClick={() => book.mutate()}
            className="w-full rounded-lg bg-gold py-3 text-sm font-semibold text-white disabled:opacity-50">
            {book.isPending ? "Booking…" : "Request booking"}
          </button>
        </div>
      )}
    </div>
  );
}
