import React, { useEffect, useState, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
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
  const { isPremium } = usePremium();

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setUserProfile(profile);

        // Fetch streak from daily_log (consecutive days)
        const { data: logHistory } = await supabase
          .from("daily_log")
          .select("date")
          .eq("user_id", user.id)
          .order("date", { ascending: false });

        if (logHistory) {
          const dates = Array.from(new Set(logHistory.map((l) => l.date)));
          let currentStreak = 0;
          let today = getLocalDateString();
          let checkDate = new Date(today);

          // Check if today or yesterday was the last log to continue streak
          const lastLog = dates[0];
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          if (lastLog === today || lastLog === yesterdayStr) {
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
        }

        const todayDate = getLocalDateString();
        const { data: plans } = await supabase
          .from("study_plan")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", todayDate);

        if (plans) {
          const now = new Date();
          const curTime = getLocalTimeString(now);
          setTodayPlans(
            plans
              .map((p) => ({
                ...p,
                isActive: curTime >= p.start_time && curTime <= p.end_time,
                isPast: curTime > p.end_time,
              }))
              // Show all plans for the day, sorted by time
              .sort((a, b) => a.start_time.localeCompare(b.start_time)),
          );
        }
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
      fetchData();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </ThemedView>
    );
  }

  const nextActivePlan =
    todayPlans.find((p) => p.isActive) || todayPlans.find((p) => !p.isPast);

  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < 400;

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
              <PathStep
                title="Profile"
                subtitle="Personalized"
                done={!!userProfile?.name && !!userProfile?.exam_date}
                onPress={() => router.push("/profile")}
              />
              <PathStep
                title="Daily Plan"
                subtitle={todayPlans.length > 0 ? "Ready" : "Not Set"}
                done={todayPlans.length > 0}
                onPress={() => router.push("/plan")}
              />
              <PathStep
                title="Check-in"
                subtitle="Track Today"
                onPress={() => router.push("/check-in")}
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
                    },
                  ]}
                  onPress={() =>
                    router.push(`/(tabs)/study-room?planId=${plan.id}`)
                  }
                >
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
                    <ThemedText style={styles.planSub}>
                      {plan.section} • {plan.duration} mins
                    </ThemedText>
                  </View>
                  <ArrowRight size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Additional Guidance */}
          {!isPremium && (
            <TouchableOpacity
              style={[
                styles.premiumBanner,
                {
                  backgroundColor: theme.primaryLight,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => router.push("/profile")}
            >
              <Zap size={20} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: theme.primary, fontWeight: "800" }}>
                  Upgrade to Premium
                </ThemedText>
                <ThemedText
                  style={{ color: theme.primary, fontSize: 12, opacity: 0.8 }}
                >
                  Get personalized study plans and AI feedback.
                </ThemedText>
              </View>
              <ChevronRight size={20} color={theme.primary} />
            </TouchableOpacity>
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
});
