import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

interface PremiumStatus {
  isPremium: boolean;
  loading: boolean;
  subscriptionType: string | null;
  expiresAt: string | null;
}

export function usePremium() {
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    loading: true,
    subscriptionType: null,
    expiresAt: null,
  });

  const checkPremium = useCallback(async () => {
    let isMounted = true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (isMounted) {
          setStatus({ isPremium: false, loading: false, subscriptionType: null, expiresAt: null });
        }
        return false;
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("is_premium, premium_expires_at, subscription_type")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // If error is PGRST116 (no rows), user profile might not exist yet
        if (error.code !== 'PGRST116') throw error;
      }

      let isPremium = profile?.is_premium || false;

      // Check if premium has expired
      if (isPremium && profile?.premium_expires_at) {
        const expiryDate = new Date(profile.premium_expires_at);
        const now = new Date();
        
        if (expiryDate < now) {
          // Premium expired, update database
          await supabase
            .from("user_profiles")
            .update({ is_premium: false })
            .eq("user_id", user.id);
          isPremium = false;
        }
      }

      if (isMounted) {
        setStatus({
          isPremium,
          loading: false,
          subscriptionType: profile?.subscription_type || null,
          expiresAt: profile?.premium_expires_at || null,
        });
      }

      return isPremium;
    } catch (error: any) {
      if (error.name !== 'AbortError' && isMounted) {
        console.error("Error checking premium status:", error);
        setStatus({ isPremium: false, loading: false, subscriptionType: null, expiresAt: null });
      }
      return false;
    }
  }, []);

  useEffect(() => {
    checkPremium();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPremium();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkPremium]);

  return {
    ...status,
    refetch: checkPremium,
  };
}
