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

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) =>
    searchSchema.parse(s),

  head: () => ({
    meta: [
      { title: "Sign in — Unfold" },
      {
        name: "description",
        content:
          "Sign in or create your Unfold account to discover opportunities, people, ideas and communities.",
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
  const [loading, setLoading] = useState(false);

  /*
   * ---------------------------------------------
   * AFTER AUTH
   * ---------------------------------------------
   *
   * Everyone enters the same application.
   *
   * No explorer / guide / institution routing.
   */

  const continueAfterAuth = () => {
    const redirectTo = search.redirect || "/feed";

    navigate({
      to: redirectTo,
    });
  };

  /*
   * ---------------------------------------------
   * CHECK EXISTING SESSION
   * ---------------------------------------------
   */

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        continueAfterAuth();
      }
    };

    checkUser();
  }, [search.redirect]);

  /*
   * ---------------------------------------------
   * EMAIL AUTH
   * ---------------------------------------------
   */

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      /*
       * SIGN UP
       */

      if (mode === "signup") {
        const parsed = z
          .object({
            email: z.string().email("Enter a valid email"),
            password: z
              .string()
              .min(6, "At least 6 characters"),
            displayName: z
              .string()
              .trim()
              .min(1, "Enter your name")
              .max(60, "Name is too long"),
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

        const { data, error } =
          await supabase.auth.signUp({
            email: parsed.data.email,
            password: parsed.data.password,

            options: {
              emailRedirectTo: window.location.origin,

              data: {
                display_name:
                  parsed.data.displayName,
              },
            },
          });

        if (error) {
          throw error;
        }

        /*
         * Email confirmation may be enabled
         * in Supabase.
         */

        if (!data.session) {
          toast.success(
            "Account created. Check your email to continue."
          );

          return;
        }

        toast.success("Welcome to Unfold");

        continueAfterAuth();

        return;
      }

      /*
       * SIGN IN
       */

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Unable to sign in");
      }

      toast.success("Welcome back");

      continueAfterAuth();
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

  /*
   * ---------------------------------------------
   * GOOGLE AUTH
   * ---------------------------------------------
   */

  const google = async () => {
    setLoading(true);

    try {
      const redirectTo =
        `${window.location.origin}/auth` +
        (search.redirect
          ? `?redirect=${encodeURIComponent(search.redirect)}`
          : "");

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",

          options: {
            redirectTo,
          },
        });

      if (error) {
        throw error;
      }

      /*
       * Supabase handles the browser redirect.
       */
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Google sign-in failed"
      );

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">

      {/* -----------------------------------------
          NAV
      ----------------------------------------- */}

      <nav className="border-b border-line px-[5vw] py-4">
        <Link to="/">
          <Logo />
        </Link>
      </nav>

      {/* -----------------------------------------
          MAIN
      ----------------------------------------- */}

      <div className="mx-auto max-w-md px-6 py-16">

        {/* HEADER */}

        <h1 className="serif mb-2 text-3xl font-medium">
          {mode === "signup"
            ? "Start unfolding"
            : "Welcome back"}
        </h1>

        <p className="mb-8 text-sm leading-relaxed text-ink-dim">
          {mode === "signup"
            ? "Create your account and start exploring Unfold."
            : "Sign in to pick up where you left off."}
        </p>

        {/* -----------------------------------------
            GOOGLE
        ----------------------------------------- */}

        <button
          type="button"
          onClick={google}
          disabled={loading}
          className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-panel py-3 text-sm font-medium text-ink hover:bg-panel-2 disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 48 48"
          >
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

        {/* -----------------------------------------
            FORM
        ----------------------------------------- */}

        <form
          onSubmit={submit}
          className="space-y-3"
        >

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
            onChange={(e) =>
              setEmail(e.target.value)
            }
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
            type="button"
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