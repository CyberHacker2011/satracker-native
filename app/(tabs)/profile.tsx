import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Moon,
  Sun,
  Monitor,
  LogOut,
  ChevronRight,
  Settings,
  MessageSquare,
  Info,
  Clock,
  BookOpen,
  Shield,
  Languages,
} from "lucide-react-native";

export default function ProfileScreen() {
  const { theme, themeName, setThemeName } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert(t("error"), error.message);
    }
  };

  const themes = [
    { id: "light", label: t("classic"), icon: Sun },
    { id: "dark", label: t("midnight"), icon: Moon },
    { id: "blue", label: t("ocean"), icon: Monitor },
  ] as const;

  const languages = [
    { id: "en", label: "English" },
    { id: "uz", label: "O'zbek" },
    { id: "ru", label: "Русский" },
  ] as const;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Heading style={styles.title}>{t("settings")}</Heading>
          <ThemedText style={styles.subtitle}>
            {t("preferencesAccount")}
          </ThemedText>

          {/* Language Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>{t("language")}</ThemedText>
            <View style={styles.themeGrid}>
              {languages.map((l) => {
                const isActive = language === l.id;
                return (
                  <TouchableOpacity
                    key={l.id}
                    onPress={() => setLanguage(l.id as any)}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText style={{ fontSize: 24 }}>
                      {l.id === "en" ? "🇺🇸" : l.id === "uz" ? "🇺🇿" : "🇷🇺"}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.themeLabel,
                        isActive && { color: theme.primary, fontWeight: "900" },
                      ]}
                    >
                      {l.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Theme Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>
              {t("themeEngine")}
            </ThemedText>
            <View style={styles.themeGrid}>
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = themeName === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setThemeName(t.id)}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Icon
                      size={24}
                      color={isActive ? theme.primary : theme.textSecondary}
                    />
                    <ThemedText
                      style={[
                        styles.themeLabel,
                        isActive && { color: theme.primary, fontWeight: "900" },
                      ]}
                    >
                      {t.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quick Access */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>
              {t("quickAccess")}
            </ThemedText>
            <Card style={styles.listCard}>
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/edit-profile")}
              >
                <View style={styles.listItemLeft}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#fef3c7" }]}
                  >
                    <Settings size={20} color="#f59e0b" />
                  </View>
                  <ThemedText style={styles.listItemText}>
                    {t("editProfile")}
                  </ThemedText>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.textSecondary}
                  opacity={0.3}
                />
              </TouchableOpacity>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/(tabs)/focus")}
              >
                <View style={styles.listItemLeft}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#dbeafe" }]}
                  >
                    <Clock size={20} color="#3b82f6" />
                  </View>
                  <ThemedText style={styles.listItemText}>
                    {t("classicTimer")}
                  </ThemedText>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.textSecondary}
                  opacity={0.3}
                />
              </TouchableOpacity>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/archive")}
              >
                <View style={styles.listItemLeft}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#dcfce7" }]}
                  >
                    <BookOpen size={20} color="#10b981" />
                  </View>
                  <ThemedText style={styles.listItemText}>
                    {t("studyArchive")}
                  </ThemedText>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.textSecondary}
                  opacity={0.3}
                />
              </TouchableOpacity>
            </Card>
          </View>

          {/* Settings List */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>{t("general")}</ThemedText>
            <Card style={styles.listCard}>
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => Linking.openURL("https://t.me/satrackerbot")}
              >
                <View style={styles.listItemLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <MessageSquare size={20} color={theme.primary} />
                  </View>
                  <ThemedText style={styles.listItemText}>
                    {t("shareFeedback")}
                  </ThemedText>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.textSecondary}
                  opacity={0.3}
                />
              </TouchableOpacity>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/about")}
              >
                <View style={styles.listItemLeft}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Info size={20} color={theme.primary} />
                  </View>
                  <ThemedText style={styles.listItemText}>
                    {t("aboutApp")}
                  </ThemedText>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.textSecondary}
                  opacity={0.3}
                />
              </TouchableOpacity>

              <View
                style={[styles.divider, { backgroundColor: theme.border }]}
              />

              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push("/privacy")}
              >
                <View style={styles.listItemLeft}>
                  <View
                    style={[styles.iconBox, { backgroundColor: "#f3e8ff" }]}
                  >
                    <Shield size={20} color="#8b5cf6" />
                  </View>
                  <ThemedText style={styles.listItemText}>
                    {t("privacyPolicy")}
                  </ThemedText>
                </View>
                <ChevronRight
                  size={20}
                  color={theme.textSecondary}
                  opacity={0.3}
                />
              </TouchableOpacity>
            </Card>
          </View>

          <Button
            title={t("signOut")}
            variant="secondary"
            onPress={handleSignOut}
            style={styles.signOutButton}
          />

          <View style={styles.footer}>
            <ThemedText style={styles.version}>
              SAT Tracker v1.0.0 (Native)
            </ThemedText>
            <ThemedText style={styles.rights}>
              © 2026 {t("allRightsReserved")}.
            </ThemedText>
            <View style={styles.contactRow}>
              <ThemedText style={styles.contactText}>
                ibrohimshaymardanov011@gmail.com
              </ThemedText>
              <ThemedText style={styles.contactText}>
                t.me/@satrackerbot
              </ThemedText>
            </View>
          </View>
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
  title: {
    fontSize: 28,
  },
  subtitle: {
    opacity: 0.5,
    fontWeight: "700",
    marginBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
    opacity: 0.4,
    marginBottom: 16,
    marginLeft: 4,
  },
  themeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  themeCard: {
    flex: 1,
    paddingVertical: 20,
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 2,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  listItemText: {
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
    opacity: 0.1,
  },
  signOutButton: {
    marginTop: 20,
  },
  footer: {
    alignItems: "center",
    marginTop: 48,
    gap: 4,
  },
  version: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.3,
  },
  rights: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.2,
  },
  contactRow: {
    alignItems: "center",
    marginTop: 8,
    gap: 2,
  },
  contactText: {
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.15,
  },
});
