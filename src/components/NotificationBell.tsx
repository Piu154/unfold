import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { useNotifications, markRead, markAllRead } from "@/lib/notifications";
import { useSession } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { subscribeToPush, pushSupported } from "@/lib/push";
import { toast } from "sonner";

export function NotificationBell() {
  const { user } = useSession();
  const { data: notifs, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Prompt for OS push permission the first time a user opens the panel
  const [pushOffered, setPushOffered] = useState(false);
  useEffect(() => {
    if (!open || pushOffered || !user || !pushSupported()) return;
    if (Notification.permission === "default") setPushOffered(true);
  }, [open, pushOffered, user]);

  const enablePush = async () => {
    if (!user) return;
    const res = await subscribeToPush(user.id);
    if (res.ok) toast.success("Push notifications enabled");
    else toast.message(res.reason ?? "Could not enable push");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-ink-dim hover:text-ink"
        aria-label="Notifications"
      >
        {unread > 0 ? <BellRing size={16} className="text-gold" /> : <Bell size={16} />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-[340px] rounded-2xl border border-line bg-panel shadow-xl">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-ink">Notifications</h3>
            {(notifs?.length ?? 0) > 0 && (
              <button
                onClick={() => user && markAllRead(user.id)}
                className="flex items-center gap-1 text-[11px] text-ink-dim hover:text-gold"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </header>

          {pushOffered && Notification.permission === "default" && (
            <div className="border-b border-line bg-gold-dim px-4 py-3">
              <p className="text-[12px] text-ink">Get real-time alerts even when Unfold is closed.</p>
              <button
                onClick={enablePush}
                className="mt-2 rounded-lg bg-gold px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                Turn on push
              </button>
            </div>
          )}

          <div className="max-h-[380px] overflow-y-auto">
            {(!notifs || notifs.length === 0) && (
              <div className="p-8 text-center">
                <p className="text-sm text-ink-dim">No notifications yet.</p>
                <p className="mt-1 text-[11px] text-ink-faint">Follow guides and save opportunities to hear when things change.</p>
              </div>
            )}
            {notifs?.map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  await markRead(n.id);
                  if (n.link) navigate({ to: n.link });
                  setOpen(false);
                }}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-line px-4 py-3 text-left transition hover:bg-panel-2 ${!n.read ? "bg-gold-dim/40" : ""}`}
              >
                <p className="text-[13px] font-medium text-ink">{n.title}</p>
                {n.body && <p className="text-[12px] text-ink-dim">{n.body}</p>}
                <p className="mt-0.5 text-[10px] text-ink-faint">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
