import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PremiumStatus {
  isPremium: boolean;
  loading: boolean;
  subscriptionType: string | null;
  expiresAt: string | null;
}

const PREMIUM_CACHE_KEY = "premium_status_cache";

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
      // Load from cache first for instant UI update
      const cachedData = await AsyncStorage.getItem(PREMIUM_CACHE_KEY);
      if (cachedData && isMounted) {
        const cached = JSON.parse(cachedData);
        setStatus({
          ...cached,
          loading: true, // Still loading from server
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          const newStatus = {
            isPremium: false,
            loading: false,
            subscriptionType: null,
            expiresAt: null,
          };
          setStatus(newStatus);
          await AsyncStorage.setItem(
            PREMIUM_CACHE_KEY,
            JSON.stringify(newStatus),
          );
        }
        return false;
      }

      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("is_premium, premium_expires_at, subscription_type")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code !== "PGRST116") throw error;
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
        const newStatus = {
          isPremium,
          loading: false,
          subscriptionType: profile?.subscription_type || null,
          expiresAt: profile?.premium_expires_at || null,
        };
        setStatus(newStatus);
        // Cache for next time
        await AsyncStorage.setItem(
          PREMIUM_CACHE_KEY,
          JSON.stringify(newStatus),
        );
      }

      return isPremium;
    } catch (error: any) {
      if (error.name !== "AbortError" && isMounted) {
        console.error("Error checking premium status:", error);
        setStatus({
          isPremium: false,
          loading: false,
          subscriptionType: null,
          expiresAt: null,
        });
      }
      return false;
    }
  }, []);

  useEffect(() => {
    checkPremium();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
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
