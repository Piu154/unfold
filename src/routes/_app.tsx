import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile, useMyRoles, useSession } from "@/lib/auth";
import { Logo } from "../components/Logo";
import { NotificationBell } from "../components/NotificationBell";
import { Home, Search, Sparkles, Users, User, Settings, Shield, LogOut, Bookmark, Radar, Bell } from "lucide-react";
import { StarField } from "../../src/components/StartField";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const NAV = [
  { to: "/discover", label: "Discover", icon: Sparkles },
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/sources", label: "Sources", icon: Radar },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/guides", label: "Guides", icon: Users },
  { to: "/me", label: "You", icon: User },
] as const;

function AppShell() {
  const { user, loading } = useSession();
  const { data: profile } = useMyProfile();
  const { data: roles } = useMyRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: location.pathname } });
  }, [user, loading, navigate, location.pathname]);

  const isAdmin = roles?.includes("admin");

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-ink-dim">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <StarField />
      {/* Topbar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-[5vw] py-3 backdrop-blur">
        <Link to="/"><Logo size={15} /></Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          {isAdmin && (
            <Link to="/admin" className="rounded-full border border-gold/40 bg-gold-dim px-3 py-1.5 text-[11px] font-medium text-gold">
              Admin
            </Link>
          )}
          <span className="hidden text-xs text-ink-dim sm:inline">{profile?.display_name ?? user.email}</span>
          <button onClick={signOut} title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-ink-dim hover:text-ink">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="sticky top-[61px] hidden h-[calc(100vh-61px)] border-r border-line bg-bg/40 p-4 backdrop-blur-xl md:block">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.to} to={n.to}
                className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-dim transition hover:bg-panel-2 hover:text-ink"
                activeProps={{ className: "mb-1 flex items-center gap-3 rounded-lg bg-gold-dim px-3 py-2.5 text-sm font-semibold text-gold" }}
              >
                <Icon size={16} /> {n.label}
              </Link>
            );
          })}
          <div className="my-3 h-px bg-line" />
          <Link to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-dim hover:bg-panel-2 hover:text-ink"
            activeProps={{ className: "flex items-center gap-3 rounded-lg bg-gold-dim px-3 py-2.5 text-sm font-semibold text-gold" }}>
            <Settings size={16} /> Settings
          </Link>
          {isAdmin && (
            <Link to="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-dim hover:bg-panel-2 hover:text-ink"
              activeProps={{ className: "flex items-center gap-3 rounded-lg bg-gold-dim px-3 py-2.5 text-sm font-semibold text-gold" }}>
              <Shield size={16} /> Admin
            </Link>
          )}
        </aside>

        <main className="min-h-[calc(100vh-61px)] pb-24">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-line bg-bg/90 backdrop-blur-xl md:hidden">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-ink-dim"
              activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] text-gold" }}>
              <Icon size={18} /> {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
