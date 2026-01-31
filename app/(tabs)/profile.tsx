import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Moon,
  Sun,
  Monitor,
  User,
  Settings,
  Info,
  ChevronRight,
  LogOut,
  Globe,
  Shield,
  Palette,
  Trash2,
} from "lucide-react-native";

type TabType = "account" | "preferences" | "appearance" | "about";

export default function ProfileScreen() {
  const { theme, themeName, setThemeName } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("account");

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert(t("error"), error.message);
    }
  };

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "about", label: "About", icon: Info },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "account":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Heading style={styles.tabHeading}>Account Settings</Heading>
            <ThemedText style={styles.tabSubheading}>
              Manage your personal information
            </ThemedText>

            <TouchableOpacity
              style={[styles.settingItem, { borderColor: theme.border }]}
              onPress={() => router.push("/edit-profile")}
            >
              <ThemedText style={styles.settingLabel}>
                Edit Profile Information
              </ThemedText>
              <ChevronRight size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderColor: theme.border }]}
              onPress={() => router.push("/archive")}
            >
              <ThemedText style={styles.settingLabel}>Study Archive</ThemedText>
              <ChevronRight size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <Button
              title="Sign Out"
              variant="secondary"
              onPress={handleSignOut}
              style={styles.signOutBtn}
            />

            <ThemedText
              style={[styles.groupLabel, { color: theme.error, marginTop: 40 }]}
            >
              Danger Zone
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.settingItem,
                { borderColor: theme.error + "40", borderBottomWidth: 0 },
              ]}
              onPress={() => {
                if (Platform.OS === "web") {
                  if (
                    confirm(
                      "Are you sure? This will delete EVERY plan ever created.",
                    )
                  ) {
                    const clear = async () => {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) return;
                      await supabase
                        .from("daily_log")
                        .delete()
                        .eq("user_id", user.id);
                      await supabase
                        .from("study_plan")
                        .delete()
                        .eq("user_id", user.id);
                      window.alert("All plans cleared.");
                    };
                    clear();
                  }
                } else {
                  Alert.alert(
                    "Delete All Plans",
                    "Are you sure? This will delete EVERY plan ever created. This action cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete Everything",
                        style: "destructive",
                        onPress: async () => {
                          const {
                            data: { user },
                          } = await supabase.auth.getUser();
                          if (!user) return;
                          await supabase
                            .from("daily_log")
                            .delete()
                            .eq("user_id", user.id);
                          await supabase
                            .from("study_plan")
                            .delete()
                            .eq("user_id", user.id);
                          Alert.alert("Success", "All plans cleared.");
                        },
                      },
                    ],
                  );
                }
              }}
            >
              <ThemedText style={{ color: theme.error, fontWeight: "700" }}>
                Clear All Plans
              </ThemedText>
              <Trash2 size={18} color={theme.error} />
            </TouchableOpacity>
          </ScrollView>
        );
      case "preferences":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Heading style={styles.tabHeading}>Preferences</Heading>
            <ThemedText style={styles.tabSubheading}>
              Customize your study experience
            </ThemedText>

            <ThemedText style={styles.groupLabel}>Language</ThemedText>
            <View style={styles.optionGrid}>
              {[
                { id: "en", label: "English", flag: "🇺🇸" },
                { id: "uz", label: "O'zbek", flag: "🇺🇿" },
                { id: "ru", label: "Русский", flag: "🇷🇺" },
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.optionCard,
                    {
                      borderColor:
                        language === lang.id ? theme.primary : theme.border,
                      backgroundColor: theme.card,
                    },
                  ]}
                  onPress={() => setLanguage(lang.id as any)}
                >
                  <ThemedText style={{ fontSize: 20 }}>{lang.flag}</ThemedText>
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      language === lang.id && { color: theme.primary },
                    ]}
                  >
                    {lang.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );
      case "appearance":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Heading style={styles.tabHeading}>Appearance</Heading>
            <ThemedText style={styles.tabSubheading}>
              Personalize the look and feel
            </ThemedText>

            <ThemedText style={styles.groupLabel}>Theme</ThemedText>
            <View style={styles.optionGrid}>
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "blue", label: "Blue", icon: Monitor },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.optionCard,
                    {
                      borderColor:
                        themeName === mode.id ? theme.primary : theme.border,
                      backgroundColor: theme.card,
                    },
                  ]}
                  onPress={() => setThemeName(mode.id as any)}
                >
                  <mode.icon
                    size={20}
                    color={
                      themeName === mode.id
                        ? theme.primary
                        : theme.textSecondary
                    }
                  />
                  <ThemedText
                    style={[
                      styles.optionLabel,
                      themeName === mode.id && { color: theme.primary },
                    ]}
                  >
                    {mode.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );
      case "about":
        return (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Heading style={styles.tabHeading}>About App</Heading>
            <ThemedText style={styles.tabSubheading}>
              Information and Support
            </ThemedText>

            <TouchableOpacity
              style={[styles.settingItem, { borderColor: theme.border }]}
              onPress={() => Linking.openURL("https://t.me/satrackerbot")}
            >
              <ThemedText style={styles.settingLabel}>
                Support / Feedback
              </ThemedText>
              <ThemedText style={{ color: theme.primary, fontSize: 12 }}>
                t.me/@satrackerbot
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, { borderColor: theme.border }]}
              onPress={() => router.push("/privacy")}
            >
              <ThemedText style={styles.settingLabel}>
                Privacy Policy
              </ThemedText>
              <ChevronRight size={18} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.aboutFooter}>
              <ThemedText style={styles.versionText}>
                SAT Tracker v1.0.0 (Native)
              </ThemedText>
              <ThemedText style={styles.copyrightText}>
                © 2026 iDevelopers. All rights reserved.
              </ThemedText>
            </View>
          </ScrollView>
        );
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.layout}>
          {/* Side Sub-Navigation */}
          <View style={[styles.sidebar, { borderRightColor: theme.border }]}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as TabType)}
                style={[
                  styles.tabItem,
                  activeTab === tab.id && {
                    backgroundColor: theme.primaryLight,
                  },
                ]}
              >
                <tab.icon
                  size={20}
                  color={
                    activeTab === tab.id ? theme.primary : theme.textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.tabLabel,
                    activeTab === tab.id && {
                      color: theme.primary,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <View style={styles.content}>{renderContent()}</View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 120,
    borderRightWidth: 1,
    paddingVertical: 20,
    gap: 10,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    marginHorizontal: 10,
  },
  tabLabel: {
    fontSize: 11,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 24,
  },
  tabHeading: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabSubheading: {
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 32,
    fontWeight: "600",
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.4,
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 20,
    textTransform: "uppercase",
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    gap: 8,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  signOutBtn: {
    marginTop: 40,
    borderRadius: 12,
  },
  aboutFooter: {
    marginTop: 60,
    alignItems: "center",
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.3,
  },
  copyrightText: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.2,
  },
});
