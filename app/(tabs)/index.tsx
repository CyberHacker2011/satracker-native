import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getLocalTimeString } from "../../lib/dateUtils";
import {
  Target,
  ChevronRight,
  Zap,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
} from "lucide-react-native";
import { usePremium } from "../../hooks/usePremium";

const CountdownSection = React.memo(
  ({ examDateStr }: { examDateStr: string }) => {
    const { theme } = useTheme();
    const [timeLeft, setTimeLeft] = useState<{
      days: number;
      hours: number;
      mins: number;
      secs: number;
    }>({ days: 0, hours: 0, mins: 0, secs: 0 });

    useEffect(() => {
      let timer: NodeJS.Timeout;

      const calculate = () => {
        if (!examDateStr) {
          setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
          return;
        }

        try {
          // Attempt native parsing first (handles "March 2026", "2024-01-01", etc.)
          let targetDate = new Date(examDateStr);

          // If invalid or just "Year-Month" defaulting to day 1, let's refine or fallback
          if (isNaN(targetDate.getTime())) {
            // Try manual parsing for YYYY-MM-DD or MM-DD-YYYY
            const cleanDate = examDateStr.replace(/\//g, "-");
            const parts = cleanDate.split("-").map(Number);

            if (parts.length >= 3) {
              if (parts[0] > 1000) {
                targetDate = new Date(
                  parts[0],
                  parts[1] - 1,
                  parts[2],
                  10,
                  0,
                  0,
                );
              } else {
                targetDate = new Date(
                  parts[2],
                  parts[0] - 1,
                  parts[1],
                  10,
                  0,
                  0,
                );
              }
            }
          } else {
            // If valid, assume 10:00 AM on that date (or 1st of month if only month/year provided)
            // Check if it's likely just a month/year (day is 1 and time is 00:00:00)
            // But simpler: just set to 10 AM of whatever date it parsed to.
            targetDate.setHours(10, 0, 0, 0);
          }

          if (!isNaN(targetDate.getTime())) {
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();

            if (diff > 0) {
              setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                mins: Math.floor((diff / 1000 / 60) % 60),
                secs: Math.floor((diff / 1000) % 60),
              });
            } else {
              setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
            }
          } else {
            setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
          }
        } catch (e) {
          console.log("Date parsing error", e);
          setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        }
      };

      calculate();
      timer = setInterval(calculate, 1000);

      return () => clearInterval(timer);
    }, [examDateStr]);

    const shadowUtils = Platform.select({
      web: { boxShadow: "0px 2px 8px rgba(0,0,0,0.1)" },
      default: {
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
    });

    return (
      <View style={styles.countdownContainer}>
        <View style={[styles.countItem, shadowUtils as any]}>
          <ThemedText style={styles.countVal}>{timeLeft?.days || 0}</ThemedText>
          <ThemedText style={styles.countLabel}>DAYS</ThemedText>
        </View>
        <View style={[styles.countItem, shadowUtils as any]}>
          <ThemedText style={styles.countVal}>
            {(timeLeft?.hours || 0).toString().padStart(2, "0")}
          </ThemedText>
          <ThemedText style={styles.countLabel}>HRS</ThemedText>
        </View>
        <View style={[styles.countItem, shadowUtils as any]}>
          <ThemedText style={styles.countVal}>
            {(timeLeft?.mins || 0).toString().padStart(2, "0")}
          </ThemedText>
          <ThemedText style={styles.countLabel}>MIN</ThemedText>
        </View>
        <View
          style={[
            styles.countItem,
            { backgroundColor: theme.primary + "15" },
            shadowUtils as any,
          ]}
        >
          <ThemedText style={[styles.countVal, { color: theme.primary }]}>
            {(timeLeft?.secs || 0).toString().padStart(2, "0")}
          </ThemedText>
          <ThemedText style={[styles.countLabel, { color: theme.primary }]}>
            SEC
          </ThemedText>
        </View>
      </View>
    );
  },
);

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayPlans, setTodayPlans] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasPlans, setHasPlans] = useState(false);
  const { isPremium } = usePremium();

  // Cache timestamp
  const lastFetchTime = useRef<number>(0);
  const CACHE_DURATION = 60 * 1000; // 1 minute

  const fetchData = async (force = false) => {
    const now = Date.now();
    if (
      !force &&
      lastFetchTime.current &&
      now - lastFetchTime.current < CACHE_DURATION
    ) {
      // Data is fresh enough, skip fetch
      setLoading(false);
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const todayDate = getLocalDateString();

        // 1. Parallelize all independent fetches
        const [
          profileRes,
          logHistoryRes,
          plansRes,
          todayLogsRes,
          totalPlansRes,
          completedLogsRes,
        ] = await Promise.all([
          // Profile
          supabase
            .from("user_profiles")
            .select("name, exam_date, target_math, target_reading_writing")
            .eq("user_id", user.id)
            .single(),

          // Streak History (last 365 days)
          supabase
            .from("daily_log")
            .select("date")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(365),

          // Today's Plans (specific columns)
          supabase
            .from("study_plan")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", todayDate),

          // Today's Logs (to check completion)
          supabase
            .from("daily_log")
            .select("plan_id")
            .eq("user_id", user.id)
            .eq("date", todayDate),

          // Total Plans Count (for progress & onboarding check)
          supabase
            .from("study_plan")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),

          // Completed Logs Count (for progress)
          supabase
            .from("daily_log")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        // 2. Process Profile
        if (profileRes.data) {
          setUserProfile(profileRes.data);
        }

        // 3. Process Streak
        const logHistory = logHistoryRes.data;
        if (logHistory && logHistory.length > 0) {
          const dates = Array.from(new Set(logHistory.map((l: any) => l.date)));
          let currentStreak = 0;
          const today = getLocalDateString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          const lastLog = dates[0];
          if (lastLog === today || lastLog === yesterdayStr) {
            let checkDate = new Date(lastLog);
            for (let i = 0; i < dates.length; i++) {
              const dStr = checkDate.toISOString().split("T")[0];
              if (dates.includes(dStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }
          }
          setStreak(currentStreak);
        } else {
          setStreak(0);
        }

        // 4. Process Today's Plans
        const plans = plansRes.data;
        const todayLogs = todayLogsRes.data;

        if (plans) {
          const now = new Date();
          const curTime = getLocalTimeString(now);
          setTodayPlans(
            plans
              .map((p) => {
                const isCompleted = todayLogs?.some((l) => l.plan_id === p.id);
                const isNotStarted =
                  p.start_time >
                  getLocalTimeString(new Date(Date.now() + 60000));
                return {
                  ...p,
                  isActive: curTime >= p.start_time && curTime <= p.end_time,
                  isPast: curTime > p.end_time,
                  isNotStarted,
                  isCompleted,
                };
              })
              .sort((a, b) => {
                const aActive = !a.isCompleted && !a.isPast;
                const bActive = !b.isCompleted && !b.isPast;
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                return a.start_time.localeCompare(b.start_time);
              }),
          );
        }

        // 5. Process Progress & Onboarding Check
        const totalPlans = totalPlansRes.count || 0;
        const completedLogs = completedLogsRes.count || 0;

        if (totalPlans > 0) {
          setHasPlans(true);
          setProgress(Math.round((completedLogs / totalPlans) * 100));
        } else {
          setHasPlans(false);
          setProgress(0);
          // If 0 total plans, user might need onboarding
          // We do this check here instead of a separate useEffect
          // Only redirect if we are not already refreshing/loading to avoid flicker
          router.replace("/onboarding");
        }

        lastFetchTime.current = Date.now();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, []);

  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 400;

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </ThemedView>
    );
  }

  const nextActivePlan =
    todayPlans.find((p) => p.isActive) || todayPlans.find((p) => !p.isPast);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            isSmallScreen && { padding: 16 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Main Hero & Stats Row */}
          <View
            style={[
              styles.heroRow,
              isSmallScreen && { flexDirection: "column", marginBottom: 24 },
            ]}
          >
            <View style={styles.heroMain}>
              <Heading
                style={[styles.greeting, isSmallScreen && { fontSize: 24 }]}
              >
                {t("hello")}, {userProfile?.name?.split(" ")[0] || t("friend")}!
              </Heading>

              <CountdownSection examDateStr={userProfile?.exam_date} />

              <View style={styles.streakBadge}>
                <Zap size={14} color="#f59e0b" fill="#f59e0b" />
                <ThemedText style={styles.streakText}>
                  {streak} DAY STREAK
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.scoreHalf,
                isSmallScreen && { flex: 0, marginTop: 12 },
              ]}
            >
              <View
                style={[
                  styles.scoreCard,
                  {
                    backgroundColor: theme.primary + "10",
                    borderColor: theme.primary,
                  },
                  isSmallScreen && { alignSelf: "flex-start", minWidth: 120 },
                ]}
              >
                <Target size={18} color={theme.primary} />
                <ThemedText style={styles.scoreVal}>
                  {userProfile?.target_math +
                    userProfile?.target_reading_writing || 1600}
                </ThemedText>
                <ThemedText style={styles.scoreLabel}>GOAL TARGET</ThemedText>
              </View>
            </View>
          </View>

          {/* Path Column Only */}
          <View style={styles.mainGrid}>
            <View style={styles.pathCol}>
              <ThemedText style={styles.sectionTitle}>YOUR PROGRESS</ThemedText>

              {/* Conditional Steps */}
              {(!userProfile?.name || !userProfile?.exam_date) && (
                <PathStep
                  title="Personalize Profile"
                  subtitle="Set Name & Date"
                  active={true}
                  onPress={() => router.push("/profile")}
                />
              )}

              {!hasPlans && (
                <PathStep
                  title="Generate Plan"
                  subtitle="Create your path"
                  active={true}
                  onPress={() => router.push("/onboarding")}
                />
              )}

              {/* Static Steps */}
              <PathStep
                title="Daily Plan"
                subtitle={todayPlans.length > 0 ? "Ready" : "View"}
                done={todayPlans.length > 0}
                onPress={() => router.push("/plan")}
              />
              <PathStep
                title="Check-in"
                subtitle="Track Today"
                onPress={() => router.push("/check-in")}
              />
              <PathStep
                title="Study Room"
                subtitle="Focus Mode"
                onPress={() => router.push("/study-room")}
              />
            </View>
          </View>

          {/* Today's Schedule Overview */}
          {todayPlans.length > 0 && (
            <View style={styles.scheduleSection}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>
                  TODAY'S SCHEDULE
                </ThemedText>
                <TouchableOpacity onPress={() => router.push("/plan")}>
                  <ThemedText
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    Edit Plan
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {todayPlans.map((plan, idx) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planItem,
                    {
                      backgroundColor: theme.card,
                      borderColor: plan.isActive ? theme.primary : theme.border,
                      borderLeftWidth: 5,
                      borderLeftColor:
                        plan.section === "math" ? "#3b82f6" : "#ec4899",
                      opacity:
                        plan.isCompleted || plan.isPast || plan.isNotStarted
                          ? 0.5
                          : 1,
                    },
                  ]}
                  disabled={false}
                  onPress={() => {
                    if (plan.isCompleted) {
                      Alert.alert(
                        t("missionUnavailable"),
                        t("alreadyCompleted"),
                      );
                      return;
                    }
                    if (plan.isPast) {
                      Alert.alert(t("missionUnavailable"), t("alreadyExpired"));
                      return;
                    }
                    if (plan.isNotStarted) {
                      Alert.alert(
                        t("missionUnavailable"),
                        "This session has not started yet.",
                      );
                      return;
                    }
                    router.push(`/(tabs)/study-room?planId=${plan.id}`);
                  }}
                  onLongPress={async () => {
                    // Quick mark as done feature
                    try {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (!user) return;

                      const today = getLocalDateString();
                      if (plan.isCompleted) {
                        await supabase
                          .from("daily_log")
                          .delete()
                          .eq("plan_id", plan.id)
                          .eq("date", today);
                      } else {
                        await supabase.from("daily_log").insert({
                          user_id: user.id,
                          plan_id: plan.id,
                          date: today,
                          status: "done",
                        });
                      }
                      fetchData();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                >
                  {plan.ai_generated && (
                    <View style={styles.planAiBadge}>
                      <Zap size={10} color="#fff" fill="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.timeTag,
                      {
                        backgroundColor: plan.isActive
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={{
                        color: plan.isActive ? "#fff" : theme.textPrimary,
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {plan.start_time}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.planTasks}>
                      {plan.tasks_text}
                    </ThemedText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <ThemedText style={styles.planSub}>
                        {plan.section.toUpperCase()} • {plan.duration} mins
                      </ThemedText>
                      {plan.isCompleted && (
                        <CheckCircle2 size={12} color="#10b981" />
                      )}
                    </View>
                  </View>
                  <ArrowRight size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PathStep({ title, subtitle, done, active, onPress }: any) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.pathStep,
        active && {
          borderColor: theme.primary,
          backgroundColor: theme.primaryLight,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.stepIconContainer}>
        {done ? (
          <CheckCircle2 size={24} color={theme.primary} />
        ) : active ? (
          <BookOpen size={24} color={theme.primary} />
        ) : (
          <Circle size={24} color={theme.textSecondary} />
        )}
        <View style={[styles.stepLine, { backgroundColor: theme.border }]} />
      </View>
      <View style={styles.stepContent}>
        <ThemedText
          style={[
            styles.stepTitle,
            done && { opacity: 0.5, textDecorationLine: "line-through" },
          ]}
        >
          {title}
        </ThemedText>
        <ThemedText style={styles.stepSubtitle}>{subtitle}</ThemedText>
      </View>
      <ChevronRight size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroRow: {
    flexDirection: "row",
    marginBottom: 40,
    gap: 20,
  },
  heroMain: {
    flex: 1.2,
  },
  scoreHalf: {
    flex: 0.8,
    justifyContent: "center",
  },
  scoreCard: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    gap: 4,
    minWidth: 100,
  },
  scoreVal: {
    fontSize: 22,
    fontWeight: "900",
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "800",
    opacity: 0.4,
    letterSpacing: 1,
  },
  countdownContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  countItem: {
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 40,
  },
  countVal: {
    fontSize: 14,
    fontWeight: "900",
  },
  countLabel: {
    fontSize: 7,
    fontWeight: "900",
    opacity: 0.4,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    backgroundColor: "#fffbeb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  streakText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#92400e",
  },
  mainGrid: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 32,
  },
  pathCol: {
    flex: 1,
  },
  scheduleCol: {
    flex: 1,
  },
  smallPlan: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  smallPlanTime: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.4,
    marginBottom: 2,
  },
  smallPlanTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyPrompt: {
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    opacity: 0.3,
    fontWeight: "600",
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "900",
    opacity: 0.3,
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  pathStep: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  stepIconContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  stepLine: {
    position: "absolute",
    top: 24,
    width: 2,
    height: 30,
    zIndex: -1,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepSubtitle: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.5,
  },
  scheduleSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
  },
  timeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 50,
    alignItems: "center",
  },
  planTasks: {
    fontSize: 15,
    fontWeight: "700",
  },
  planSub: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  planAiBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#a855f7",
    padding: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  miniBarContainer: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
  },
});
