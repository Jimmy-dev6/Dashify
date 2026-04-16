"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type CalendarRow = Record<string, unknown>;

/**
 * Abonnement Realtime sur `calendar_events` pour un logement.
 */
export function useCalendarEvents(
  supabase: SupabaseClient | null,
  propertyId: string | null,
) {
  const [events, setEvents] = useState<CalendarRow[]>([]);

  useEffect(() => {
    if (!supabase || !propertyId) return;

    const channel = supabase
      .channel(`calendar_events:${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calendar_events",
          filter: `property_id=eq.${propertyId}`,
        },
        () => {
          // Rafraîchissement : brancher une requête .select() ou invalider React Query.
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, propertyId]);

  return { events, setEvents };
}
