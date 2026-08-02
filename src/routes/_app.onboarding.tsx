import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome to Unfold" },
      {
        name: "description",
        content: "Choose how you want to use Unfold.",
      },
    ],
  }),
  component: OnboardingPage,
});

const ROLES = [
  {
    id: "explorer",
    title: "Explorer",
    description:
      "I want to discover opportunities, careers, experts, programs and paths.",
    icon: "✦",
  },
  {
    id: "guide",
    title: "Guide / Expert",
    description:
      "I have experience or knowledge that I want to share with others.",
    icon: "◈",
  },
  {
    id: "school",
    title: "School / College",
    description:
      "I represent an institution looking for experts, speakers or mentors.",
    icon: "⌂",
  },
];

function OnboardingPage() {
  const navigate = useNavigate();

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleRole = (role: string) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role],
    );
  };

  const continueSetup = async () => {
    if (selectedRoles.length === 0) {
      toast.error("Choose at least one option");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate({ to: "/auth" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          roles: selectedRoles,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile started");

      navigate({ to: "/feed" });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save your profile",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <nav className="border-b border-line px-[5vw] py-4">
        <Logo />
      </nav>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <p className="mono text-[10px] uppercase tracking-widest text-gold">
            Welcome to Unfold
          </p>

          <h1 className="serif mt-4 text-3xl font-medium sm:text-4xl">
            What brings you here?
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-dim">
            Choose everything that describes you. You can change this later.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {ROLES.map((role) => {
            const selected = selectedRoles.includes(role.id);

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.id)}
                className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-gold bg-gold/5"
                    : "border-line bg-panel hover:border-gold/50"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
                    selected
                      ? "bg-gold text-white"
                      : "bg-panel-2 text-ink-dim"
                  }`}
                >
                  {role.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="serif text-base font-medium">
                      {role.title}
                    </h2>

                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        selected
                          ? "border-gold bg-gold text-white"
                          : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </div>

                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-dim">
                    {role.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={continueSetup}
          disabled={loading || selectedRoles.length === 0}
          className="mt-8 w-full rounded-xl bg-gold py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: "#1c1919" }}
        >
          {loading ? "Saving..." : "Continue →"}
        </button>

        <p className="mt-4 text-center text-[11px] text-ink-faint">
          You can select more than one.
        </p>
      </main>
    </div>
  );
}