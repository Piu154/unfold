import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;

      setUser(data.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function useMyRoles() {
  const { user } = useSession();

  return useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);

      if (error) throw error;

      return (data ?? []).map(
        (r) => r.role as "admin" | "guide" | "user"
      );
    },
  });
}

export function useMyProfile() {
  const { user } = useSession();

  return useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          bio,
          avatar_url,
          interests,
          headline,
          education,
          skills,
          career_goal,
          location,
          profile_type,
          roles
        `)
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });
}

export function useMyGuide() {
  const { user } = useSession();

  return useQuery({
    queryKey: ["my-guide", user?.id],
    enabled: !!user,

    queryFn: async () => {
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });
}