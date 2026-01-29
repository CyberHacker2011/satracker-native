import { Stack, useRouter, useSegments } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import {
  View,
  ActivityIndicator,
  Text,
  Platform,
  Linking,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { NotificationSystem } from "../components/NotificationSystem";
import { useUserActivity } from "../hooks/useUserActivity";
import { LanguageProvider } from "../context/LanguageContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { CustomDrawerContent } from "../components/CustomDrawerContent";
import { Timer, ChevronLeft, Clock, X, Menu } from "lucide-react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { SidebarToggle } from "../components/SidebarToggle";

function RootLayoutNav() {
  useUserActivity();
  const { theme, themeName } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const { sidebarVisible, toggleSidebar } = useSidebar();

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

    const timeout = setTimeout(() => {
      if (mounted && initialLoading) {
        console.warn("Forcing initial loading to completion.");
        setInitialLoading(false);
      }
    }, 3000);

    const handleDeepLink = async (url: string | null) => {
      if (!url) return;

      // WORKAROUND: Handle cases where URL fragments are treated as paths or missing #
      // e.g. https://app.satracker.uz/access_token=...
      let customUrl = url;
      if (customUrl.includes("/access_token")) {
        // Force it to be a hash or query so parsing works standardly
        customUrl = customUrl.replace("/access_token", "#access_token");
      }

      // Standard Hash/Query Check
      if (
        customUrl.includes("access_token") &&
        customUrl.includes("refresh_token")
      ) {
        // Parse hash params safely
        const str = customUrl.replace("#", "?");
        try {
          const urlObj = new URL(str);
          let params = new URLSearchParams(
            urlObj.search || urlObj.hash.replace("#", ""),
          );

          let accessToken = params.get("access_token");
          let refreshToken = params.get("refresh_token");

          // Fallback regex if URLSearchParams fails
          if (!accessToken) {
            const matchAccess = customUrl.match(/access_token=([^&]*)/);
            if (matchAccess) accessToken = matchAccess[1];
            const matchRefresh = customUrl.match(/refresh_token=([^&]*)/);
            if (matchRefresh) refreshToken = matchRefresh[1];
          }

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (!error) {
              return;
            }
          }
        } catch (e) {
          console.warn("Deep link parse error", e);
        }
      }

      if (customUrl.includes("type=recovery")) {
        router.replace("/reset-password");
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

    if (!rootSegment) {
      if (session) router.replace("/(tabs)");
      else router.replace("/login");
      return;
    }

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
    } else if (session && isAuthPage) {
      router.replace("/(tabs)");
    }
  }, [session, initialLoading, segments]);

  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 768;
  const sidebarWidthVal = isSmallScreen ? 280 : 240;
  const sidebarWidth = useSharedValue(sidebarVisible ? sidebarWidthVal : 0);

  useEffect(() => {
    sidebarWidth.value = withTiming(sidebarVisible ? sidebarWidthVal : 0, {
      duration: 300,
    });
  }, [sidebarVisible, isSmallScreen, sidebarWidthVal]);

  const animatedSidebarStyle = useAnimatedStyle(() => ({
    width: sidebarWidth.value,
    borderRightWidth: sidebarWidth.value > 0 ? 1 : 0,
    position: isSmallScreen ? "absolute" : "relative",
    zIndex: 1000,
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(sidebarVisible ? 1 : 0),
    display: sidebarVisible || sidebarWidth.value > 0 ? "flex" : "none",
  }));

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

  const rootSegment = segments[0];
  const isAuthPage = rootSegment === "login" || rootSegment === "signup";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        flexDirection: "row",
      }}
    >
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />

      {!!session && !isAuthPage && (
        <>
          {isSmallScreen && sidebarVisible && (
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  zIndex: 999,
                },
                animatedBackdropStyle,
              ]}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={toggleSidebar}
              />
            </Animated.View>
          )}
          <Animated.View
            style={[
              {
                overflow: "hidden",
                borderRightColor: theme.border,
                height: "100%",
                backgroundColor: theme.card,
              },
              animatedSidebarStyle,
            ]}
          >
            <CustomDrawerContent onClose={toggleSidebar} />
          </Animated.View>
        </>
      )}

      <View style={{ flex: 1, position: "relative", overflow: "visible" }}>
        <NotificationSystem />
        <Stack
          screenOptions={{
            headerLeft: () => <SidebarToggle />,
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
          <Stack.Screen
            name="reset-password"
            options={{ headerShown: false }}
          />
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
    </View>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SidebarProvider>
          <LanguageProvider>
            <RootLayoutNav />
          </LanguageProvider>
        </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
