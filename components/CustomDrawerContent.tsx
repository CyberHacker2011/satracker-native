import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { ThemedText } from "./ThemedText";
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Calendar,
  User,
  LogOut,
  Settings,
  Timer,
  ChevronLeft,
  Clock,
  X,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";

export function CustomDrawerContent({ onClose }: { onClose?: () => void }) {
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const navigate = (path: string) => {
    router.push(path as any);
    // if (onClose) onClose(); // Keep sidebar open on navigate
  };

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  const DrawerLink = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: any;
    label: string;
  }) => {
    const active = isActive(href);
    return (
      <TouchableOpacity
        style={[
          styles.item,
          { backgroundColor: active ? theme.primary + "15" : "transparent" },
        ]}
        onPress={() => navigate(href)}
      >
        <Icon size={22} color={active ? theme.primary : theme.textSecondary} />
        <ThemedText
          style={[
            styles.label,
            {
              color: active ? theme.primary : theme.textPrimary,
              fontWeight: active ? "700" : "500",
            },
          ]}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
          }}
        >
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.logoText}>S</ThemedText>
          </View>
          <ThemedText style={styles.appName}>SAT Tracker</ThemedText>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <DrawerContentScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <DrawerLink href="/(tabs)" icon={LayoutDashboard} label="Dashboard" />
          <DrawerLink
            href="/(tabs)/study-room"
            icon={BookOpen}
            label="Study Room"
          />
          <DrawerLink
            href="/(tabs)/check-in"
            icon={CheckSquare}
            label="Daily Check-in"
          />
          <DrawerLink href="/(tabs)/plan" icon={Calendar} label="Study Plan" />
          <DrawerLink href="/(tabs)/focus" icon={Clock} label="Classic Timer" />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.section}>
          <DrawerLink href="/(tabs)/profile" icon={User} label="Profile" />
          <DrawerLink href="/edit-profile" icon={Settings} label="Settings" />
        </View>
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={theme.textSecondary} />
          <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
            Log Out
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  header: {
    padding: 24,
    paddingTop: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
  },
  mobileClose: {
    padding: 8,
    display: Platform.OS === "web" ? "none" : "flex",
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 16,
    gap: 4,
    marginVertical: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  label: {
    fontSize: 15,
  },
  divider: {
    height: 1,
    marginHorizontal: 24,
    opacity: 0.5,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    opacity: 0.8,
  },
});
