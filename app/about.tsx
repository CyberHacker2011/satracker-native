import React from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Stack, useRouter } from "expo-router";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Clock,
  Zap,
  CheckCircle2,
  BarChart3,
  Star,
  Calendar,
} from "lucide-react-native";
import { useSafeBack } from "../hooks/useSafeBack";

export default function AboutScreen() {
  const { theme, themeName } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const safeBack = useSafeBack();

  const features = [
    {
      title: t("studyPlanner"),
      desc: t("studyPlanningDesc"),
      icon: Calendar,
      color: "#f59e0b",
      bg: "#fef3c7",
    },
    {
      title: t("classicTimer"),
      desc: t("focusTimerLongDesc"),
      icon: Clock,
      color: "#3b82f6",
      bg: "#dbeafe",
    },
    {
      title: t("dailyCheckIn"),
      desc: t("dailyCheckInsLongDesc"),
      icon: CheckCircle2,
      color: "#10b981",
      bg: "#dcfce7",
    },
    {
      title: t("studyHistory"),
      desc: t("progressTrackerDesc"),
      icon: BarChart3,
      color: "#8b5cf6",
      bg: "#f3e8ff",
    },
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: t("aboutApp"),
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={safeBack} style={{ marginLeft: 16 }}>
              <ChevronLeft color={theme.textPrimary} size={28} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <View
              style={[styles.badge, { backgroundColor: theme.primaryLight }]}
            >
              <ThemedText style={[styles.badgeText, { color: theme.primary }]}>
                {t("premiumStudyCompanion")}
              </ThemedText>
            </View>
            <Heading style={styles.heroTitle}>
              Plan. Track.{" "}
              <ThemedText style={{ color: theme.primary }}>
                {t("start").toUpperCase()}.
              </ThemedText>
            </Heading>
            <ThemedText style={styles.heroSub}>{t("aboutHeroDesc")}</ThemedText>
          </View>

          <View style={styles.section}>
            <Heading style={styles.sectionTitle}>
              {t("everythingYouNeed")}
            </Heading>
            <ThemedText style={styles.sectionSub}>
              {t("smartToolsDesc")}
            </ThemedText>

            <View style={styles.featureGrid}>
              {features.map((f, i) => (
                <Card key={i} style={styles.featureCard}>
                  <View style={[styles.iconBox, { backgroundColor: f.bg }]}>
                    <f.icon size={24} color={f.color} />
                  </View>
                  <ThemedText style={styles.featureTitle}>{f.title}</ThemedText>
                  <ThemedText style={styles.featureDesc}>{f.desc}</ThemedText>
                </Card>
              ))}
            </View>
          </View>

          <Card style={[styles.ctaCard, { backgroundColor: theme.primary }]}>
            <Star color="#fff" size={32} style={{ marginBottom: 16 }} />
            <Heading style={styles.ctaTitle}>{t("readyOptimizeSAT")}</Heading>
            <ThemedText style={styles.ctaSub}>{t("aboutCTADesc")}</ThemedText>
          </Card>

          <View style={styles.footer}>
            <ThemedText style={styles.version}>
              SAT Tracker Native Version 1.0.0
            </ThemedText>
            <ThemedText style={styles.copyright}>
              © 2026 SAT Tracker. All Rights Reserved.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  hero: {
    alignItems: "center",
    marginBottom: 60,
    marginTop: 20,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 36,
    textAlign: "center",
    marginBottom: 20,
  },
  heroSub: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.6,
    maxWidth: 600,
  },
  section: {
    marginBottom: 60,
  },
  sectionTitle: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSub: {
    textAlign: "center",
    fontSize: 15,
    opacity: 0.5,
    marginBottom: 40,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  featureCard: {
    flex: 1,
    minWidth: 260,
    padding: 24,
    borderRadius: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  featureDesc: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
  },
  ctaCard: {
    padding: 40,
    borderRadius: 40,
    alignItems: "center",
    marginBottom: 60,
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  ctaSub: {
    color: "#fff",
    textAlign: "center",
    opacity: 0.8,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  version: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.4,
  },
  copyright: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.2,
    marginTop: 4,
  },
});
