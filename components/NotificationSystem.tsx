import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Animated, TouchableOpacity, Dimensions, Platform, Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import { ThemedText } from "./ThemedText";
import { Card } from "./ThemedView";
import { Bell, X, Play } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { playSound } from "../lib/audio";
import { getLocalDateString } from "../lib/dateUtils";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type AppNotification = {
  id: string;
  message: string;
  created_at: string;
};

export function NotificationSystem() {
  const { theme } = useTheme();
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const playedSoundsRef = useRef<Set<string>>(new Set());
  const userRef = useRef<any>(null);
  const isCheckingRef = useRef(false);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -100, duration: 400, useNativeDriver: true }),
    ]).start(() => setActiveToast(null));
  };

  const showToast = (notif: AppNotification) => {
    // Check if notification is late (start plan after end time)
    const endTimeMatch = notif.message.match(/{{endTime:(.*?)}}/);
    if (endTimeMatch && notif.message.includes("plan_start")) {
        const endTimeStr = endTimeMatch[1];
        const [eh, em] = endTimeStr.split(":").map(Number);
        const endDate = new Date();
        endDate.setHours(eh, em, 0, 0);
        if (new Date() > endDate) {
            setActiveToast(null);
            return;
        }
    }

    setActiveToast(notif);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 400, useNativeDriver: true }),
    ]).start();
    playSound();

    // Clean message for system notification
    const cleanMsg = notif.message
      .replace(/{{planId:.*?}}/g, "")
      .replace(/{{goToPlan:true}}/g, "")
      .replace(/{{type:.*?}}/g, "")
      .replace(/{{endTime:.*?}}/g, "")
      .trim();

    // Native Desktop Notification if available
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification("SAT Tracker", { 
          body: cleanMsg,
          icon: "/favicon.ico"
        });
      }
    }

    // Mobile System Notification (Android/iOS)
    if (Platform.OS !== 'web') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "SAT Tracker",
          body: cleanMsg,
          data: { notifId: notif.id },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      }).catch(err => console.log("Failed to show system notif", err));
    }

    // Auto-hide after 10 seconds
    setTimeout(hideToast, 10000);
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
        if (Platform.OS !== 'web') {
            await Notifications.requestPermissionsAsync();
        } else if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                await Notification.requestPermission();
            }
        }
        const { data: { user } } = await supabase.auth.getUser();
        userRef.current = user;
    }
    init();

    async function checkAndCreate() {
        if (isCheckingRef.current || !userRef.current) return;
        isCheckingRef.current = true;
        
        try {
            const user = userRef.current;
            const now = new Date();
            const today = getLocalDateString(now);

            const { data: plans } = await supabase
                .from("study_plan")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", today);

            if (!plans || !mounted) return;

            const { data: logs } = await supabase
                .from("daily_log")
                .select("plan_id")
                .eq("user_id", user.id)
                .eq("date", today);
            
            const loggedPlanIds = new Set((logs || []).map(l => l.plan_id));

            for (const plan of plans) {
                const hasLog = loggedPlanIds.has(plan.id);
                const [sh, sm] = plan.start_time.split(":").map(Number);
                const [eh, em] = plan.end_time.split(":").map(Number);
                
                const startDate = new Date(today + "T00:00:00");
                startDate.setHours(sh, sm, 0, 0);
                
                const endDate = new Date(today + "T00:00:00");
                endDate.setHours(eh, em, 0, 0);

                if (Platform.OS !== 'web') {
                    const trigger = new Date(startDate.getTime() - 60000);
                    if (trigger > now) {
                        Notifications.scheduleNotificationAsync({
                            identifier: `plan_start_${plan.id}`,
                            content: {
                                title: "Mission Imminent",
                                body: `Your ${plan.section} mission starts in 1 minute.`,
                                data: { planId: plan.id }
                            },
                            trigger: { date: trigger } as any,
                        }).catch(() => {});
                    }
                }

                const notifyTime = new Date(startDate.getTime() - 60000);
                if (now >= notifyTime && now < endDate && !hasLog) {
                    if (!playedSoundsRef.current.has(plan.id + "_start")) {
                        const { count } = await supabase
                            .from("notifications")
                            .select("*", { count: 'exact', head: true })
                            .eq("user_id", user.id)
                            .ilike("message", `%{{planId:${plan.id}}}%`)
                            .ilike("message", "%{{type:plan_start}}%");

                        if (count === 0) {
                            playedSoundsRef.current.add(plan.id + "_start");
                            const isLate = now >= startDate;
                            const message = (isLate 
                                ? `Your ${plan.section} plan has started (at ${plan.start_time}).`
                                : `Your ${plan.section} plan is starting in 1 minute (at ${plan.start_time}).`) + ` {{planId:${plan.id}}} {{type:plan_start}} {{endTime:${plan.end_time}}}`;
                            
                            await supabase.from("notifications").insert({
                                user_id: user.id,
                                message,
                                created_at: new Date().toISOString()
                            });
                        } else {
                            playedSoundsRef.current.add(plan.id + "_start");
                        }
                    }
                }

                if (now >= endDate && !hasLog) {
                    if (!playedSoundsRef.current.has(plan.id + "_missed")) {
                        const { count } = await supabase
                            .from("notifications")
                            .select("*", { count: 'exact', head: true })
                            .eq("user_id", user.id)
                            .ilike("message", `%{{planId:${plan.id}}}%`)
                            .ilike("message", "%{{type:plan_missed}}%");

                        if (count === 0) {
                            playedSoundsRef.current.add(plan.id + "_missed");
                            const message = `Your ${plan.section} plan ending at ${plan.end_time} has no check-in. {{planId:${plan.id}}} {{type:plan_missed}}`;
                            await supabase.from("notifications").insert({
                                user_id: user.id,
                                message,
                                created_at: new Date().toISOString()
                            });
                        } else {
                            playedSoundsRef.current.add(plan.id + "_missed");
                        }
                    }
                }
            }

            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomDateStr = getLocalDateString(tomorrow);
            
            const { data: tomPlans } = await supabase
                .from("study_plan")
                .select("id")
                .eq("user_id", user.id)
                .eq("date", tomDateStr);

            if ((!tomPlans || tomPlans.length === 0) && now.getHours() >= 18) {
                const tomKey = `tomorrow_check_${tomDateStr}`;
                if (!playedSoundsRef.current.has(tomKey)) {
                    const todayStart = new Date(now);
                    todayStart.setHours(0, 0, 0, 0);
                    
                    const { count } = await supabase
                        .from("notifications")
                        .select("*", { count: 'exact', head: true })
                        .eq("user_id", user.id)
                        .ilike("message", "%tomorrow%")
                        .gte("created_at", todayStart.toISOString());

                    if (count === 0) {
                        playedSoundsRef.current.add(tomKey);
                        await supabase.from("notifications").insert({
                            user_id: user.id,
                            message: "You haven't created a plan for tomorrow. Stay organized to succeed! {{goToPlan:true}} {{type:tomorrow_reminder}}",
                            created_at: new Date().toISOString()
                        });
                    } else {
                        playedSoundsRef.current.add(tomKey);
                    }
                }
            }
        } finally {
            isCheckingRef.current = false;
        }
    }

    async function checkNotifications() {
      if (!userRef.current) return;
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userRef.current.id)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data[0] && mounted) {
        const notif = data[0];
        if (!playedSoundsRef.current.has(notif.id)) {
            const isNew = new Date().getTime() - new Date(notif.created_at).getTime() < 60000;
            if (isNew) showToast(notif);
            playedSoundsRef.current.add(notif.id);
        }
      }
    }

    const interval = setInterval(() => {
        checkNotifications();
        checkAndCreate();
    }, 30000);

    const channel = supabase
      .channel("realtime-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
          if (mounted) {
            const notif = payload.new as AppNotification;
            if (!playedSoundsRef.current.has(notif.id)) {
                showToast(notif);
                playedSoundsRef.current.add(notif.id);
            }
          }
      })
      .subscribe();

    checkNotifications();
    checkAndCreate();

    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  if (!activeToast) return null;

  const planMatch = activeToast.message.match(/{{planId:(.*?)}}/);
  const planId = planMatch?.[1];
  const goToPlan = activeToast.message.includes("{{goToPlan:true}}");
  const cleanMessage = activeToast.message
    .replace(/{{planId:.*?}}/g, "")
    .replace(/{{goToPlan:true}}/g, "")
    .replace(/{{type:.*?}}/g, "")
    .replace(/{{endTime:.*?}}/g, "")
    .trim();
  const isMissed = activeToast.message.includes("{{type:plan_missed}}");

  return (
    <Animated.View style={[
      styles.toastContainer, 
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <Card style={styles.toastCard}>
        <View style={styles.header}>
            <View style={styles.badge}>
                <Bell size={12} color={theme.primary} />
                <ThemedText style={[styles.badgeText, { color: theme.primary }]}>NEW ALERT</ThemedText>
            </View>
            <TouchableOpacity onPress={hideToast}>
                <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
        </View>
        <ThemedText style={styles.message} numberOfLines={2}>{cleanMessage}</ThemedText>
        {goToPlan && (
            <TouchableOpacity 
                style={[styles.action, { backgroundColor: theme.primary }]}
                onPress={() => {
                    hideToast();
                    router.push("/(tabs)/plan");
                }}
            >
                <Play size={10} color="#fff" fill="#fff" />
                <ThemedText style={styles.actionText}>Go to Planner</ThemedText>
            </TouchableOpacity>
        )}
        {planId && (
            <TouchableOpacity 
                style={[styles.action, { backgroundColor: theme.primary }]}
                onPress={async () => {
                    const { data: log } = await supabase.from("daily_log").select("status").eq("plan_id", planId).maybeSingle();
                    const { data: planData } = await supabase.from("study_plan").select("date, end_time").eq("id", planId).single();
                    const isPast = planData ? (new Date() > new Date(planData.date + "T" + planData.end_time)) : false;
                    const canCheckInPast = isMissed && !log;

                    if (log || (isPast && !canCheckInPast)) {
                        const msg = log ? (log.status === 'done' ? "This mission is already completed." : "This mission is closed.") : "This mission has expired.";
                        if (Platform.OS === 'web') window.alert(msg);
                        else Alert.alert("Plan Unavailable", msg);
                        hideToast();
                        return;
                    }
                    hideToast();
                    if (isMissed) router.push(`/(tabs)/check-in?openPlanId=${planId}`);
                    else router.push(`/(tabs)/study-room?planId=${planId}`);
                }}
            >
                <Play size={10} color="#fff" fill="#fff" />
                <ThemedText style={styles.actionText}>{isMissed ? "Check-in Now" : "Enter Study Room"}</ThemedText>
            </TouchableOpacity>
        )}
      </Card>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    width: width * 0.85,
    maxWidth: 340,
    zIndex: 9999,
  },
  toastCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
  },
  badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(245, 158, 11, 0.12)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
  },
  badgeText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
  },
  message: {
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
  },
  action: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 10,
      borderRadius: 12,
  },
  actionText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "900",
      textTransform: "uppercase",
  }
});
