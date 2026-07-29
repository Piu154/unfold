import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export type InterestProfile = {
  /** topic -> affinity weight (higher = stronger interest) */
  weights: Record<string, number>;
  /** strongest topics, descending */
  top: string[];
  isEmpty: boolean;
};

const HALF_LIFE_DAYS = 30;

function decay(iso: string | null | undefined) {
  if (!iso) return 1;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return Math.pow(0.5, Math.max(0, days) / HALF_LIFE_DAYS);
}

function add(map: Record<string, number>, tag: string | null | undefined, w: number) {
  if (!tag) return;
  const k = tag.toLowerCase().trim();
  if (!k) return;
  map[k] = (map[k] ?? 0) + w;
}

/**
 * Builds the user's interest profile from three sources, strongest first:
 *  1. explicit behaviour (saves, applies, opens, watches) with recency decay
 *  2. saved opportunities (tags / category / field)
 *  3. guides they follow (field / affiliations)
 */
export function useMyInterests() {
  const { user } = useSession();
  const query = useQuery({
    queryKey: ["interest-profile", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    queryFn: async (): Promise<InterestProfile> => {
      const weights: Record<string, number> = {};

      const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
      const [{ data: events }, { data: saved }, { data: follows }] = await Promise.all([
        supabase
          .from("interaction_events")
          .select("tags, weight, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("saved_opportunities")
          .select("opportunity:opportunities(tags, category, field)")
          .eq("user_id", user!.id),
        supabase.from("follows").select("guide_id").eq("follower_id", user!.id),
      ]);

      for (const e of events ?? []) {
        const w = (e.weight ?? 1) * decay(e.created_at);
        for (const t of e.tags ?? []) add(weights, t, w);
      }

      for (const s of saved ?? []) {
        const o = s.opportunity as {
          tags?: string[] | null;
          category?: string | null;
          field?: string | null;
        } | null;
        if (!o) continue;
        (o.tags ?? []).forEach((t) => add(weights, t, 3));
        add(weights, o.category, 2);
        add(weights, o.field, 2);
      }

      const guideIds = (follows ?? []).map((f) => f.guide_id);
      if (guideIds.length) {
        const { data: guides } = await supabase
          .from("guides")
          .select("field, affiliations")
          .in("id", guideIds);
        for (const g of guides ?? []) {
          add(weights, g.field, 2.5);
          (g.affiliations ?? []).forEach((t: string) => add(weights, t, 1));
        }
      }

      const top = Object.entries(weights)
        .filter(([, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t);

      return { weights, top, isEmpty: top.length === 0 };
    },
  });

  const empty = useMemo<InterestProfile>(() => ({ weights: {}, top: [], isEmpty: true }), []);
  return { ...query, profile: query.data ?? empty };
}

/** Relevance score for a taggable item: interest affinity + freshness, minus staleness. */
export function scoreItem(
  profile: InterestProfile,
  item: { tags?: string[] | null; field?: string | null; created_at?: string | null; deadline?: string | null },
) {
  const bag = new Set(
    [...(item.tags ?? []), item.field ?? ""].filter(Boolean).map((t) => String(t).toLowerCase().trim()),
  );
  let affinity = 0;
  let matches = 0;
  for (const t of bag) {
    const w = profile.weights[t];
    if (w && w > 0) {
      affinity += w;
      matches += 1;
    }
  }

  const freshness = item.created_at ? decay(item.created_at) : 0.5;

  let urgency = 0;
  if (item.deadline) {
    const days = (new Date(item.deadline).getTime() - Date.now()) / 86_400_000;
    if (days > 0 && days < 45) urgency = 1.5 * (1 - days / 45);
  }

  return { score: affinity * 1 + freshness * 1.5 + urgency, matches, affinity };
}
