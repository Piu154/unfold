import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { useFollowedOrgs } from "@/lib/opportunities";
import { Radar, ExternalLink, Bell, BellRing, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sources")({
  head: () => ({
    meta: [
      { title: "Official sources — Unfold" },
      { name: "description", content: "The official organizations and career portals Unfold tracks for rare opportunities." },
      { property: "og:title", content: "Official sources — Unfold" },
      { property: "og:description", content: "Subscribe to official organizations and get alerted the moment they post." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SourcesPage,
});

type Source = {
  id: string;
  name: string;
  website: string | null;
  careers_url: string | null;
  hiring_type: string | null;
  typical_roles: string | null;
  domain: string | null;
  notes: string | null;
};

function SourcesPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: followed } = useFollowedOrgs();

  const { data, isLoading } = useQuery({
    queryKey: ["ingestion-sources"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingestion_sources").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Source[];
    },
  });

  const toggle = async (name: string, isFollowing: boolean) => {
    if (!user) return toast.error("Sign in to subscribe");
    if (isFollowing) {
      await supabase.from("org_follows").delete().eq("user_id", user.id).eq("org_name", name);
      toast("Unsubscribed from " + name);
    } else {
      await supabase.from("org_follows").insert({ user_id: user.id, org_name: name });
      toast.success("Subscribed — you'll be alerted when " + name + " posts");
    }
    qc.invalidateQueries({ queryKey: ["org-follows", user.id] });
  };

  const list = (data ?? []).filter((s) =>
    q ? (s.name + " " + (s.domain ?? "")).toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6 animate-rise">
        <div className="flex items-center gap-2">
          <Radar size={20} className="text-gold" />
          <h1 className="serif text-3xl font-medium text-gradient">Official sources</h1>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-dim">
          These are the official portals we watch — the kind of rare openings that rarely surface on LinkedIn.
          Subscribe to an organization and you'll be alerted the moment something lands here.
        </p>
      </header>

      <div className="relative mb-5 max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search organizations…"
          className="w-full rounded-xl glass py-2.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-gold/50"
        />
      </div>

      {isLoading && <p className="text-sm text-ink-dim">Loading…</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {list.map((s, i) => {
          const following = followed?.has(s.name.toLowerCase()) ?? false;
          return (
            <div
              key={s.id}
              className="animate-rise rounded-2xl glass p-4 lift hover:-translate-y-0.5 hover:border-gold/40"
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {s.domain && (
                      <span className="mono rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[9.5px] uppercase text-ink-dim">
                        {s.domain}
                      </span>
                    )}
                    {s.hiring_type && <span className="text-[10.5px] text-ink-faint">{s.hiring_type}</span>}
                  </div>
                  {s.typical_roles && <p className="mt-2 text-[12px] text-ink-dim">{s.typical_roles}</p>}
                </div>
                <button
                  onClick={() => toggle(s.name, following)}
                  title={following ? "Unsubscribe" : "Subscribe"}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                    following ? "border-gold/50 bg-gold-dim text-gold" : "border-line bg-panel text-ink-dim hover:text-ink"
                  }`}
                >
                  {following ? <BellRing size={15} /> : <Bell size={15} />}
                </button>
              </div>

              <div className="mt-3 flex gap-3 text-[11.5px]">
                {s.careers_url && (
                  <a
                    href={s.careers_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-gold hover:underline"
                  >
                    Careers page <ExternalLink size={11} />
                  </a>
                )}
                {s.website && (
                  <a
                    href={s.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-ink-faint hover:text-ink"
                  >
                    Website <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
