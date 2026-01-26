import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { NotificationSystem } from "../components/NotificationSystem";
import { useUserActivity } from "../hooks/useUserActivity";
import { LanguageProvider } from "../context/LanguageContext";

function RootLayoutNav() {
  useUserActivity();
  const { theme, themeName } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialLoading(false);
    }).catch(() => {
      setInitialLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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
    if (!session && (inTabsGroup || (rootSegment !== "login" && rootSegment !== "signup" && rootSegment !== "+not-found" && rootSegment !== "privacy" && rootSegment !== "premium" && rootSegment !== "about"))) {
      router.replace("/login");
    } 
    // Logged in but on login/signup page
    else if (session && isAuthPage) {
      router.replace("/(tabs)");
    }
  }, [session, initialLoading, segments]);

  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
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
        <Stack.Screen name="archive" options={{ title: "Study Archive", headerBackTitle: "Back" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications", headerBackTitle: "Back" }} />
        <Stack.Screen name="about" options={{ title: "About", headerBackTitle: "Back" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy Policy", headerBackTitle: "Back" }} />
        <Stack.Screen name="premium" options={{ title: "Premium", headerBackTitle: "Back", headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutNav />
      </LanguageProvider>
    </ThemeProvider>
  );
}
