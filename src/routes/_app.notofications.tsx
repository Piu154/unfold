import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, markAllRead, markRead } from "@/lib/notifications";
import { useSession } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/notofications")({
  head: () => ({
    meta: [
      { title: "Alerts — Unfold" },
      { name: "description", content: "Deadline reminders, matching opportunities and organization posts." },
      { property: "og:title", content: "Alerts — Unfold" },
      { property: "og:description", content: "Real-time alerts for opportunities that match you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useSession();
  const { data, isLoading, unread } = useNotifications();
  const qc = useQueryClient();

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between animate-rise">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-gold" />
          <h1 className="serif text-3xl font-medium text-gradient">Alerts</h1>
          {unread > 0 && (
            <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">{unread}</span>
          )}
        </div>
        {unread > 0 && user && (
          <button
            onClick={async () => {
              await markAllRead(user.id);
              refresh();
            }}
            className="flex items-center gap-1.5 rounded-xl glass px-3 py-2 text-[12px] text-ink-dim hover:text-ink"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </header>

      {isLoading && <p className="text-sm text-ink-dim">Loading…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <div className="rounded-2xl glass p-12 text-center">
          <p className="serif text-xl">All quiet.</p>
          <p className="mt-2 text-sm text-ink-dim">
            Follow organizations and save opportunities — alerts arrive here in real time.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {(data ?? []).map((n, i) => {
          const body = (
            <div
              className={`animate-rise rounded-2xl glass p-4 lift hover:-translate-y-0.5 hover:border-gold/40 ${
                n.read ? "opacity-60" : ""
              }`}
              style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
            >
              <div className="flex items-center gap-2">
                <span className="mono rounded-full border border-violet/30 bg-violet-dim px-2 py-0.5 text-[9.5px] uppercase text-violet">
                  {n.type.replace("_", " ")}
                </span>
                <span className="text-[10.5px] text-ink-faint">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-ink">{n.title}</p>
              {n.body && <p className="mt-1 text-[13px] text-ink-dim">{n.body}</p>}
            </div>
          );

          return n.link ? (
            <Link
              key={n.id}
              to={n.link}
              onClick={async () => {
                await markRead(n.id);
                refresh();
              }}
              className="block"
            >
              {body}
            </Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
