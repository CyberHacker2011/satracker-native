import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getLocalTimeString } from "../../lib/dateUtils";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import {
  Play,
  Pause,
  RefreshCw,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Plus,
  Minus,
  Zap,
  ArrowRight,
} from "lucide-react-native";
import { playBeep, playSound } from "../../lib/audio";
import storage from "../../lib/storage";
import { ConfirmModal } from "../../components/ConfirmModal";
import { PremiumGate } from "../../components/PremiumGate";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

export default function StudyRoomScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { planId: planIdParam } = useLocalSearchParams();
  const router = useRouter();

  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [quitModalVisible, setQuitModalVisible] = useState(false);

  const {
    timeLeft,
    isRunning,
    mode,
    currentSession,
    settings,
    setSettings,
    start,
    toggle,
    reset,
    formatTime,
    setTimeLeft,
    setCurrentSession,
    setMode,
    setIsRunning,
  } = useStudyTimer({
    initialFocusMinutes: 25,
    initialBreakMinutes: 5,
    totalSessions: 2,
    onSessionComplete: () => playBeep(),
    onAllSessionsComplete: () => {
      setIsCompleted(true);
      playSound();
    },
  });

  // Code removed: Widget Sync & Float Handler

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isRunning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [isRunning]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: mode === "break" ? "#10b981" : theme.primary,
  }));

  // Optimize: Avoid unmounting/remounting spinner
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadData = useCallback(async () => {
    if (isInitialLoad) setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = getLocalDateString();
      const { data: plans } = await supabase
        .from("study_plan")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);
      const { data: logs } = await supabase
        .from("daily_log")
        .select("plan_id")
        .eq("user_id", user.id)
        .eq("date", today);

      if (plans) {
        const now = getLocalTimeString(new Date());
        const processed = await Promise.all(
          plans.map(async (p) => {
            const isMarked = logs?.some((l) => l.plan_id === p.id);
            const isPast = p.end_time < now;
            const saved = await storage.getItem(`study_room_state_${p.id}`);
            return { ...p, isMarked, isPast, hasSavedState: !!saved };
          }),
        );
        setAvailablePlans(
          processed.sort((a, b) => {
            const aActive = !a.isMarked && !a.isPast;
            const bActive = !b.isMarked && !b.isPast;

            // Prioritize active plans
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;

            // If same status, sort by start time
            return a.start_time.localeCompare(b.start_time);
          }),
        );

        if (planIdParam) {
          const selected = processed.find((p) => p.id === planIdParam);
          if (selected) {
            if (selected.isMarked || selected.isPast) {
              Alert.alert(
                t("missionUnavailable"),
                selected.isMarked ? t("alreadyCompleted") : t("alreadyExpired"),
              );
              router.replace("/(tabs)");
              return;
            }
            setPlan(selected);
            const saved = await storage.getItem(
              `study_room_state_${selected.id}`,
            );
            if (saved) {
              const s = JSON.parse(saved);
              setTimeLeft(s.timeLeft);
              setMode(s.mode);
              setCurrentSession(s.currentSession);
              setSettings(s.settings);
              setIsCompleted(s.isCompleted);
            } else {
              setIsSettingUp(true);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [planIdParam, isInitialLoad]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Auto-calculate focus time based on plan duration
  useEffect(() => {
    if (plan && isSettingUp) {
      const parseMinutes = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const start = parseMinutes(plan.start_time);
      const end = parseMinutes(plan.end_time);
      let diff = end - start;
      if (diff < 0) diff += 1440; // Handle midnight overlap

      if (settings.sessions > 0) {
        // formula: duration / sessions, nearest 5 mins
        const raw = diff / settings.sessions;
        const rounded = Math.round(raw / 5) * 5;
        const focus = Math.max(5, rounded);
        if (settings.focus !== focus) {
          setSettings((prev) => ({ ...prev, focus }));
        }
      }
    }
  }, [plan, settings.sessions, isSettingUp]);

  useEffect(() => {
    if (loading || !plan || isSettingUp) return;
    storage.setItem(
      `study_room_state_${plan.id}`,
      JSON.stringify({ timeLeft, mode, currentSession, settings, isCompleted }),
    );
  }, [
    timeLeft,
    mode,
    currentSession,
    settings,
    isCompleted,
    plan,
    loading,
    isSettingUp,
  ]);

  const markAsDone = async () => {
    if (!plan) return;
    setMarkingDone(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("daily_log").insert({
        user_id: user?.id,
        plan_id: plan.id,
        date: plan.date,
        status: "done",
      });
      await storage.removeItem(`study_room_state_${plan.id}`);
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingDone(false);
    }
  };

  if (loading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 12, opacity: 0.5 }}>
          Syncing...
        </ThemedText>
      </ThemedView>
    );

  if (!plan)
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container}>
            <Heading style={styles.title}>Study Room</Heading>
            <ThemedText style={styles.subtitle}>
              Select a roadmap session to begin
            </ThemedText>
            <View style={styles.planList}>
              {availablePlans.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.planCard,
                    {
                      borderColor: theme.border,
                      opacity: p.isMarked || p.isPast ? 0.5 : 1,
                    },
                  ]}
                  onPress={() =>
                    router.push(`/(tabs)/study-room?planId=${p.id}`)
                  }
                  disabled={p.isMarked || p.isPast}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.planTag}>
                      {p.section.toUpperCase()}
                    </ThemedText>
                    <ThemedText style={styles.planTasks}>
                      {p.tasks_text}
                    </ThemedText>
                    <ThemedText style={styles.planTime}>
                      {p.start_time} - {p.end_time}
                    </ThemedText>
                  </View>
                  {p.isMarked ? (
                    <CheckCircle2 color="#10b981" size={24} />
                  ) : (
                    <ArrowRight color={theme.primary} size={20} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );

  if (isSettingUp)
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.setupHeader}>
            <TouchableOpacity onPress={() => setPlan(null)}>
              <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Heading style={{ fontSize: 20 }}>Prepare Strategy</Heading>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.setupCard}>
              <ThemedText style={styles.setupLabel}>SESSION TOPIC</ThemedText>
              <ThemedText style={styles.setupTitle}>
                {plan.tasks_text}
              </ThemedText>

              <View style={styles.configGroup}>
                <ThemedText style={styles.configLabel}>SESSIONS</ThemedText>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() =>
                      setSettings((s) => ({
                        ...s,
                        sessions: Math.max(1, s.sessions - 1),
                      }))
                    }
                  >
                    <Minus size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <ThemedText style={styles.stepVal}>
                    {settings.sessions}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() =>
                      setSettings((s) => ({ ...s, sessions: s.sessions + 1 }))
                    }
                  >
                    <Plus size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.configGroup}>
                <ThemedText style={styles.configLabel}>
                  FOCUS DURATION (AUTO-CALC)
                </ThemedText>
                <View style={[styles.stepper, { opacity: 0.7 }]}>
                  <ThemedText style={[styles.stepVal, { marginLeft: 12 }]}>
                    {settings.focus} min
                  </ThemedText>
                </View>
                <ThemedText style={{ fontSize: 10, opacity: 0.4 }}>
                  Calculated from plan duration: {plan.start_time}-
                  {plan.end_time}
                </ThemedText>
              </View>

              <View style={styles.configGroup}>
                <ThemedText style={styles.configLabel}>
                  BREAK DURATION (MINS)
                </ThemedText>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() =>
                      setSettings((s) => ({
                        ...s,
                        breakMin: Math.max(1, s.breakMin - 1),
                      }))
                    }
                  >
                    <Minus size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                  <ThemedText style={styles.stepVal}>
                    {settings.breakMin}
                  </ThemedText>
                  <TouchableOpacity
                    onPress={() =>
                      setSettings((s) => ({ ...s, breakMin: s.breakMin + 1 }))
                    }
                  >
                    <Plus size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Button
              title="Start Session"
              style={{ marginTop: 32, height: 56 }}
              onPress={() => {
                start(settings);
                setIsSettingUp(false);
              }}
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );

  if (isCompleted)
    return (
      <ThemedView style={styles.center}>
        <CheckCircle2 color={theme.primary} size={80} />
        <Heading style={{ marginTop: 24, fontSize: 32 }}>Great Work!</Heading>
        <ThemedText style={{ opacity: 0.5, marginTop: 8, textAlign: "center" }}>
          You finished your study mission.
        </ThemedText>
        <Button
          title={markingDone ? "Archiving..." : "Mark as Done"}
          loading={markingDone}
          onPress={markAsDone}
          style={{ width: "100%", marginTop: 40, height: 56 }}
        />
        <TouchableOpacity
          onPress={() => setIsCompleted(false)}
          style={{ marginTop: 20 }}
        >
          <ThemedText style={{ color: theme.primary, fontWeight: "700" }}>
            Keep Studying
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );

  return (
    <ThemedView style={{ flex: 1 }}>
      <PremiumGate feature="Study Room">
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.execHeader}>
            <TouchableOpacity onPress={() => setQuitModalVisible(true)}>
              <ThemedText style={{ opacity: 0.5, fontWeight: "700" }}>
                QUIT
              </ThemedText>
            </TouchableOpacity>

            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        mode === "focus" ? theme.primary : "#10b981",
                    },
                  ]}
                />
                <ThemedText style={styles.statusText}>
                  {mode.toUpperCase()}
                </ThemedText>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.container}>
            {/* Session Tracker */}
            <View style={styles.sessionTracker}>
              <View style={styles.sessionDots}>
                {Array.from({ length: settings.sessions }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.sessionDot,
                      {
                        backgroundColor:
                          i < currentSession
                            ? theme.primary
                            : "rgba(0,0,0,0.1)",
                        opacity: i < currentSession ? 1 : 0.5,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: theme.primary,
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((currentSession -
                            1 +
                            (mode === "focus"
                              ? 1 - timeLeft / (settings.focus * 60)
                              : 0)) /
                            settings.sessions) *
                            100,
                        ),
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.timerContainer}>
              <Animated.View style={[styles.timerRing, animatedRingStyle]}>
                <ThemedText style={styles.timerVal}>
                  {formatTime(timeLeft)}
                </ThemedText>
                <ThemedText style={styles.sessionInfo}>
                  Session {currentSession} of {settings.sessions}
                </ThemedText>
              </Animated.View>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: theme.primary }]}
                onPress={toggle}
              >
                {isRunning ? (
                  <Pause color="#fff" size={32} fill="#fff" />
                ) : (
                  <Play
                    color="#fff"
                    size={32}
                    fill="#fff"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => setResetModalVisible(true)}
              >
                <RefreshCw color={theme.textPrimary} size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.objectiveCard}>
              <ThemedText style={styles.objectiveLabel}>
                CURRENT OBJECTIVE
              </ThemedText>
              <ThemedText style={styles.objectiveText}>
                {plan.tasks_text}
              </ThemedText>
            </View>
          </ScrollView>
        </SafeAreaView>
      </PremiumGate>

      <ConfirmModal
        visible={quitModalVisible}
        title="Exit Study Room?"
        message="Your progress will be saved. You can continue later."
        onCancel={() => setQuitModalVisible(false)}
        onConfirm={async () => {
          await storage.removeItem(`study_room_state_${plan.id}`);
          setPlan(null);
          setQuitModalVisible(false);
        }}
        confirmLabel="Discard"
        isDestructive
        onAlternative={() => {
          setPlan(null);
          setQuitModalVisible(false);
        }}
        alternativeLabel="Save & Exit"
      />
      <ConfirmModal
        visible={resetModalVisible}
        title="Reset Timer?"
        message="This will restart the current session."
        onCancel={() => setResetModalVisible(false)}
        onConfirm={() => {
          reset("focus");
          setResetModalVisible(false);
        }}
        confirmLabel="Reset"
        isDestructive
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  container: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: "900" },
  subtitle: {
    fontSize: 16,
    opacity: 0.5,
    marginTop: 8,
    marginBottom: 32,
    fontWeight: "600",
  },
  planList: { gap: 12 },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  planTag: {
    fontSize: 10,
    fontWeight: "900",
    color: "#3b82f6",
    letterSpacing: 1,
    marginBottom: 4,
  },
  planTasks: { fontSize: 16, fontWeight: "800" },
  planTime: { fontSize: 12, opacity: 0.4, marginTop: 4, fontWeight: "600" },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  setupCard: { gap: 24 },
  setupLabel: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.4,
    letterSpacing: 1,
  },
  setupTitle: { fontSize: 24, fontWeight: "900" },
  configGroup: { gap: 12 },
  configLabel: { fontSize: 12, fontWeight: "900", opacity: 0.4 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 12,
    borderRadius: 16,
  },
  stepVal: { fontSize: 20, fontWeight: "900" },
  execHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "900" },
  timerContainer: { alignItems: "center", marginVertical: 40 },
  timerRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  timerVal: { fontSize: 72, fontWeight: "900" },
  sessionInfo: { fontSize: 12, opacity: 0.3, fontWeight: "800", marginTop: 8 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    marginBottom: 40,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  objectiveCard: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  objectiveLabel: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.3,
    letterSpacing: 1,
    marginBottom: 8,
  },
  objectiveText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    opacity: 0.7,
  },
  sessionTracker: { width: "100%", marginBottom: 40, gap: 12 },
  sessionDots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  sessionDot: { width: 12, height: 12, borderRadius: 6 },
  progressBarBg: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 3 },
});
