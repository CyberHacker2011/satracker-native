import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import { View, ActivityIndicator, Text, Platform, Linking } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { NotificationSystem } from "../components/NotificationSystem";
import { useUserActivity } from "../hooks/useUserActivity";
import { LanguageProvider } from "../context/LanguageContext";
import { ErrorBoundary } from "../components/ErrorBoundary";

function RootLayoutNav() {
  useUserActivity();
  const { theme, themeName } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) console.warn("Session error:", error);
        if (mounted) {
          setSession(data?.session ?? null);
        }
      } catch (e) {
        console.error("Supabase init error:", e);
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        if (event === "PASSWORD_RECOVERY") {
          router.replace("/reset-password");
        }
      }
    });

    // Safety timeout: If Supabase hangs (e.g. storage issues), force loading false after 3s
    const timeout = setTimeout(() => {
      if (mounted && initialLoading) {
        console.warn("Forcing initial loading to completion.");
        setInitialLoading(false);
      }
    }, 3000);

    // Handle deep links that might have fallen back to root
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // Check if this looks like a password recovery link
      // Supabase sends type=recovery in query, or we see tokens
      if (
        url.includes("type=recovery") ||
        url.includes("access_token=") ||
        url.includes("code=")
      ) {
        if (url.includes("reset-password")) {
          // Already heading there, do nothing to avoid loop or duplicate push
          return;
        }
        console.log(
          "Root detected auth link, redirecting to reset-password with params",
        );
        // Pass the original URL so the reset screen can parse it
        router.replace({
          pathname: "/reset-password",
          params: { originalUrl: url },
        });
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener("url", (e) => handleDeepLink(e.url));

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (initialLoading) return;

    const rootSegment = segments[0];
    const isAuthPage = rootSegment === "login" || rootSegment === "signup";
    const inTabsGroup = rootSegment === "(tabs)";

    // Handle root path / undefined segments
    if (!rootSegment) {
      if (session) router.replace("/(tabs)");
      else router.replace("/login");
      return;
    }

    // Not logged in and trying to access protected routes
    if (
      !session &&
      (inTabsGroup ||
        (rootSegment !== "login" &&
          rootSegment !== "signup" &&
          rootSegment !== "+not-found" &&
          rootSegment !== "privacy" &&
          rootSegment !== "premium" &&
          rootSegment !== "about"))
    ) {
      router.replace("/login");
    }
    // Logged in but on login/signup page
    else if (session && isAuthPage) {
      router.replace("/(tabs)");
    }
  }, [session, initialLoading, segments]);

  if (initialLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text
          style={{
            marginTop: 20,
            color: theme.textSecondary,
            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
          }}
        >
          Initializing...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      <NotificationSystem />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.primary,
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="archive"
          options={{ title: "Study Archive", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notifications", headerBackTitle: "Back" }}
        />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen
          name="about"
          options={{ title: "About", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="privacy"
          options={{ title: "Privacy Policy", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="premium"
          options={{
            title: "Premium",
            headerBackTitle: "Back",
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <RootLayoutNav />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
