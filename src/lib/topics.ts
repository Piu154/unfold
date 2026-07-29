import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Topic = { id: string; slug: string; label: string; category: string };

/** The approved subject vocabulary. Everything posted on Unfold must be tagged from it. */
export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").order("category").order("label");
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });
}

export function groupTopics(topics: Topic[]) {
  return topics.reduce<Record<string, Topic[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});
}
