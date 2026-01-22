import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useRouter, Stack } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Bell, BellOff, X, Play, CheckCheck, Calendar as CalendarIcon } from "lucide-react-native";
import { FeedbackErrorModal } from "../components/FeedbackErrorModal";
import { checkConnection } from "../lib/network";

type Notification = {
  id: string;
  message: string;
  created_at: string;
  dismissed_at: string | null;
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (e: any) {
      console.error(e);
      const isOnline = await checkConnection();
      setErrorMsg(isOnline ? (e.message || "Failed to load notifications.") : "No internet connection.");
      setErrorVisible(true);
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
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDismiss = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      // Local update for speed
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed_at: new Date().toISOString() } : n));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };
  
  const handleMarkAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("dismissed_at", null);
        
      if (error) throw error;
      
      setNotifications(prev => prev.map(n => n.dismissed_at ? n : { ...n, dismissed_at: new Date().toISOString() }));
    } catch (e: any) {
      console.error(e);
    }
  };

  const active = notifications.filter(n => !n.dismissed_at);
  const past = notifications.filter(n => !!n.dismissed_at);

  const NotificationItem = ({ n, isNew }: { n: Notification; isNew: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    const planMatch = n.message.match(/{{planId:(.*?)}}/);
    const planId = planMatch?.[1];
    const goToPlan = n.message.includes("{{goToPlan:true}}");
    const cleanMessage = n.message.replace(/{{planId:.*?}}/g, "").replace(/{{goToPlan:true}}/g, "").trim();
    const isLong = cleanMessage.length > 70;

    return (
      <Card style={[styles.notifCard, !isNew && { opacity: 0.6, backgroundColor: theme.background }]}>
        <View style={styles.notifHeader}>
          <ThemedText style={styles.notifTime}>
            {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
          {isNew && (
            <TouchableOpacity onPress={() => handleDismiss(n.id)}>
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <ThemedText style={styles.notifMessage} numberOfLines={expanded ? undefined : 2}>{cleanMessage}</ThemedText>
        
        {isLong && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ marginTop: 4 }}>
                <ThemedText style={[styles.readMore, { color: theme.primary }]}>{expanded ? "Show Less" : "Show More"}</ThemedText>
            </TouchableOpacity>
        )}

        {isNew && goToPlan && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(tabs)/plan")}
          >
            <CalendarIcon size={12} color="#fff" />
            <ThemedText style={styles.actionText}>Go to Planner</ThemedText>
          </TouchableOpacity>
        )}

        {isNew && planId && (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={async () => {
                const { data: log } = await supabase.from("daily_log").select("status").eq("plan_id", planId).maybeSingle();
                
                // Check if plan is past
                const { data: planData } = await supabase.from("study_plan").select("date, end_time").eq("id", planId).single();
                const now = new Date();
                const isPast = planData ? (now > new Date(planData.date + "T" + planData.end_time)) : false;

                if (log || isPast) {
                    const msg = log ? (log.status === 'done' ? "This mission is already completed." : "This mission is closed.") : "This mission has expired.";
                    if (Platform.OS === 'web') window.alert(msg);
                    else Alert.alert("Plan Unavailable", msg);
                    return;
                }
                if (cleanMessage.includes("no check-in")) {
                    router.push(`/(tabs)/check-in?openPlanId=${planId}`);
                } else {
                    router.push(`/(tabs)/study-room?planId=${planId}`);
                }
            }}
          >
            <Play size={12} color="#fff" fill="#fff" />
            <ThemedText style={styles.actionText}>{cleanMessage.includes("no check-in") ? "Check-in Now" : "Enter Study Room"}</ThemedText>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <FeedbackErrorModal 
        visible={errorVisible} 
        error={errorMsg} 
        onDismiss={() => setErrorVisible(false)} 
        onRetry={loadNotifications}
      />
      <Stack.Screen options={{ 
        title: "Notifications",
        headerShown: true,
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
                <ChevronLeft color={theme.textPrimary} size={28} />
            </TouchableOpacity>
        ),
        headerRight: () => (
             notifications.some(n => !n.dismissed_at) ? (
                 <TouchableOpacity onPress={handleMarkAllRead} style={{ marginRight: 10 }}>
                     <CheckCheck color={theme.primary} size={24} />
                 </TouchableOpacity>
             ) : null
        )
      }} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        {loading ? (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        ) : (
            <ScrollView contentContainerStyle={styles.container}>
                {notifications.length === 0 ? (
                    <View style={styles.empty}>
                        <BellOff size={64} color={theme.textSecondary} opacity={0.2} />
                        <ThemedText style={styles.emptyText}>No notifications yet</ThemedText>
                    </View>
                ) : (
                    <>
                        {active.length > 0 && (
                            <View style={styles.group}>
                                <ThemedText style={styles.groupLabel}>NEW UPDATES</ThemedText>
                                {active.map(n => <NotificationItem key={n.id} n={n} isNew={true} />)}
                            </View>
                        )}
                        {past.length > 0 && (
                            <View style={styles.group}>
                                <ThemedText style={styles.groupLabel}>PAST NOTIFICATIONS</ThemedText>
                                {past.map(n => <NotificationItem key={n.id} n={n} isNew={false} />)}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    padding: 20,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.3,
  },
  group: {
      marginBottom: 32,
  },
  groupLabel: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 2,
      opacity: 0.4,
      marginBottom: 16,
      marginLeft: 4,
  },
  notifCard: {
      marginBottom: 12,
      padding: 16,
  },
  notifHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
  },
  notifTime: {
      fontSize: 10,
      fontWeight: "800",
      opacity: 0.4,
  },
  notifMessage: {
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
  },
  actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 12,
  },
  actionText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
  },
  readMore: {
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
      marginTop: 2,
  }
});
