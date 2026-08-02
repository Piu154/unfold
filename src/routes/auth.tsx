import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "../integrations/lovable/index";
import { Logo } from "../components/Logo";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

type ProfileType = "explorer" | "guide" | "institution";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),

  head: () => ({
    meta: [
      { title: "Sign in — Unfold" },
      {
        name: "description",
        content:
          "Sign in or create your Unfold account to discover opportunities, find guides, or connect institutions with experts.",
      },
    ],
  }),

  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [mode, setMode] = useState<"signin" | "signup">(
    search.mode ?? "signin"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [profileType, setProfileType] =
    useState<ProfileType>("explorer");

  const [loading, setLoading] = useState(false);
const continueAfterAuth = async (userId: string) => {
  // First check if there is an explicit redirect
  // requested by another part of the app.
  if (search.redirect) {
    navigate({ to: search.redirect });
    return;
  }

  // Get the user's profile type
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("profile_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile type:", error);
    throw error;
  }

  // SIGN UP
  if (mode === "signup") {
    // Save the selected type
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        profile_type: profileType,
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    if (profileType === "explorer") {
      navigate({
        to: "/explore",
        search: { redirect: "/explore" },
      });
      return;
    }

    if (profileType === "guide") {
      navigate({
        to: "/profile/guide",
        search: { redirect: "/feed" },
      });
      return;
    }

    if (profileType === "institution") {
      navigate({
        to: "/institution",
        search: { redirect: "/institution" },
      });
      return;
    }

    return;
  }

  // SIGN IN
  const type = profile?.profile_type;

  if (type === "explorer") {
    navigate({ to: "/explore" });
    return;
  }

  if (type === "guide") {
    navigate({ to: "/feed" });
    return;
  }

  if (type === "institution") {
    navigate({ to: "/institution" });
    return;
  }

  // Fallback for users whose profile_type is missing
  navigate({ to: "/explore" });
};
useEffect(() => {
  supabase.auth.getUser().then(async ({ data }) => {
    if (!data.user) return;

    await continueAfterAuth(data.user.id);
  });
}, [navigate]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      if (mode === "signup") {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(6, "At least 6 characters"),
            displayName: z
              .string()
              .trim()
              .min(1, "Enter your name")
              .max(60),
          })
          .safeParse({
            email,
            password,
            displayName,
          });

        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }

        /*
         * Create Supabase Auth account
         */
        const { data, error } = await supabase.auth.signUp({
          email,
          password,

          options: {
            emailRedirectTo: window.location.origin,

            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) throw error;

        /*
         * Supabase may require email confirmation.
         *
         * If there is no session yet, the profile row
         * cannot safely be updated from the browser.
         */
        if (!data.user) {
          toast.success(
            "Account created. Check your email to continue."
          );

          return;
        }

        /*
         * Save selected profile type
         */
        await continueAfterAuth(data.user.id);

        toast.success("Welcome to Unfold");
      } else {
        /* ------------------------------------------------
         * SIGN IN
         * ------------------------------------------------ */

        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;

        if (!data.user) {
          throw new Error("Unable to sign in");
        }

        await continueAfterAuth(data.user.id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * GOOGLE LOGIN
   * -------------------------------------------------- */

  const google = async () => {
    setLoading(true);

    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (res.error) {
        toast.error("Google sign-in failed");
        setLoading(false);
        return;
      }

      /*
       * OAuth normally redirects the browser.
       * Profile type selection for Google users will be
       * handled in the onboarding step later.
       */
      if (!res.redirected) {
       navigate({ to: "/onboarding" });
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Google sign-in failed"
      );

      setLoading(false);
    }
  };

  /* --------------------------------------------------
   * PROFILE TYPE OPTIONS
   * -------------------------------------------------- */

  const profileOptions: {
    value: ProfileType;
    title: string;
    description: string;
  }[] = [
    {
      value: "explorer",
      title: "I'm exploring",
      description:
        "I want to discover opportunities, fields, people and paths I didn't know existed.",
    },
    {
      value: "guide",
      title: "I'm a guide / expert",
      description:
        "I have experience to share and want to help people or get discovered by institutions.",
    },
    {
      value: "institution",
      title: "I'm a school / college",
      description:
        "I want to discover experts and invite them for seminars, workshops and student programs.",
    },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* ------------------------------------------------
          NAV
      ------------------------------------------------ */}

      <nav className="border-b border-line px-[5vw] py-4">
        <Link to="/">
          <Logo />
        </Link>
      </nav>

      {/* ------------------------------------------------
          MAIN
      ------------------------------------------------ */}

      <div className="mx-auto max-w-md px-6 py-12">
        {/* HEADER */}

        <h1 className="serif mb-2 text-3xl font-medium">
          {mode === "signup"
            ? "Start unfolding"
            : "Welcome back"}
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-ink-dim">
          {mode === "signup"
            ? "Tell us how you want to use Unfold. You can always grow into more than one role later."
            : "Sign in to pick up where you left off."}
        </p>

        {/* ------------------------------------------------
            GOOGLE
        ------------------------------------------------ */}

        <button
          onClick={google}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-panel py-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />

            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />

            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
            />

            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>

          Continue with Google
        </button>

        {/* DIVIDER */}

        <div className="mb-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />

          <span className="text-[10.5px] uppercase text-ink-faint">
            or with email
          </span>

          <span className="h-px flex-1 bg-line" />
        </div>

        {/* ------------------------------------------------
            FORM
        ------------------------------------------------ */}

        <form onSubmit={submit} className="space-y-3">
          {/* NAME */}

          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              required
              maxLength={60}
              className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-gold"
            />
          )}

          {/* EMAIL */}

          <input
            type="email"
            placeholder="you@somewhere.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-gold"
          />

          {/* PASSWORD */}

          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            minLength={6}
            className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-gold"
          />

          {/* ------------------------------------------------
              PROFILE TYPE
          ------------------------------------------------ */}

          {mode === "signup" && (
            <div className="pt-4">
              <div className="mb-3">
                <p className="text-sm font-medium">
                  How will you use Unfold?
                </p>

                <p className="mt-1 text-xs leading-relaxed text-ink-faint">
                  Choose the option that fits you best.
                </p>
              </div>

              <div className="space-y-2">
                {profileOptions.map((option) => {
                  const selected =
                    profileType === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setProfileType(option.value)
                      }
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-gold bg-gold/5"
                          : "border-line bg-panel hover:border-gold/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-gold"
                              : "border-ink-faint"
                          }`}
                        >
                          {selected && (
                            <div className="h-2 w-2 rounded-full bg-gold" />
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-sm font-medium ${
                              selected
                                ? "text-gold"
                                : "text-ink"
                            }`}
                          >
                            {option.title}
                          </p>

                          <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {/* SWITCH MODE */}

        <p className="mt-6 text-center text-xs text-ink-dim">
          {mode === "signup"
            ? "Have an account?"
            : "New here?"}{" "}
          <button
            onClick={() =>
              setMode(
                mode === "signup"
                  ? "signin"
                  : "signup"
              )
            }
            className="text-gold hover:underline"
          >
            {mode === "signup"
              ? "Sign in"
              : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
}