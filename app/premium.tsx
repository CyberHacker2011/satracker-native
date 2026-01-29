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
import { ThemedView } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Crown,
  Check,
  Star,
  Zap,
  TrendingUp,
} from "lucide-react-native";
import { usePremium } from "../hooks/usePremium";
import { Button } from "../components/Button";

export default function PremiumScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { isPremium, subscriptionType, expiresAt } = usePremium();
  const [currency, setCurrency] = React.useState<"USD" | "UZS">("UZS");

  const prices = {
    UZS: { monthly: "34 000", quarterly: "87 000" },
    USD: { monthly: "$2.83", quarterly: "$7.25" }, // UZS / 12 approximately
  };

  const handleContact = async () => {
    const plan = prices[currency];
    const msg = `I want to buy Premium - ${currency} Plan`;
    const telegramUrl = `https://t.me/satrackerbot?text=${encodeURIComponent(msg)}`;
    if (await Linking.canOpenURL(telegramUrl))
      await Linking.openURL(telegramUrl);
    else if (Platform.OS === "web") window.open(telegramUrl, "_blank");
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/(tabs)")}>
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Heading style={{ fontSize: 20 }}>Premium</Heading>
          <View
            style={[
              styles.currencyPill,
              {
                backgroundColor: theme.primary + "15",
                borderColor: theme.primary + "30",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setCurrency("USD")}
              style={[
                styles.pillItem,
                currency === "USD" && { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.pillText,
                  { color: currency === "USD" ? "#fff" : theme.primary },
                ]}
              >
                USD
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCurrency("UZS")}
              style={[
                styles.pillItem,
                currency === "UZS" && { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.pillText,
                  { color: currency === "UZS" ? "#fff" : theme.primary },
                ]}
              >
                UZS
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <View
              style={[styles.crownIcon, { backgroundColor: theme.primary }]}
            >
              <Crown size={40} color="#fff" fill="#fff" />
            </View>
            <Heading style={styles.title}>
              {isPremium ? "Active Member" : "Elevate Your Study"}
            </Heading>
            <ThemedText style={styles.subtitle}>
              Unlock the full potential of your SAT preparation with exclusive
              features.
            </ThemedText>
          </View>

          <View style={styles.pricingRow}>
            <View style={[styles.planCard, { borderColor: theme.border }]}>
              <ThemedText style={styles.planLabel}>MONTHLY</ThemedText>
              <ThemedText style={styles.price}>
                {prices[currency].monthly}
                {currency === "UZS" && (
                  <ThemedText style={{ fontSize: 14 }}> uzs</ThemedText>
                )}
              </ThemedText>
              <ThemedText style={styles.priceSub}>per month</ThemedText>
              <Button
                title="Select"
                variant="secondary"
                style={styles.selectBtn}
                onPress={handleContact}
              />
            </View>
            <View
              style={[
                styles.planCard,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.primary + "08",
                },
              ]}
            >
              <View style={styles.bestBadge}>
                <ThemedText style={styles.bestText}>BEST VALUE</ThemedText>
              </View>
              <ThemedText style={styles.planLabel}>QUARTERLY</ThemedText>
              <ThemedText style={styles.price}>
                {prices[currency].quarterly}
                {currency === "UZS" && (
                  <ThemedText style={{ fontSize: 14 }}> uzs</ThemedText>
                )}
              </ThemedText>
              <ThemedText style={styles.priceSub}>save 15%</ThemedText>
              <Button
                title="Select"
                style={styles.selectBtn}
                onPress={handleContact}
              />
            </View>
          </View>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Check size={18} color={theme.primary} />
              <ThemedText style={styles.featureText}>
                Unlimited Focus Timer Sessions
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Check size={18} color={theme.primary} />
              <ThemedText style={styles.featureText}>
                Full History & Detailed Analytics
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Check size={18} color={theme.primary} />
              <ThemedText style={styles.featureText}>
                Smart Notifications & Reminders
              </ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Check size={18} color={theme.primary} />
              <ThemedText style={styles.featureText}>
                Priority Support
              </ThemedText>
            </View>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Questions? Contact us on Telegram
            </ThemedText>
            <TouchableOpacity onPress={handleContact}>
              <ThemedText
                style={{
                  color: theme.primary,
                  fontWeight: "800",
                  marginTop: 8,
                }}
              >
                @satrackerbot
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  container: { padding: 24, gap: 40 },
  hero: { alignItems: "center", gap: 16 },
  crownIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 28, textAlign: "center" },
  subtitle: {
    textAlign: "center",
    opacity: 0.5,
    lineHeight: 22,
    fontWeight: "600",
  },
  pricingRow: { flexDirection: "row", gap: 16 },
  planCard: {
    flex: 1,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
  },
  planLabel: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.4,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  price: { fontSize: 28, fontWeight: "900" },
  priceSub: {
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.4,
    marginTop: 4,
    marginBottom: 20,
  },
  selectBtn: { height: 44, width: "100%", borderRadius: 12 },
  bestBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bestText: { fontSize: 8, fontWeight: "900", color: "#fff" },
  features: { gap: 16 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 15, fontWeight: "700", opacity: 0.7 },
  footer: { alignItems: "center", marginTop: 20 },
  footerText: { opacity: 0.4, fontWeight: "600" },
  currencyPill: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillItem: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "900",
  },
});
