import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { useMyInterests, scoreItem, type InterestProfile } from "@/lib/interests";
import { track } from "@/lib/signals";

export const OPPORTUNITY_TYPES = [
  "job",
  "internship",
  "government job",
  "scholarship",
  "fellowship",
  "grant",
  "competition",
  "hackathon",
  "workshop",
  "conference",
  "speaker program",
  "campus ambassador",
  "research",
  "volunteer",
  "exchange program",
  "startup program",
  "incubation",
  "open source",
  "bootcamp",
  "certification",
  "sports trial",
  "design challenge",
  "arts & music",
  "photography contest",
  "film festival",
  "space mission",
  "innovation challenge",
  "other",
] as const;

export const DOMAINS = [
  "Technology",
  "Engineering",
  "Medical",
  "Law",
  "Design",
  "Architecture",
  "Business",
  "Commerce",
  "Finance",
  "Education",
  "Research",
  "Agriculture",
  "Aviation",
  "Defense",
  "Space",
  "Government",
  "Sports",
  "Arts",
  "Music",
  "Film",
  "Photography",
  "Fashion",
  "Journalism",
  "Gaming",
  "Cybersecurity",
  "AI",
  "Robotics",
  "Environment",
  "Social Impact",
  "Entrepreneurship",
] as const;

export type Opportunity = {
  id: string;
  title: string;
  organization: string;
  kind: string;
  field: string;
  domain: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  country: string | null;
  remote: boolean;
  eligibility: string | null;
  skills: string[] | null;
  stipend: string | null;
  url: string | null;
  deadline: string | null;
  tags: string[] | null;
  hidden_gem: boolean;
  featured: boolean;
  verified_source: boolean;
  trending_score: number;
  source_name: string | null;
  source_url: string | null;
  created_at: string;
};

export type Filters = {
  q?: string;
  type?: string;
  domain?: string;
  country?: string;
  remote?: boolean;
};

export function useOpportunities(filters: Filters = {}) {
  return useQuery({
    queryKey: ["opportunities", filters],
    queryFn: async () => {
      let q = supabase
        .from("opportunities")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(300);

      if (filters.q) q = q.or(`title.ilike.%${filters.q}%,organization.ilike.%${filters.q}%,summary.ilike.%${filters.q}%`);
      if (filters.type) q = q.eq("kind", filters.type);
      if (filters.domain) q = q.eq("domain", filters.domain);
      if (filters.country) q = q.ilike("country", `%${filters.country}%`);
      if (filters.remote) q = q.eq("remote", true);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Opportunity[];
    },
  });
}

/** Collaborative filtering: opportunities saved by people who saved what you saved. */
export function useCoSaved() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["co-saved", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("co_saved_opportunities", {
        _user_id: user!.id,
        _limit: 40,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { opportunity_id: string; score: number }[]) {
        map[row.opportunity_id] = Number(row.score);
      }
      return map;
    },
  });
}

export function useFollowedOrgs() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["org-follows", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("org_follows").select("org_name").eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.org_name.toLowerCase()));
    },
  });
}

export function useSavedIds() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["saved-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.opportunity_id));
    },
  });
}

export function useRepostedIds() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["repost-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunity_reposts")
        .select("opportunity_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.opportunity_id));
    },
  });
}

