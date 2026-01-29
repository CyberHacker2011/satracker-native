import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
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
  Star,
  ShieldCheck,
  Zap,
  Globe,
  Github,
  Twitter,
  Share2,
} from "lucide-react-native";

export default function AboutScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const onShare = async () => {
    try {
      await Share.share({
        message:
          "Check out SAT Tracker - The ultimate SAT preparation companion!",
        url: "https://satracker.uz",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const FeatureCard = ({ icon: Icon, title, desc }: any) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.primary + "15" }]}>
        <Icon size={24} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText style={styles.cardDesc}>{desc}</ThemedText>
      </View>
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Heading style={{ fontSize: 20 }}>About</Heading>
          <TouchableOpacity onPress={onShare}>
            <Share2 size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.logoText}>S</ThemedText>
            </View>
            <Heading style={styles.appName}>SAT Tracker</Heading>
            <ThemedText style={styles.version}>
              Version 2.0.0 (Premium)
            </ThemedText>
          </View>

          <ThemedText style={styles.intro}>
            Empowering students worldwide to achieve their target SAT scores
            through intelligent planning and data-driven insights.
          </ThemedText>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>WHY CHOOSE US</ThemedText>
            <FeatureCard
              icon={Zap}
              title="Smart Planning"
              desc="Personalized daily missions tailored to your specific goals and weaknesses."
            />
            <FeatureCard
              icon={Star}
              title="Premium Experience"
              desc="Unlock exclusive tools, priority support, and advanced performance analytics."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Verified Content"
              desc="Curated study materials aligned with the latest Digital SAT standards."
            />
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              © {new Date().getFullYear()} SAT Tracker Team
            </ThemedText>
            <View style={styles.socials}>
              <Globe size={20} color={theme.textSecondary} />
              <Github size={20} color={theme.textSecondary} />
              <Twitter size={20} color={theme.textSecondary} />
            </View>
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
  container: { padding: 24, gap: 32 },
  hero: { alignItems: "center", gap: 12, marginBottom: 10 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  logoText: { color: "#fff", fontSize: 40, fontWeight: "bold" },
  appName: { fontSize: 32, fontWeight: "900" },
  version: { fontSize: 12, fontWeight: "800", opacity: 0.3, letterSpacing: 1 },
  intro: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
    opacity: 0.6,
    paddingHorizontal: 10,
  },
  section: { gap: 16 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.3,
    letterSpacing: 2,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 16,
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardDesc: { fontSize: 13, opacity: 0.5, marginTop: 4, lineHeight: 18 },
  footer: { alignItems: "center", marginTop: 20, gap: 16, paddingBottom: 40 },
  footerText: { fontSize: 12, opacity: 0.3, fontWeight: "700" },
  socials: { flexDirection: "row", gap: 24, opacity: 0.5 },
});
