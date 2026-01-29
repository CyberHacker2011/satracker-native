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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <View
          style={{
            alignItems: "center",
            opacity: 0.8,
            backgroundColor: theme.card,
            padding: 30,
            borderRadius: 20,
            width: "100%",
            maxWidth: 400,
          }}
        >
          <ThemedText style={{ fontSize: 40, marginBottom: 20 }}>🔒</ThemedText>
          <ThemedText
            style={{
              fontSize: 20,
              fontWeight: "bold",
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            Premium Feature
          </ThemedText>
          <ThemedText
            style={{
              textAlign: "center",
              color: theme.textSecondary,
              marginBottom: 24,
            }}
          >
            {feature ? `The ${feature} feature` : "This content"} is available
            for premium members only.
          </ThemedText>

          {showUpgrade && (
            <TouchableOpacity
              onPress={() => router.push("/premium")}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: theme.primary,
                borderRadius: 12,
                width: "100%",
              }}
            >
              <ThemedText
                style={{
                  color: "white",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Upgrade Now
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
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
