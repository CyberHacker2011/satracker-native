import React from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Shield,
  Lock,
  FileText,
  UserCheck,
} from "lucide-react-native";

export default function PrivacyScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const Section = ({ icon: Icon, title, content }: any) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View
          style={[styles.iconBox, { backgroundColor: theme.primary + "15" }]}
        >
          <Icon size={18} color={theme.primary} />
        </View>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <ThemedText style={styles.textContent}>{content}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Heading style={{ fontSize: 20 }}>Privacy Policy</Heading>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Shield size={48} color={theme.primary} />
            <Heading style={styles.title}>Your Privacy Matters</Heading>
            <ThemedText style={styles.subtitle}>
              Last updated: January 2026
            </ThemedText>
          </View>

          <Section
            icon={Lock}
            title="Data Security"
            content="We use industry-standard encryption to protect your personal information and study data. Your data is stored securely on Supabase servers."
          />

          <Section
            icon={UserCheck}
            title="Information Use"
            content="We collect only necessary information like your name, education level, and SAT goals to provide a personalized study experience. We never sell your data."
          />

          <Section
            icon={FileText}
            title="Your Rights"
            content="You have full control over your data. You can request to export or delete your account and all associated data at any time through the settings."
          />

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: theme.primary + "05",
                borderColor: theme.primary + "20",
              },
            ]}
          >
            <ThemedText style={styles.infoText}>
              By using SAT Tracker, you agree to our terms of service and this
              privacy policy. We prioritize your privacy above all else.
            </ThemedText>
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
  title: { fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { fontSize: 11, fontWeight: "800", opacity: 0.3, letterSpacing: 1 },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  textContent: {
    fontSize: 14,
    lineHeight: 24,
    opacity: 0.6,
    fontWeight: "500",
  },
  infoCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  infoText: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.5,
    lineHeight: 18,
  },
});
