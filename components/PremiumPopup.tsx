import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ThemedText, Heading } from "./ThemedText";
import { Card } from "./ThemedView";
import { Crown, X, Check, Zap } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PremiumPopupProps {
  visible: boolean;
  onDismiss: () => void;
}

const POPUP_DISMISSED_KEY = "premium_popup_dismissed";

export function PremiumPopup({ visible, onDismiss }: PremiumPopupProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleBuyPremium = async (plan: "monthly" | "quarterly") => {
    const telegramUrl = `https://t.me/satrackerbot`;

    try {
      const canOpen = await Linking.canOpenURL(telegramUrl);
      if (canOpen) {
        await Linking.openURL(telegramUrl);
      } else {
        if (Platform.OS === "web") {
          window.open(telegramUrl, "_blank");
        }
      }
    } catch (error) {
      console.error("Error opening Telegram:", error);
    }
  };

  const monthlyPrice = 34540;
  const quarterlyPrice = 97570;
  const savingsPercent = Math.round(
    ((monthlyPrice * 3 - quarterlyPrice) / (monthlyPrice * 3)) * 100,
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Card style={[styles.popup, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.background }]}
            onPress={onDismiss}
          >
            <X size={20} color={theme.textPrimary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View
                style={[styles.crownIcon, { backgroundColor: theme.primary }]}
              >
                <Crown size={32} color="#fff" fill="#fff" />
              </View>
              <Heading style={styles.title}>{t("welcomeToPremium")}</Heading>
              <ThemedText style={styles.subtitle}>
                {t("buyPremiumToUse")}
              </ThemedText>
            </View>

            {/* Features */}
            <View style={styles.features}>
              <FeatureItem
                icon="📅"
                text={t("premiumFeature1Title")}
                theme={theme}
              />
              <FeatureItem
                icon="⏱️"
                text={t("premiumFeature2Title")}
                theme={theme}
              />
              <FeatureItem
                icon="🔔"
                text={t("premiumFeature3Title")}
                theme={theme}
              />
              <FeatureItem
                icon="📊"
                text={t("premiumFeature4Title")}
                theme={theme}
              />
              <FeatureItem
                icon="💾"
                text={t("premiumFeature5Title")}
                theme={theme}
              />
            </View>

            {/* Pricing Cards */}
            <View style={styles.pricingSection}>
              {/* Monthly Plan */}
              <TouchableOpacity
                style={[styles.planCard, { borderColor: theme.border }]}
                onPress={() => handleBuyPremium("monthly")}
              >
                <ThemedText style={styles.planName}>
                  {t("monthlyPlan")}
                </ThemedText>
                <View style={styles.priceRow}>
                  <ThemedText style={[styles.price, { color: theme.primary }]}>
                    {monthlyPrice.toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.period}>
                    {" "}
                    {t("uzs")}/{t("month")}
                  </ThemedText>
                </View>
              </TouchableOpacity>

              {/* Quarterly Plan */}
              <TouchableOpacity
                style={[
                  styles.planCard,
                  styles.recommendedPlan,
                  {
                    borderColor: theme.primary,
                    backgroundColor: theme.primaryLight,
                  },
                ]}
                onPress={() => handleBuyPremium("quarterly")}
              >
                <View
                  style={[styles.bestBadge, { backgroundColor: theme.primary }]}
                >
                  <Zap size={10} color="#fff" fill="#fff" />
                  <ThemedText style={styles.bestBadgeText}>
                    {t("bestValue")}
                  </ThemedText>
                </View>
                <ThemedText style={styles.planName}>
                  {t("quarterlyPlan")}
                </ThemedText>
                <View style={styles.savingsRow}>
                  <ThemedText style={styles.oldPrice}>
                    {(monthlyPrice * 3).toLocaleString()}
                  </ThemedText>
                  <View style={styles.savingsBadge}>
                    <ThemedText style={styles.savingsText}>
                      {t("save_m")} {savingsPercent}%
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <ThemedText style={[styles.price, { color: theme.primary }]}>
                    {quarterlyPrice.toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.period}>
                    {" "}
                    {t("uzs")}/3{t("months")}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>

            {/* Contact Info */}
            <ThemedText style={styles.contactText}>
              {t("contactOnTelegram")}: @satrackerbot
            </ThemedText>
          </ScrollView>
        </Card>
      </View>
    </Modal>
  );
}

function FeatureItem({ icon, text, theme }: any) {
  return (
    <View style={styles.featureItem}>
      <ThemedText style={styles.featureIcon}>{icon}</ThemedText>
      <ThemedText style={styles.featureText}>{text}</ThemedText>
    </View>
  );
}

// Hook to auto-show popup for non-premium users
export function usePremiumPopup(isPremium: boolean) {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const checkPopup = async () => {
      if (isPremium) {
        setShowPopup(false);
        return;
      }

      const dismissed = await AsyncStorage.getItem(POPUP_DISMISSED_KEY);
      if (!dismissed) {
        // Show popup after a short delay
        setTimeout(() => setShowPopup(true), 1000);
      }
    };

    checkPopup();
  }, [isPremium]);

  const dismissPopup = async () => {
    await AsyncStorage.setItem(POPUP_DISMISSED_KEY, "true");
    setShowPopup(false);
  };

  return { showPopup, dismissPopup };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  popup: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    padding: 24,
    borderRadius: 24,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    fontWeight: "600",
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  pricingSection: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    position: "relative",
  },
  recommendedPlan: {
    borderWidth: 2,
  },
  bestBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bestBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  planName: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 20,
    fontWeight: "900",
  },
  period: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "700",
  },
  savingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  oldPrice: {
    fontSize: 12,
    opacity: 0.4,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  savingsBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#10b981",
  },
  contactText: {
    fontSize: 11,
    opacity: 0.5,
    textAlign: "center",
    fontWeight: "700",
  },
});
