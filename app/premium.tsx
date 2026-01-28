import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Crown,
  Check,
  Calendar,
  Clock,
  Bell,
  Database,
  RefreshCw,
  Zap,
  TrendingUp,
  Star,
} from "lucide-react-native";
import { usePremium } from "../hooks/usePremium";
import { useSafeBack } from "../hooks/useSafeBack";

export default function PremiumScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const safeBack = useSafeBack();
  const { isPremium, subscriptionType, expiresAt } = usePremium();

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

  const features = [
    {
      icon: Calendar,
      title: t("premiumFeature1Title"),
      description: t("premiumFeature1Desc"),
    },
    {
      icon: Clock,
      title: t("premiumFeature2Title"),
      description: t("premiumFeature2Desc"),
    },
    {
      icon: Bell,
      title: t("premiumFeature3Title"),
      description: t("premiumFeature3Desc"),
    },
    {
      icon: Database,
      title: t("premiumFeature4Title"),
      description: t("premiumFeature4Desc"),
    },
    {
      icon: RefreshCw,
      title: t("premiumFeature5Title"),
      description: t("premiumFeature5Desc"),
    },
  ];

  const monthlyPrice = 34540;
  const quarterlyPrice = 97570;
  const monthlySavings = monthlyPrice * 3 - quarterlyPrice;
  const savingsPercent = Math.round(
    (monthlySavings / (monthlyPrice * 3)) * 100,
  );

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity
            onPress={safeBack}
            style={[
              styles.backButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.crownIcon,
                { backgroundColor: isPremium ? "#FFD700" : theme.primary },
              ]}
            >
              {isPremium ? (
                <Star size={32} color="#fff" fill="#fff" />
              ) : (
                <Crown size={32} color="#fff" fill="#fff" />
              )}
            </View>
            <Heading style={styles.title}>
              {isPremium ? t("premiumActive") : t("getPremium")}
            </Heading>
            <ThemedText style={styles.subtitle}>
              {isPremium ? t("expandSubscription") : t("unlockAllFeatures")}
            </ThemedText>
            {isPremium && expiresAt && (
              <Card
                style={[
                  styles.premiumBadge,
                  {
                    backgroundColor: theme.primaryLight,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <ThemedText
                  style={[styles.premiumBadgeText, { color: theme.primary }]}
                >
                  {subscriptionType === "monthly"
                    ? t("monthlyPlan")
                    : t("quarterlyPlan")}{" "}
                  • {t("expires")}: {formatExpiryDate(expiresAt)}
                </ThemedText>
              </Card>
            )}
          </View>

          {/* Pricing Cards FIRST */}
          <View style={styles.pricingSection}>
            <Heading style={styles.sectionTitle}>
              {isPremium ? t("extendPremium") : t("choosePlan")}
            </Heading>

            {/* Monthly Plan */}
            <Card
              style={[
                styles.pricingCard,
                styles.verticalCard,
                { borderColor: theme.border },
              ]}
            >
              <View style={styles.pricingHeader}>
                <ThemedText style={styles.planName}>
                  {t("monthlyPlan")}
                </ThemedText>
                <View style={styles.pricingRow}>
                  <ThemedText style={[styles.price, { color: theme.primary }]}>
                    {monthlyPrice.toLocaleString()} {t("uzs")}
                  </ThemedText>
                  <ThemedText style={styles.period}>/ {t("month")}</ThemedText>
                </View>
              </View>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText style={styles.benefitText}>
                    {t("fullAccess")}
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText style={styles.benefitText}>
                    {t("allFeatures")}
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText style={styles.benefitText}>
                    {t("monthlyUpdates")}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.buyButton,
                  { backgroundColor: theme.card, borderColor: theme.primary },
                ]}
                onPress={() => handleBuyPremium("monthly")}
              >
                <ThemedText
                  style={[styles.buyButtonText, { color: theme.primary }]}
                >
                  {isPremium ? t("extendPlan") : t("selectPlan")}
                </ThemedText>
              </TouchableOpacity>
            </Card>

            {/* Quarterly Plan (Best Value) */}
            <Card
              style={[
                styles.pricingCard,
                styles.verticalCard,
                styles.recommendedCard,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.primaryLight,
                },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <TrendingUp size={12} color="#fff" />
                <ThemedText style={styles.badgeText}>
                  {t("bestValue")}
                </ThemedText>
              </View>

              <View style={styles.pricingHeader}>
                <ThemedText style={styles.planName}>
                  {t("quarterlyPlan")}
                </ThemedText>
                <View style={styles.pricingRow}>
                  <View style={styles.oldPriceContainer}>
                    <ThemedText style={styles.oldPrice}>
                      {(monthlyPrice * 3).toLocaleString()} {t("uzs")}
                    </ThemedText>
                    <View
                      style={[
                        styles.strikethrough,
                        { backgroundColor: theme.textSecondary },
                      ]}
                    />
                  </View>
                  <View style={styles.savingsBadge}>
                    <Zap size={12} color="#10b981" fill="#10b981" />
                    <ThemedText style={styles.savingsText}>
                      {t("save_m")} {savingsPercent}%
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.pricingRow}>
                  <ThemedText
                    style={[
                      styles.price,
                      styles.bigPrice,
                      { color: theme.primary },
                    ]}
                  >
                    {quarterlyPrice.toLocaleString()} {t("uzs")}
                  </ThemedText>
                  <ThemedText style={styles.period}>
                    / 3 {t("months")}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText style={styles.benefitText}>
                    {t("fullAccess")}
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText style={styles.benefitText}>
                    {t("allFeatures")}
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText style={styles.benefitText}>
                    {t("futureUpdates")}
                  </ThemedText>
                </View>
                <View style={styles.benefitItem}>
                  <Check size={16} color="#10b981" />
                  <ThemedText
                    style={[
                      styles.benefitText,
                      { fontWeight: "900", color: theme.primary },
                    ]}
                  >
                    {t("lockPrice")}
                  </ThemedText>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.buyButton,
                  styles.primaryButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => handleBuyPremium("quarterly")}
              >
                <Crown size={16} color="#fff" fill="#fff" />
                <ThemedText
                  style={[styles.buyButtonText, styles.primaryButtonText]}
                >
                  {isPremium ? t("extendPlan") : t("getBestDeal")}
                </ThemedText>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Features Grid AFTER pricing */}
          <View style={styles.featuresSection}>
            <Heading style={styles.sectionTitle}>{t("whatYouGet")}</Heading>
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} style={styles.featureCard}>
                    <View
                      style={[
                        styles.featureIconBox,
                        { backgroundColor: theme.primaryLight },
                      ]}
                    >
                      <Icon size={24} color={theme.primary} />
                    </View>
                    <ThemedText style={styles.featureTitle}>
                      {feature.title}
                    </ThemedText>
                    <ThemedText style={styles.featureDesc}>
                      {feature.description}
                    </ThemedText>
                  </Card>
                );
              })}
            </View>
          </View>

          {/* Benefits Notice */}
          <Card
            style={[
              styles.noticeCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.noticeHeader}>
              <Clock size={20} color={theme.primary} />
              <ThemedText
                style={[styles.noticeTitle, { color: theme.primary }]}
              >
                {t("priceGuarantee")}
              </ThemedText>
            </View>
            <ThemedText style={styles.noticeText}>
              {t("priceGuaranteeDesc")}
            </ThemedText>
          </Card>

          {/* Contact Info */}
          <Card style={[styles.contactCard, { backgroundColor: theme.card }]}>
            <ThemedText style={styles.contactTitle}>
              {t("readyToUpgrade")}
            </ThemedText>
            <ThemedText style={styles.contactText}>
              {t("contactForPremium")}
            </ThemedText>
            <TouchableOpacity
              style={[styles.telegramButton, { backgroundColor: "#0088cc" }]}
              onPress={() => handleBuyPremium("monthly")}
            >
              <ThemedText style={styles.telegramButtonText}>
                {t("contactOnTelegram")}
              </ThemedText>
            </TouchableOpacity>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    fontWeight: "600",
    textAlign: "center",
  },
  premiumBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  pricingSection: {
    marginBottom: 40,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 20,
  },
  pricingCard: {
    padding: 28,
    borderWidth: 2,
    position: "relative",
  },
  verticalCard: {
    minHeight: 280,
  },
  recommendedCard: {
    borderWidth: 2,
  },
  badge: {
    position: "absolute",
    top: -12,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  pricingHeader: {
    marginBottom: 24,
    gap: 10,
  },
  planName: {
    fontSize: 20,
    fontWeight: "900",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  oldPriceContainer: {
    position: "relative",
  },
  oldPrice: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.4,
  },
  strikethrough: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  savingsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#10b981",
  },
  price: {
    fontSize: 26,
    fontWeight: "900",
  },
  bigPrice: {
    fontSize: 30,
  },
  period: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.5,
  },
  benefitsList: {
    gap: 14,
    marginBottom: 24,
    flex: 1,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.7,
  },
  buyButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
  },
  primaryButton: {
    borderWidth: 0,
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
  primaryButtonText: {
    color: "#fff",
  },
  featuresSection: {
    marginBottom: 40,
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 20,
    gap: 12,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  featureDesc: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.6,
    lineHeight: 20,
  },
  noticeCard: {
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
    lineHeight: 20,
  },
  contactCard: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  contactText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 20,
  },
  telegramButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  telegramButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
});
