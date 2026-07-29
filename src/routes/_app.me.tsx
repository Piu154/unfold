import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyGuide, useMyProfile, useSession } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, CalendarDays, Grid3x3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/me")({
  head: () => ({ meta: [{ title: "My profile — Unfold" }] }),
  component: MePage,
});

function MePage() {
  const { user } = useSession();
  const { data: profile } = useMyProfile();
  const { data: guide, refetch: refetchGuide } = useMyGuide();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"saved" | "bookings" | "guide">("saved");
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [display, setDisplay] = useState(profile?.display_name ?? "");

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ bio, display_name: display }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Saved");
      setEditing(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const { data: saved } = useQuery({
    queryKey: ["my-saved", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("saved_opportunities")
        .select("opportunity:opportunities(*)").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings")
        .select("*, session_type:guide_session_types(name, duration_minutes), guide:guides(id, headline)")
        .eq("learner_id", user!.id).order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const savedCount = saved?.length ?? 0;
  const bookingsCount = bookings?.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* --- Instagram-style profile header --- */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-3xl font-semibold text-white ring-4 ring-panel-2">
          {(profile?.display_name ?? user?.email ?? "U")[0]?.toUpperCase()}
        </div>

        {editing ? (
          <input
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            className="mt-3 w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-1.5 text-center text-lg font-semibold outline-none"
          />
        ) : (
          <h1 className="mt-3 serif text-lg font-semibold">{profile?.display_name ?? "Unnamed"}</h1>
        )}
        <p className="text-[11.5px] text-ink-faint">{user?.email}</p>

        {/* stats row */}
        <div className="mt-4 flex w-full max-w-xs divide-x divide-line rounded-xl border border-line bg-panel">
          <div className="flex-1 py-3">
            <p className="text-sm font-semibold">{savedCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Saved</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-sm font-semibold">{bookingsCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Bookings</p>
          </div>
          <div className="flex-1 py-3">
            <p className="text-sm font-semibold">{guide ? "Yes" : "—"}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Guide</p>
          </div>
        </div>

        {editing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Say a bit about what you're curious about."
            className="mt-4 w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-center text-sm outline-none"
          />
        ) : (
          profile?.bio && <p className="mt-4 max-w-xs text-sm text-ink-dim">{profile.bio}</p>
        )}

        {editing ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              className="rounded-lg bg-gold px-4 py-1.5 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDisplay(profile?.display_name ?? ""); setBio(profile?.bio ?? ""); }}
              className="rounded-lg border border-line px-4 py-1.5 text-xs font-medium text-ink-dim"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="mt-3 rounded-lg border border-line px-4 py-1.5 text-xs font-medium hover:bg-panel-2"
          >
            Edit profile
          </button>
        )}
      </div>

      {/* --- Instagram-style tab bar --- */}
      <div className="mb-1 flex border-t border-line">
        {([
          { key: "saved", label: "Saved", icon: Grid3x3 },
          { key: "bookings", label: "Bookings", icon: CalendarDays },
          { key: "guide", label: "Guide", icon: Sparkles },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-t-2 py-3 text-[11px] font-medium uppercase tracking-wide ${
              tab === key ? "border-gold text-gold" : "border-transparent text-ink-faint"
            }`}
          >
            <Icon size={15} strokeWidth={tab === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {tab === "saved" && (
        <>
          {(!saved || saved.length === 0) ? (
            <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-dim mt-4">
              No saved opportunities yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {saved?.map((s) => {
                const o = s.opportunity as { id: string; title: string; organization: string; summary: string } | null;
                if (!o) return null;
                return (
                  <Link
                    key={o.id}
                    to="/opportunities/$id"
                    params={{ id: o.id }}
                    className="group relative aspect-square overflow-hidden bg-panel-2"
                  >
                    {/* tile background */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gold/25 to-panel-2 p-3">
                      <span className="serif text-center text-xs font-medium leading-snug text-ink line-clamp-4">
                        {o.title}
                      </span>
                    </div>

                    {/* bookmark badge */}
                    <div className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1">
                      <Bookmark size={11} className="fill-white text-white" />
                    </div>

                    {/* hover overlay with org + summary, like IG post hover */}
                    <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-2 opacity-0 transition group-hover:bg-black/60 group-hover:opacity-100">
                      <p className="text-[10px] font-semibold text-white">{o.organization}</p>
                      <p className="line-clamp-2 text-[9.5px] text-white/80">{o.summary}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "bookings" && (
        <div className="space-y-3 mt-4">
          {(!bookings || bookings.length === 0) && <p className="rounded-xl border border-line bg-panel p-6 text-center text-sm text-ink-dim">No bookings yet.</p>}
          {bookings?.map((b) => {
            const st = b.session_type as { name: string; duration_minutes: number } | null;
            const gd = b.guide as { id: string; headline: string } | null;
            return (
              <div key={b.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold">{st?.name}</p>
                  <span className="mono rounded-md bg-panel-2 px-2 py-0.5 text-[9.5px] uppercase text-ink-dim">{b.status}</span>
                </div>
                <p className="text-[11.5px] text-ink-faint">
                  {formatDistanceToNow(new Date(b.scheduled_at), { addSuffix: true })} · {st?.duration_minutes}min
                </p>
                {gd && <Link to="/guides/$id" params={{ id: gd.id }} className="mt-2 inline-block text-xs text-gold">View guide →</Link>}
              </div>
            );
          })}
        </div>
      )}

      {tab === "guide" && <div className="mt-4"><GuideOnboarding guide={guide} refetch={refetchGuide} /></div>}
    </div>
  );
}

type GuideRow = {
  id: string; headline: string; bio: string; field: string;
  accepting_bookings: boolean; verified: boolean; affiliations: string[] | null;
} | null | undefined;

function GuideOnboarding({ guide, refetch }: { guide: GuideRow; refetch: () => void }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [headline, setHeadline] = useState(guide?.headline ?? "");
  const [gBio, setGBio] = useState(guide?.bio ?? "");
  const [field, setField] = useState(guide?.field ?? "");
  const [affil, setAffil] = useState((guide?.affiliations ?? []).join(", "));

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id, headline: headline.trim(), bio: gBio.trim(),
        field: field.trim(),
        affiliations: affil.split(",").map((a) => a.trim()).filter(Boolean),
      };
      if (!payload.headline || !payload.bio || !payload.field) throw new Error("Fill headline, field, bio");
      if (guide) {
        const { error } = await supabase.from("guides").update(payload).eq("id", guide.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("guides").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["guides-list"] }); toast.success("Guide profile saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const { data: sessionTypes, refetch: refetchTypes } = useQuery({
    queryKey: ["my-session-types", guide?.id],
    enabled: !!guide,
    queryFn: async () => {
      const { data, error } = await supabase.from("guide_session_types").select("*").eq("guide_id", guide!.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel p-5">
        <h3 className="mb-3 text-sm font-semibold">Your guide profile</h3>
        <label className="mb-1 mt-2 block text-[11px] uppercase text-ink-faint">Headline</label>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120}
          placeholder="Turning research curiosity into a career"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        <label className="mb-1 mt-3 block text-[11px] uppercase text-ink-faint">Field</label>
        <input value={field} onChange={(e) => setField(e.target.value)} maxLength={60}
          placeholder="Neuroscience"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        <label className="mb-1 mt-3 block text-[11px] uppercase text-ink-faint">Bio</label>
        <textarea value={gBio} onChange={(e) => setGBio(e.target.value)} rows={3} maxLength={800}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        <label className="mb-1 mt-3 block text-[11px] uppercase text-ink-faint">Affiliations (comma separated)</label>
        <input value={affil} onChange={(e) => setAffil(e.target.value)}
          placeholder="MIT, Stanford, YC W24"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="mt-4 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white">
          {guide ? "Update guide profile" : "Become a guide"}
        </button>
      </div>

      {guide && (
        <SessionTypeEditor guideId={guide.id} sessionTypes={sessionTypes ?? []} refetch={refetchTypes} />
      )}
    </div>
  );
}

function SessionTypeEditor({ guideId, sessionTypes, refetch }: {
  guideId: string;
  sessionTypes: Array<{ id: string; name: string; duration_minutes: number; price_cents: number; description: string | null }>;
  refetch: () => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dur, setDur] = useState(30);
  const [price, setPrice] = useState(0);

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name required");
      const { error } = await supabase.from("guide_session_types").insert({
        guide_id: guideId, name: name.trim(), description: desc.trim() || null,
        duration_minutes: dur, price_cents: Math.max(0, Math.round(price * 100)),
      });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setDesc(""); refetch(); toast.success("Session added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guide_session_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => refetch(),
  });

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h3 className="mb-3 text-sm font-semibold">Session types you offer</h3>
      <div className="space-y-2">
        {sessionTypes.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{s.name} · {s.duration_minutes}min</p>
              <p className="text-[11px] text-ink-faint">{s.price_cents === 0 ? "Free" : `$${(s.price_cents / 100).toFixed(0)}`}</p>
            </div>
            <button onClick={() => remove.mutate(s.id)} className="text-xs text-danger hover:underline">Remove</button>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Intro chat"
          className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)"
          className="col-span-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" />
        <input type="number" min={5} value={dur} onChange={(e) => setDur(+e.target.value)}
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" placeholder="Duration (min)" />
        <input type="number" min={0} value={price} onChange={(e) => setPrice(+e.target.value)}
          className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none" placeholder="Price USD" />
      </div>
      <button onClick={() => add.mutate()} disabled={add.isPending}
        className="mt-3 rounded-lg border border-line bg-panel-2 px-4 py-2 text-xs font-medium text-ink hover:bg-bg">
        Add session type
      </button>
    </div>
  );
}