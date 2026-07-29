import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyRoles, useSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Unfold" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const { data: roles } = useMyRoles();
  const qc = useQueryClient();

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");

  // -----------------------------
  // PASSWORD
  // -----------------------------

  const updatePw = useMutation({
    mutationFn: async () => {
      if (newPw.length < 6) throw new Error("At least 6 chars");

      const { error } = await supabase.auth.updateUser({
        password: newPw,
      });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Password updated");
      setOldPw("");
      setNewPw("");
    },

    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed");
    },
  });

  // -----------------------------
  // INTERESTS
  // -----------------------------

  const { data: interests, refetch } = useQuery({
    queryKey: ["my-interests", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("interests")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data?.interests ?? [];
    },
  });

  const [newInterest, setNewInterest] = useState("");

  const saveInterests = useMutation({
    mutationFn: async (next: string[]) => {
      const { error } = await supabase
        .from("profiles")
        .update({ interests: next })
        .eq("id", user!.id);

      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-interests"] });
      refetch();
    },

    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to save interest");
    },
  });

  // -----------------------------
  // GUIDE
  // -----------------------------

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [field, setField] = useState("");
  const [affiliations, setAffiliations] = useState("");

  const { data: guide, isLoading: guideLoading } = useQuery({
    queryKey: ["my-guide", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  const becomeGuide = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in");

      if (!headline.trim()) {
        throw new Error("Headline is required");
      }

      if (!bio.trim()) {
        throw new Error("Bio is required");
      }

      if (!field.trim()) {
        throw new Error("Field is required");
      }

      const affiliationList = affiliations
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const { error } = await supabase.rpc("become_a_guide", {
        p_headline: headline.trim(),
        p_bio: bio.trim(),
        p_field: field.trim(),
        p_affiliations: affiliationList,
      });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Your guide profile is live!");

      setHeadline("");
      setBio("");
      setField("");
      setAffiliations("");

      qc.invalidateQueries({
        queryKey: ["my-guide", user?.id],
      });

      qc.invalidateQueries({
        queryKey: ["my-roles"],
      });
    },

    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : "Could not create guide profile"
      );
    },
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="serif mb-6 text-2xl font-medium">
        Settings
      </h1>

      {/* ACCOUNT */}
      <section className="mb-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Account
        </h2>

        <p className="text-[11.5px] text-ink-faint">
          Email: {user?.email}
        </p>

        <p className="text-[11.5px] text-ink-faint">
          Roles: {roles?.join(", ") || "user"}
        </p>
      </section>

      {/* INTERESTS */}
      <section className="mb-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Interests
        </h2>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(interests ?? []).map((i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-panel-2 px-3 py-1 text-[11.5px] text-ink-dim"
            >
              {i}

              <button
                onClick={() =>
                  saveInterests.mutate(
                    (interests ?? []).filter((x) => x !== i)
                  )
                }
                className="text-ink-faint hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            placeholder="e.g. neuroscience"
            className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
          />

          <button
            onClick={() => {
              const t = newInterest.trim();

              if (!t) return;

              const next = Array.from(
                new Set([...(interests ?? []), t])
              );

              saveInterests.mutate(next);
              setNewInterest("");
            }}
            className="rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-white"
          >
            Add
          </button>
        </div>
      </section>

      {/* BECOME A GUIDE */}
      <section className="mb-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-1 text-sm font-semibold">
          {guide ? "Your Guide Profile" : "Become a Guide"}
        </h2>

        <p className="mb-4 text-[11.5px] text-ink-faint">
          {guide
            ? "You are already a guide. You can build your profile and share your work with others."
            : "Use your existing account to create a guide profile. You do not need another account."}
        </p>

        {guideLoading ? (
          <p className="text-xs text-ink-faint">
            Loading...
          </p>
        ) : guide ? (
          <div className="rounded-xl bg-panel-2 p-4">
            <p className="text-sm font-semibold">
              {guide.headline}
            </p>

            <p className="mt-1 text-xs text-ink-dim">
              {guide.field}
            </p>

            <p className="mt-3 text-xs text-ink-faint">
              {guide.bio}
            </p>

            {guide.affiliations?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {guide.affiliations.map((item: string) => (
                  <span
                    key={item}
                    className="rounded-full bg-bg px-2.5 py-1 text-[10px] text-ink-dim"
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
              placeholder="Headline e.g. Sports Analyst & Researcher"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
            />

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about your work..."
              rows={4}
              className="w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
            />

            <input
              value={field}
              onChange={(e) => setField(e.target.value)}
              placeholder="Field e.g. Sports, Design, Law, AI"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
            />

            <input
              value={affiliations}
              onChange={(e) => setAffiliations(e.target.value)}
              placeholder="Affiliations (comma separated)"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
            />

            <button
              onClick={() => becomeGuide.mutate()}
              disabled={becomeGuide.isPending}
              className="rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {becomeGuide.isPending
                ? "Creating..."
                : "Become a Guide"}
            </button>
          </div>
        )}
      </section>

      {/* PASSWORD */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Change password
        </h2>

        <input
          type="password"
          placeholder="Current password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          className="mb-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
        />

        <input
          type="password"
          placeholder="New password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none"
        />

        <button
          onClick={() => updatePw.mutate()}
          disabled={updatePw.isPending}
          className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Update password
        </button>
      </section>
    </div>
  );
}