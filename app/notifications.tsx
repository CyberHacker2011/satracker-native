import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Bell,
  BellOff,
  X,
  Play,
  CheckCheck,
} from "lucide-react-native";

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const channel = supabase
      .channel("notifications-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadNotifications(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = async (id: string | null = null) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (id) {
        await supabase
          .from("notifications")
          .update({ dismissed_at: new Date().toISOString() })
          .eq("id", id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, dismissed_at: new Date().toISOString() } : n,
          ),
        );
      } else {
        await supabase
          .from("notifications")
          .update({ dismissed_at: new Date().toISOString() })
          .eq("user_id", user?.id)
          .is("dismissed_at", null);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, dismissed_at: new Date().toISOString() })),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const active = notifications.filter((n) => !n.dismissed_at);
  const past = notifications.filter((n) => !!n.dismissed_at);

  const NotificationItem = ({ n, isNew }: { n: any; isNew: boolean }) => {
    const cleanMessage = n.message.replace(/{{.*?}}/g, "").trim();
    return (
      <View
        style={[
          styles.card,
          { borderColor: theme.border },
          !isNew && { opacity: 0.5 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.indicator,
              {
                backgroundColor: isNew
                  ? theme.primary
                  : theme.textSecondary + "40",
              },
            ]}
          />
          <ThemedText style={styles.time}>
            {new Date(n.created_at).toLocaleDateString()} at{" "}
            {new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
          {isNew && (
            <TouchableOpacity onPress={() => handleDismiss(n.id)}>
              <X size={14} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <ThemedText style={styles.msg}>{cleanMessage}</ThemedText>
        {isNew && n.message.includes("{{planId:") && (
          <TouchableOpacity
            style={[styles.action, { backgroundColor: theme.primary }]}
            onPress={() =>
              router.push(
                `/(tabs)/study-room?planId=${n.message.match(/{{planId:(.*?)}}/)?.[1]}`,
              )
            }
          >
            <Play size={10} color="#fff" fill="#fff" />
            <ThemedText style={styles.actionText}>Jump In</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/(tabs)")}>
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Heading style={{ fontSize: 20 }}>Inbox</Heading>
          {active.length > 0 ? (
            <TouchableOpacity onPress={() => handleDismiss()}>
              <CheckCheck size={24} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <BellOff size={48} color={theme.textSecondary} opacity={0.1} />
                <ThemedText style={styles.emptyText}>
                  Nothing here yet.
                </ThemedText>
              </View>
            ) : (
              <>
                {active.length > 0 && (
                  <View style={styles.group}>
                    <ThemedText style={styles.label}>UNREAD</ThemedText>
                    {active.map((n) => (
                      <NotificationItem key={n.id} n={n} isNew />
                    ))}
                  </View>
                )}
                {past.length > 0 && (
                  <View style={styles.group}>
                    <ThemedText style={styles.label}>HISTORY</ThemedText>
                    {past.map((n) => (
                      <NotificationItem key={n.id} n={n} isNew={false} />
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  container: { padding: 24, gap: 16 },
  group: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.3,
    letterSpacing: 2,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  indicator: { width: 6, height: 6, borderRadius: 3 },
  time: { flex: 1, fontSize: 10, fontWeight: "800", opacity: 0.4 },
  msg: { fontSize: 14, fontWeight: "700", lineHeight: 22 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  actionText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  empty: { alignItems: "center", marginTop: 100, gap: 16 },
  emptyText: { opacity: 0.2, fontWeight: "700" },
});
