import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { usePremium } from "../hooks/usePremium";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ThemedText } from "./ThemedText";
import { PremiumPopup } from "./PremiumPopup";

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
  showUpgrade?: boolean;
}

export function PremiumGate({
  children,
  feature,
  showUpgrade = true,
}: PremiumGateProps) {
  const { isPremium, loading } = usePremium();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);

  // All hooks must be at the top - fix for hooks violation
  React.useEffect(() => {
    // Only show popup if loading is done and user is NOT premium
    if (!loading && !isPremium) {
      setShowPopup(true);
    } else if (!loading && isPremium) {
      // Close popup if it was open and user became premium
      setShowPopup(false);
    }
  }, [loading, isPremium]);

  const handleDismiss = () => {
    setShowPopup(false);
    // Safe navigation with fallback to dashboard
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      router.replace("/(tabs)");
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 12, opacity: 0.5 }}>
          {t("checking")}...
        </ThemedText>
      </View>
    );
  }

  if (!isPremium) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <PremiumPopup visible={showPopup} onDismiss={handleDismiss} />
        {!showPopup && (
          <View style={{ alignItems: "center", opacity: 0.5 }}>
            <ThemedText>🔒 Premium Feature</ThemedText>
            <TouchableOpacity
              onPress={() => setShowPopup(true)}
              style={{
                marginTop: 20,
                padding: 10,
                backgroundColor: theme.primary,
                borderRadius: 8,
              }}
            >
              <ThemedText style={{ color: "white" }}>Unlock</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
