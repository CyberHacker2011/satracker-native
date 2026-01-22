import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useUserActivity() {
  useEffect(() => {
    async function updateActivity() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();

      await supabase
        .from("user_activity")
        .upsert(
          {
            user_id: user.id,
            last_seen_at: now,
          },
          { onConflict: "user_id" }
        );
    }

    updateActivity();
    
    // Also update periodicially? In web it's only on mount.
    // Let's stick to mount for now to match exactly.
  }, []);
}
