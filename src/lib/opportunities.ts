import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Opportunity = {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  category: string | null;
  organization: string | null;
  location: string | null;
  application_url: string | null;
  deadline: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type OpportunityFilters = {
  q?: string;
  category?: string;
  location?: string;
  featured?: boolean;
};

export function useOpportunities(filters: OpportunityFilters = {}) {
  return useQuery({
    queryKey: ["opportunities", filters],

    queryFn: async () => {
      let query = supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.q) {
        const search = filters.q.trim();

        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,organization.ilike.%${search}%,category.ilike.%${search}%`
        );
      }

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }

      if (filters.featured !== undefined) {
        query = query.eq("featured", filters.featured);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data ?? []) as Opportunity[];
    },
  });
}