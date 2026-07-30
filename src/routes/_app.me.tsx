import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyGuide, useMyProfile, useSession } from "@/lib/auth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Clock,
  Grid3X3,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  UserRoundPlus,
} from "lucide-react";

export const Route = createFileRoute("/_app/me")({
  head: () => ({
    meta: [{ title: "My profile — Unfold" }],
  }),
  component: MePage,
});

type GuideRow =
  | {
      id: string;
      headline: string;
      bio: string;
      field: string;
      accepting_bookings: boolean;
      verified: boolean;
      affiliations: string[] | null;
    }
  | null
  | undefined;

function MePage() {
  const { user } = useSession();
  const { data: profile } = useMyProfile();
  const { data: guide, refetch: refetchGuide } = useMyGuide();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"saved" | "bookings" | "guide">("saved");
  const [editingProfile, setEditingProfile] = useState(false);

  const [display, setDisplay] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: display.trim(),
          bio: bio.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      toast.success("Profile updated");
      setEditingProfile(false);
    },

    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  const becomeGuide = useMutation({
    mutationFn: async (input: {
      headline: string;
      bio: string;
      field: string;
      affiliations: string[];
    }) => {
      if (!user) throw new Error("You must be logged in");

      const { error } = await supabase.rpc("become_a_guide", {
        p_headline: input.headline,
        p_bio: input.bio,
        p_field: input.field,
        p_affiliations: input.affiliations,
      });

      if (error) throw error;
    },

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-guide", user?.id] });
      await qc.invalidateQueries({ queryKey: ["my-roles", user?.id] });
      await qc.invalidateQueries({ queryKey: ["guides-list"] });
      await refetchGuide();

      toast.success("You're now a guide!");
    },

    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Could not activate Guide Mode"
      );
    },
  });

  const { data: saved } = useQuery({
    queryKey: ["my-saved", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("opportunity:opportunities(*)")
        .eq("user_id", user!.id);

      if (error) throw error;

      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, session_type:guide_session_types(name, duration_minutes), guide:guides(id, headline)"
        )
        .eq("learner_id", user!.id)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;

      return data;
    },
  });

  const savedCount = saved?.length ?? 0;
  const bookingsCount = bookings?.length ?? 0;

  const isGuide = !!guide;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* PROFILE HEADER */}
      <section className="mb-6">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? "Profile"}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-panel-2"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-3xl font-semibold text-white ring-4 ring-panel-2">
                {(profile?.display_name ?? user?.email ?? "U")[0]?.toUpperCase()}
              </div>
            )}

            {isGuide && (
              <div className="absolute bottom-0 right-0 rounded-full bg-sage p-1.5 text-white">
                <CheckCircle2 size={14} />
              </div>
            )}
          </div>

          {/* Name */}
          {editingProfile ? (
            <input
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              className="mt-3 w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-center text-lg font-semibold outline-none focus:border-gold"
            />
          ) : (
            <h1 className="serif mt-3 text-lg font-semibold">
              {profile?.display_name ?? "Unnamed"}
            </h1>
          )}

          <p className="text-[11.5px] text-ink-faint">
            {profile?.username ? `@${profile.username}` : user?.email}
          </p>

          {/* Stats */}
          <div className="mt-4 flex w-full max-w-xs divide-x divide-line rounded-xl border border-line bg-panel">
            <div className="flex-1 py-3">
              <p className="text-sm font-semibold">{savedCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Saved
              </p>
            </div>

            <div className="flex-1 py-3">
              <p className="text-sm font-semibold">{bookingsCount}</p>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Bookings
              </p>
            </div>

            <div className="flex-1 py-3">
              <p className="text-sm font-semibold">
                {isGuide ? "Guide" : "User"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-ink-faint">
                Status
              </p>
            </div>
          </div>

          {/* Bio */}
          {editingProfile ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Tell people a little about yourself."
              className="mt-4 w-full max-w-xs rounded-lg border border-line bg-bg px-3 py-2 text-center text-sm outline-none focus:border-gold"
            />
          ) : (
            profile?.bio && (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-dim">
                {profile.bio}
              </p>
            )
          )}

          {/* Profile buttons */}
          {editingProfile ? (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                className="rounded-lg bg-gold px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {saveProfile.isPending ? "Saving..." : "Save"}
              </button>

              <button
                onClick={() => {
                  setEditingProfile(false);
                  setDisplay(profile?.display_name ?? "");
                  setBio(profile?.bio ?? "");
                }}
                className="rounded-lg border border-line px-4 py-1.5 text-xs font-medium text-ink-dim"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDisplay(profile?.display_name ?? "");
                setBio(profile?.bio ?? "");
                setEditingProfile(true);
              }}
              className="mt-3 rounded-lg border border-line px-4 py-1.5 text-xs font-medium hover:bg-panel-2"
            >
              Edit profile
            </button>
          )}
        </div>
      </section>

      {/* TABS */}
      <div className="mb-1 flex border-t border-line">
        {[
          { key: "saved" as const, label: "Saved", icon: Grid3X3 },
          { key: "bookings" as const, label: "Bookings", icon: CalendarDays },
          { key: "guide" as const, label: "Guide", icon: Sparkles },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-t-2 py-3 text-[11px] font-medium uppercase tracking-wide ${
              tab === key
                ? "border-gold text-gold"
                : "border-transparent text-ink-faint"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* SAVED */}
      {tab === "saved" && <SavedTab saved={saved ?? []} />}

      {/* BOOKINGS */}
      {tab === "bookings" && <BookingsTab bookings={bookings ?? []} />}

      {/* GUIDE */}
      {tab === "guide" && (
        <div className="mt-4">
          {guide ? (
            <GuideDashboard guide={guide} refetch={refetchGuide} />
          ) : (
            <BecomeGuideCard
              onBecome={(values) => becomeGuide.mutate(values)}
              isPending={becomeGuide.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   BECOME A GUIDE
========================================================= */

function BecomeGuideCard({
  onBecome,
  isPending,
}: {
  onBecome: (values: {
    headline: string;
    bio: string;
    field: string;
    affiliations: string[];
  }) => void;
  isPending: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [field, setField] = useState("");
  const [affiliations, setAffiliations] = useState("");

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!headline.trim()) {
      setError("Headline is required");
      return;
    }
    if (!field.trim()) {
      setError("Field is required");
      return;
    }
    if (!bio.trim()) {
      setError("Bio is required");
      return;
    }

    setError(null);

    onBecome({
      headline: headline.trim(),
      bio: bio.trim(),
      field: field.trim(),
      affiliations: affiliations
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    });
  };

  if (!showForm) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <UserRoundPlus size={25} />
        </div>

        <h2 className="serif text-xl font-semibold">Become a Guide</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-dim">
          Share your experience, knowledge, and career journey with people
          who are looking for guidance.
        </p>

        <button
          onClick={() => setShowForm(true)}
          className="mt-5 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white"
        >
          Become a Guide
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <button
        onClick={() => setShowForm(false)}
        className="mb-5 inline-flex items-center gap-1.5 text-xs text-ink-dim hover:text-ink"
      >
        <ArrowLeft size={13} />
        Back
      </button>

      <h2 className="serif text-xl font-medium">Set up your Guide profile</h2>

      <p className="mt-1 text-sm text-ink-dim">
        This information will be visible to people who discover your Guide
        profile.
      </p>

      <div className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-[11px] uppercase text-ink-faint">
            Headline
          </label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={120}
            placeholder="Frontend Developer helping people enter tech"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] uppercase text-ink-faint">
            Field
          </label>
          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            maxLength={60}
            placeholder="Technology, Design, Law, Sports..."
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] uppercase text-ink-faint">
            About your experience
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="Tell people what you've done and how you can help."
            className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] uppercase text-ink-faint">
            Affiliations
          </label>
          <input
            value={affiliations}
            onChange={(e) => setAffiliations(e.target.value)}
            placeholder="Companies, universities, communities..."
            className="w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
          <p className="mt-1 text-[10px] text-ink-faint">
            Separate multiple affiliations with commas.
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-5 w-full rounded-lg bg-gold py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isPending ? "Creating your Guide profile..." : "Become a Guide"}
      </button>
    </div>
  );
}

/* =========================================================
   GUIDE DASHBOARD (existing guide)
========================================================= */

function GuideDashboard({
  guide,
  refetch,
}: {
  guide: NonNullable<GuideRow>;
  refetch: () => void;
}) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const removeGuide = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("guides")
        .delete()
        .eq("id", guide.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["my-guide", user?.id] });
      await qc.invalidateQueries({ queryKey: ["my-roles", user?.id] });
      await qc.invalidateQueries({ queryKey: ["guides-list"] });
      await refetch();

      toast.success("Guide status removed");
      setConfirmingRemove(false);
    },

    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Could not remove Guide status"
      );
    },
  });

  return (
    <div className="space-y-4">
      {/* GUIDE MODE */}
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-white">
            <CheckCircle2 size={20} />
          </div>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gold">Guide Mode</h2>

            <p className="mt-1 text-xs text-ink-dim">
              Your Guide profile is active. People can now discover you
              and book sessions with you.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            to="/guides/$id"
            params={{ id: guide.id }}
            className="flex-1 rounded-lg border border-line px-4 py-2 text-center text-xs font-medium hover:bg-panel-2"
          >
            View public profile
          </Link>

          <Link
            to="/guide-post"
            className="flex-1 rounded-lg bg-gold px-4 py-2 text-center text-xs font-semibold text-white"
          >
            Create post
          </Link>
        </div>
      </div>

      {/* GUIDE PROFILE */}
      <GuideProfileCard guide={guide} refetch={refetch} />

      {/* SESSIONS */}
      <GuideSessionsSection guideId={guide.id} />

      {/* REMOVE GUIDE STATUS */}
      <div className="rounded-xl border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Danger zone</h3>
        <p className="mt-1 text-[11px] text-ink-faint">
          Remove your Guide profile. This deletes your headline, bio,
          field, affiliations, and session types. This can't be undone.
        </p>

        {!confirmingRemove ? (
          <button
            onClick={() => setConfirmingRemove(true)}
            className="mt-3 rounded-lg border border-danger/40 px-4 py-2 text-xs font-medium text-danger hover:bg-danger/10"
          >
            Remove Guide status
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => removeGuide.mutate()}
              disabled={removeGuide.isPending}
              className="rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {removeGuide.isPending ? "Removing..." : "Yes, remove it"}
            </button>

            <button
              onClick={() => setConfirmingRemove(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs text-ink-dim"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GuideProfileCard({
  guide,
  refetch,
}: {
  guide: NonNullable<GuideRow>;
  refetch: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const [headline, setHeadline] = useState(guide.headline ?? "");
  const [bio, setBio] = useState(guide.bio ?? "");
  const [field, setField] = useState(guide.field ?? "");
  const [affiliations, setAffiliations] = useState(
    (guide.affiliations ?? []).join(", ")
  );

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("guides")
        .update({
          headline: headline.trim(),
          bio: bio.trim(),
          field: field.trim(),
          affiliations: affiliations
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
        })
        .eq("id", guide.id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Guide profile updated");
      setEditing(false);
      refetch();
    },

    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Could not update profile");
    },
  });

  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Guide profile</h2>
          <p className="mt-1 text-[11px] text-ink-faint">
            This is what people see when they discover you.
          </p>
        </div>

        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-panel-2"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {!editing ? (
        <div>
          <h3 className="serif text-lg font-semibold">
            {guide.headline || "Add your headline"}
          </h3>

          <p className="mt-1 text-xs text-ink-faint">
            {guide.field || "Add your field"}
          </p>

          <p className="mt-4 text-sm leading-relaxed text-ink-dim">
            {guide.bio || "Add a short bio about yourself."}
          </p>

          {!!guide.affiliations?.length && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {guide.affiliations.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-panel-2 px-2.5 py-1 text-[10px] text-ink-dim"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Headline"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <input
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="Field"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell people about your work..."
            className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <input
            value={affiliations}
            onChange={(e) => setAffiliations(e.target.value)}
            placeholder="Affiliations, comma separated"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={() => update.mutate()}
            disabled={update.isPending}
            className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {update.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}

function GuideSessionsSection({ guideId }: { guideId: string }) {
  const { data: sessionTypes, refetch } = useQuery({
    queryKey: ["my-session-types", guideId],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_session_types")
        .select("*")
        .eq("guide_id", guideId)
        .order("created_at");

      if (error) throw error;

      return data ?? [];
    },
  });

  return (
    <SessionTypeEditor
      guideId={guideId}
      sessionTypes={sessionTypes ?? []}
      refetch={refetch}
    />
  );
}

/* =========================================================
   SAVED
========================================================= */

function SavedTab({ saved }: { saved: any[] }) {
  if (!saved.length) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-panel p-8 text-center">
        <Bookmark className="mx-auto mb-3 text-ink-faint" size={22} />
        <p className="serif text-lg">Nothing saved yet</p>
        <p className="mt-2 text-sm text-ink-dim">
          Save opportunities you want to come back to.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-0.5 grid grid-cols-3 gap-0.5">
      {saved.map((s) => {
        const o = s.opportunity as {
          id: string;
          title: string;
          organization: string;
          summary: string;
        } | null;

        if (!o) return null;

        return (
          <Link
            key={o.id}
            to="/opportunities/$id"
            params={{ id: o.id }}
            className="group relative aspect-square overflow-hidden bg-panel-2"
          >
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gold/25 to-panel-2 p-3">
              <span className="serif line-clamp-4 text-center text-xs font-medium leading-snug">
                {o.title}
              </span>
            </div>

            <div className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1">
              <Bookmark size={11} className="fill-white text-white" />
            </div>

            <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-2 opacity-0 transition group-hover:bg-black/60 group-hover:opacity-100">
              <p className="text-[10px] font-semibold text-white">
                {o.organization}
              </p>

              <p className="line-clamp-2 text-[9.5px] text-white/80">
                {o.summary}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* =========================================================
   BOOKINGS
========================================================= */

function BookingsTab({ bookings }: { bookings: any[] }) {
  if (!bookings.length) {
    return (
      <div className="mt-4 rounded-xl border border-line bg-panel p-8 text-center">
        <CalendarDays className="mx-auto mb-3 text-ink-faint" size={22} />
        <p className="serif text-lg">No bookings yet</p>
        <p className="mt-2 text-sm text-ink-dim">
          Sessions you book with guides will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {bookings.map((b) => {
        const st = b.session_type as {
          name: string;
          duration_minutes: number;
        } | null;

        const gd = b.guide as { id: string; headline: string } | null;

        return (
          <div key={b.id} className="rounded-xl border border-line bg-panel p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-sm font-semibold">{st?.name ?? "Session"}</p>

              <span className="mono rounded-md bg-panel-2 px-2 py-0.5 text-[9.5px] uppercase text-ink-dim">
                {b.status}
              </span>
            </div>

            <p className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
              <Clock size={11} />
              {formatDistanceToNow(new Date(b.scheduled_at), { addSuffix: true })}
              · {st?.duration_minutes ?? 0}min
            </p>

            {gd && (
              <Link
                to="/guides/$id"
                params={{ id: gd.id }}
                className="mt-2 inline-block text-xs text-gold"
              >
                View guide →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   SESSION EDITOR
========================================================= */

function SessionTypeEditor({
  guideId,
  sessionTypes,
  refetch,
}: {
  guideId: string;

  sessionTypes: Array<{
    id: string;
    name: string;
    duration_minutes: number;
    price_cents: number;
    description: string | null;
  }>;

  refetch: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Session name is required");
      if (duration < 5) throw new Error("Duration must be at least 5 minutes");

      const { error } = await supabase.from("guide_session_types").insert({
        guide_id: guideId,
        name: name.trim(),
        description: description.trim() || null,
        duration_minutes: duration,
        price_cents: Math.max(0, Math.round(price * 100)),
      });

      if (error) throw error;
    },

    onSuccess: () => {
      setName("");
      setDescription("");
      setDuration(30);
      setPrice(0);
      setShowAdd(false);

      refetch();
      toast.success("Session added");
    },

    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("guide_session_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      refetch();
      toast.success("Session removed");
    },

    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Sessions</h3>
          <p className="mt-1 text-[11px] text-ink-faint">
            Let people book time with you.
          </p>
        </div>

        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white"
        >
          <Plus size={13} />
          Add
        </button>
      </div>

      {sessionTypes.length === 0 && !showAdd && (
        <div className="rounded-lg border border-dashed border-line p-5 text-center">
          <CalendarDays className="mx-auto mb-2 text-ink-faint" size={20} />
          <p className="text-sm text-ink-dim">No sessions yet.</p>
          <p className="mt-1 text-[11px] text-ink-faint">
            Add your first session so people can book you.
          </p>
        </div>
      )}

      {sessionTypes.length > 0 && (
        <div className="space-y-2">
          {sessionTypes.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-line bg-bg px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{s.name}</p>

                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {s.duration_minutes} min ·{" "}
                  {s.price_cents === 0
                    ? "Free"
                    : `$${(s.price_cents / 100).toFixed(0)}`}
                </p>

                {s.description && (
                  <p className="mt-1 text-[10px] text-ink-faint">
                    {s.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => remove.mutate(s.id)}
                disabled={remove.isPending}
                className="rounded-lg p-2 text-ink-faint hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="mt-4 rounded-lg border border-line bg-bg p-4">
          <h4 className="mb-3 text-xs font-semibold">New session</h4>

          <div className="space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Intro chat"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-gold"
            />

            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you help with?"
              className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-gold"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] text-ink-faint">
                  Minutes
                </label>

                <input
                  type="number"
                  min={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] text-ink-faint">
                  Price ($)
                </label>

                <input
                  type="number"
                  min={0}
                  step="1"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => add.mutate()}
              disabled={add.isPending}
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {add.isPending ? "Adding..." : "Add session"}
            </button>

            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs text-ink-dim"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}