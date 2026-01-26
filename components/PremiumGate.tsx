import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
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

export function PremiumGate({ children, feature, showUpgrade = true }: PremiumGateProps) {
  const { isPremium, loading } = usePremium();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(!isPremium && !loading);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 12, opacity: 0.5 }}>
          {t('checking')}...
        </ThemedText>
      </View>
    );
  }

  if (!isPremium) {
    return (
      <>
        {children}
        <PremiumPopup visible={showPopup} onDismiss={() => setShowPopup(false)} />
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
