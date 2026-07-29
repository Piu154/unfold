import { Link } from "@tanstack/react-router";
import { Bookmark, Repeat2, Share2, ExternalLink, Sparkles, ShieldCheck, Clock, MapPin, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useSavedIds, useRepostedIds, useOpportunityActions, type Opportunity } from "@/lib/opportunities";

function daysLeft(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

export function OpportunityCard({
  o,
  reasons = [],
  index = 0,
}: {
  o: Opportunity;
  reasons?: string[];
  index?: number;
}) {
  const { data: savedIds } = useSavedIds();
  const { data: repostIds } = useRepostedIds();
  const actions = useOpportunityActions();

  const saved = savedIds?.has(o.id) ?? false;
  const reposted = repostIds?.has(o.id) ?? false;
  const left = o.deadline ? daysLeft(o.deadline) : null;

  const onShare = async () => {
    const url = `${window.location.origin}/opportunities/${o.id}`;
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) await navigator.share({ title: o.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
      await actions.share(o, canShare ? "native" : "clipboard");
    } catch {
      /* user dismissed */
    }
  };

  return (
    <article
      className="group relative animate-rise overflow-hidden rounded-2xl glass p-5 lift hover:-translate-y-1 hover:border-gold/40 hover:glow-ring"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mono rounded-full border border-violet/30 bg-violet-dim px-2.5 py-1 text-[9.5px] uppercase text-violet">
          {o.kind}
        </span>
        {o.domain && (
          <span className="mono rounded-full border border-line bg-panel-2 px-2.5 py-1 text-[9.5px] uppercase text-ink-dim">
            {o.domain}
          </span>
        )}
        {o.hidden_gem && (
          <span className="mono flex items-center gap-1 rounded-full border border-gold/40 bg-gold-dim px-2.5 py-1 text-[9.5px] uppercase text-gold">
            <Sparkles size={10} /> Hidden gem
          </span>
        )}
        {o.verified_source && (
          <span className="mono flex items-center gap-1 rounded-full border border-sage/30 bg-sage-dim px-2.5 py-1 text-[9.5px] uppercase text-sage">
            <ShieldCheck size={10} /> Official
          </span>
        )}
      </div>

      <Link to="/opportunities/$id" params={{ id: o.id }} onClick={() => actions.open(o)}>
        <h3 className="serif text-lg font-medium leading-snug text-ink transition-colors group-hover:text-gold">
          {o.title}
        </h3>
      </Link>
      <p className="mt-0.5 text-[11.5px] text-ink-faint">{o.organization}</p>

      {o.summary && <p className="mt-2.5 line-clamp-2 text-sm text-ink-dim">{o.summary}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-faint">
        {(o.location || o.country) && (
          <span className="flex items-center gap-1">
            <MapPin size={11} /> {[o.location, o.country].filter(Boolean).join(", ")}
          </span>
        )}
        {o.remote && (
          <span className="flex items-center gap-1 text-sage">
            <Globe size={11} /> Remote
          </span>
        )}
        {o.deadline && (
          <span className={`flex items-center gap-1 ${left !== null && left <= 7 ? "text-danger" : ""}`}>
            <Clock size={11} /> {formatDistanceToNow(new Date(o.deadline), { addSuffix: true })}
          </span>
        )}
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.slice(0, 3).map((r) => (
            <span key={r} className="rounded-full bg-gold-dim px-2 py-0.5 text-[10px] text-gold">
              {r}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => (actions.signedIn ? actions.toggleSave(o, saved) : toast.error("Sign in to save"))}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11.5px] transition ${
            saved ? "border-gold/50 bg-gold-dim text-gold" : "border-line bg-panel text-ink-dim hover:text-ink"
          }`}
        >
          <Bookmark size={13} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => (actions.signedIn ? actions.toggleRepost(o, reposted) : toast.error("Sign in to repost"))}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11.5px] transition ${
            reposted ? "border-sage/50 bg-sage-dim text-sage" : "border-line bg-panel text-ink-dim hover:text-ink"
          }`}
        >
          <Repeat2 size={13} /> {reposted ? "Reposted" : "Repost"}
        </button>
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-[11.5px] text-ink-dim transition hover:text-ink"
        >
          <Share2 size={13} /> Share
        </button>
        {o.url && (
          <a
            href={o.url}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => actions.open(o)}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet to-gold px-3.5 py-1.5 text-[11.5px] font-semibold text-[#05060c] transition hover:opacity-90"
          >
            Apply <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}
