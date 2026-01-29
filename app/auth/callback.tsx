import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import * as Linking from "expo-linking";
import { ThemedText } from "../../components/ThemedText";

export default function AuthCallback() {
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const handleSession = async () => {
      try {
        // 1. Get current URL
        const url = await Linking.getInitialURL();
        if (!url) {
          console.warn("No init URL in callback");
          return router.replace("/login");
        }

        // 2. Parse hash manually if Supabase client doesn't pick it up automatically
        // (Supabase "detectSessionInUrl" usually handles this, but explicit is safer for custom redirects)
        if (url.includes("#") || url.includes("?")) {
          const paramsString = url.split("#")[1] || url.split("?")[1];
          if (paramsString) {
            const params = new URLSearchParams(paramsString);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!error && mounted) {
                return router.replace("/(tabs)");
              }
            }
          }
        }

        // 3. Last check: if session exists already
        const { data } = await supabase.auth.getSession();
        if (data.session && mounted) {
          router.replace("/(tabs)");
        } else {
          // If we're stuck here, maybe just go to login after a timeout
          setTimeout(() => {
            if (mounted) router.replace("/login");
          }, 3000);
        }
      } catch (e) {
        console.error("Auth Callback Error:", e);
        router.replace("/login");
      }
    };

    handleSession();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color={theme.primary} />
      <ThemedText style={{ marginTop: 20, opacity: 0.6 }}>
        Finalizing Sign In...
      </ThemedText>
    </View>
  );
}
