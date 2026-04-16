"use client";

import { useCallback, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAvailability, type AvailabilityConflict } from "@/lib/availability";

export function useAvailability(supabase: SupabaseClient | null) {
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<AvailabilityConflict[] | null>(null);

  const run = useCallback(
    async (params: {
      propertyId: string;
      checkIn: string;
      checkOut: string;
    }) => {
      if (!supabase) {
        setConflicts([]);
        return [];
      }
      setLoading(true);
      try {
        const c = await checkAvailability(supabase, params);
        setConflicts(c);
        return c;
      } finally {
        setLoading(false);
      }
    },
    [supabase],
  );

  return { loading, conflicts, check: run };
}