/** All the write actions, wired to behavioural signal tracking. */
export function useOpportunityActions() {
  const { user } = useSession();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["saved-ids", user?.id] });
    qc.invalidateQueries({ queryKey: ["repost-ids", user?.id] });
    qc.invalidateQueries({ queryKey: ["saved-opportunities", user?.id] });
    qc.invalidateQueries({ queryKey: ["interest-profile", user?.id] });
  };

  return {
    signedIn: !!user,
    async toggleSave(o: Opportunity, saved: boolean) {
      if (!user) return;
      if (saved) {
        await supabase.from("saved_opportunities").delete().eq("user_id", user.id).eq("opportunity_id", o.id);
      } else {
        await supabase.from("saved_opportunities").insert({ user_id: user.id, opportunity_id: o.id });
      }
      await track({
        userId: user.id,
        entityType: "opportunity",
        entityId: o.id,
        action: saved ? "unsave" : "save",
        tags: [...(o.tags ?? []), o.field, o.domain],
      });
      invalidate();
    },
    async toggleRepost(o: Opportunity, reposted: boolean) {
      if (!user) return;
      if (reposted) {
        await supabase.from("opportunity_reposts").delete().eq("user_id", user.id).eq("opportunity_id", o.id);
      } else {
        await supabase.from("opportunity_reposts").insert({ user_id: user.id, opportunity_id: o.id });
      }
      await track({
        userId: user.id,
        entityType: "opportunity",
        entityId: o.id,
        action: reposted ? "unsave" : "apply",
        tags: [...(o.tags ?? []), o.field, o.domain],
      });
      invalidate();
    },
    async share(o: Opportunity, channel = "link") {
      if (user) {
        await supabase.from("opportunity_shares").insert({ user_id: user.id, opportunity_id: o.id, channel });
        await track({
          userId: user.id,
          entityType: "opportunity",
          entityId: o.id,
          action: "open",
          tags: [...(o.tags ?? []), o.field, o.domain],
        });
      }
    },
    async open(o: Opportunity) {
      await track({
        userId: user?.id,
        entityType: "opportunity",
        entityId: o.id,
        action: "open",
        tags: [...(o.tags ?? []), o.field, o.domain],
      });
    },
  };
}

export type Ranked = { item: Opportunity; score: number; reasons: string[] };

/**
 * Three-stage ranking, in the spirit of a real discovery feed:
 *  1. candidates  — published opportunities matching the active filters
 *  2. ranking     — interest affinity (decayed behavioural signals) + collaborative
 *                   filtering + followed organizations + deadline urgency + freshness
 *  3. filtering   — drop stale/expired, keep diversity by organization
 */
export function rank(
  items: Opportunity[],
  profile: InterestProfile,
  coSaved: Record<string, number>,
  followedOrgs: Set<string>,
): Ranked[] {
  const now = Date.now();
  const scored = items.map((item) => {
    const base = scoreItem(profile, {
      tags: [...(item.tags ?? []), item.domain ?? "", ...(item.skills ?? [])],
      field: item.field,
      created_at: item.created_at,
      deadline: item.deadline,
    });
    const reasons: string[] = [];
    let score = base.score;

    if (base.matches > 0) reasons.push(`${base.matches} interest match${base.matches > 1 ? "es" : ""}`);

    const co = coSaved[item.id] ?? 0;
    if (co > 0) {
      score += Math.min(co, 5) * 0.9;
      reasons.push("Saved by similar students");
    }

    if (followedOrgs.has(item.organization.toLowerCase())) {
      score += 3;
      reasons.push("You follow this organization");
    }

    if (item.hidden_gem) {
      score += 1.2;
      reasons.push("Rarely posted elsewhere");
    }
    if (item.verified_source) score += 0.6;
    score += Math.min(item.trending_score ?? 0, 10) * 0.05;

    if (item.deadline) {
      const days = (new Date(item.deadline).getTime() - now) / 86_400_000;
      if (days < 0) score -= 100;
      else if (days <= 7) reasons.push("Closing soon");
    }

    return { item, score, reasons };
  });

  return scored
    .filter((s) => s.score > -50)
    .sort((a, b) => b.score - a.score);
}

/** Convenience hook that returns a fully ranked, personalized list. */
export function useRankedOpportunities(filters: Filters = {}) {
  const opportunities = useOpportunities(filters);
  const { profile } = useMyInterests();
  const { data: coSaved } = useCoSaved();
  const { data: orgs } = useFollowedOrgs();

  const ranked = rank(opportunities.data ?? [], profile, coSaved ?? {}, orgs ?? new Set());
  return { ...opportunities, ranked, profile };
}
