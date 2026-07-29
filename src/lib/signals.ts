import { supabase } from "@/integrations/supabase/client";

export type SignalAction = "view" | "open" | "save" | "unsave" | "apply" | "watch" | "follow";

const WEIGHTS: Record<SignalAction, number> = {
  view: 0.5,
  open: 1,
  watch: 1.5,
  follow: 2.5,
  save: 3,
  apply: 4,
  unsave: -3,
};

/**
 * Record a behaviour signal. Fire-and-forget: never blocks or breaks the UI.
 * These events feed the recommendation profile in `interests.ts`.
 */
export async function track(input: {
  userId?: string | null;
  entityType: "opportunity" | "post" | "guide";
  entityId: string;
  action: SignalAction;
  tags?: (string | null | undefined)[];
}) {
  if (!input.userId) return;
  const tags = Array.from(
    new Set((input.tags ?? []).filter(Boolean).map((t) => String(t).toLowerCase().trim())),
  ).filter(Boolean);
  try {
    await supabase.from("interaction_events").insert({
      user_id: input.userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      tags,
      weight: WEIGHTS[input.action] ?? 1,
    });
  } catch {
    /* signals are best-effort */
  }
}
