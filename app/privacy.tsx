import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Stack } from "expo-router";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield, Lock, Eye, Database } from "lucide-react-native";

export default function PrivacyScreen() {
  const { theme, themeName } = useTheme();

  const sections = [
    {
      title: "Data Collection",
      icon: Database,
      color: "#3b82f6",
      content: "SAT Tracker collects only the essential information needed to provide our service: your email address for authentication, study plans you create, and check-in records. We do not collect personal identifying information beyond what you explicitly provide."
    },
    {
      title: "Data Storage",
      icon: Lock,
      color: "#10b981",
      content: "Your data is securely stored using Supabase's cloud infrastructure with industry-standard encryption. All data transmissions are encrypted using TLS/SSL protocols."
    },
    {
      title: "Data Usage",
      icon: Eye,
      color: "#f59e0b",
      content: "We use your data solely to provide the SAT Tracker service. Your study plans and progress data are never shared with third parties, sold, or used for advertising purposes."
    },
    {
      title: "Your Rights",
      icon: Shield,
      color: "#8b5cf6",
      content: "You have the right to access, modify, or delete your data at any time. To request data deletion, please contact us via Telegram at @ibrohimfr."
    }
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primaryLight }]}>
              <Shield size={40} color={theme.primary} />
            </View>
            <Heading style={styles.title}>Privacy Policy</Heading>
            <ThemedText style={styles.subtitle}>
              Your privacy matters to us. Here's how we handle your data.
            </ThemedText>
            <ThemedText style={styles.date}>Last Updated: January 2026</ThemedText>
          </View>

          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: section.color + '20' }]}>
                    <Icon size={24} color={section.color} />
                  </View>
                  <Heading style={styles.sectionTitle}>{section.title}</Heading>
                </View>
                <ThemedText style={styles.sectionContent}>{section.content}</ThemedText>
              </Card>
            );
          })}

          <Card style={[styles.contactCard, { backgroundColor: themeName === 'dark' ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb' }]}>
            <ThemedText style={[styles.contactTitle, { color: theme.primary }]}>Questions?</ThemedText>
            <ThemedText style={styles.contactText}>
              If you have any questions about this privacy policy or how we handle your data, please reach out:
            </ThemedText>
            <ThemedText style={styles.contactEmail}>ibrohimshaymardanov011@gmail.com</ThemedText>
            <ThemedText style={styles.contactEmail}>t.me/@ibrohimfr</ThemedText>
          </Card>

          <ThemedText style={styles.footer}>
            © 2026 SAT Tracker. All Rights Reserved.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: "center",
    fontWeight: "600",
    maxWidth: 300,
  },
  date: {
    fontSize: 12,
    opacity: 0.3,
    fontWeight: "700",
    marginTop: 12,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.7,
    fontWeight: "500",
  },
  contactCard: {
    marginTop: 16,
    alignItems: "center",
    padding: 24,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 12,
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.5,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    opacity: 0.2,
    fontWeight: "700",
    marginTop: 32,
  },
});
