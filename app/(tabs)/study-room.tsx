import React, { useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getLocalTimeString } from "../../lib/dateUtils";
import { useTheme } from "../../context/ThemeContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import { Play, Pause, RefreshCw, ChevronLeft, CheckCircle2, Clock, Plus, Minus, Settings2, Zap } from "lucide-react-native";
import { playBeep, playSound } from "../../lib/audio";
import storage from "../../lib/storage";
import { ConfirmModal } from "../../components/ConfirmModal";
import { FeedbackErrorModal } from "../../components/FeedbackErrorModal";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, Easing } from "react-native-reanimated";
import { LayoutAnimation, Platform, UIManager } from "react-native";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


interface StudyPlan {
  id: string;
  user_id?: string;
  date: string;
  section: string;
  start_time: string;
  end_time: string;
  tasks_text: string;
  isMarked?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
  hasSavedState?: boolean;
}

export default function StudyRoomScreen() {
  const { theme } = useTheme();
  const { planId: planIdParam } = useLocalSearchParams();
  const router = useRouter();
  
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [quitModalVisible, setQuitModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    onSessionComplete: () => {
        playBeep();
    },
    onAllSessionsComplete: () => {
        setIsCompleted(true);
        playSound();
    }
  });
  
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRunning) {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    } else {
        pulse.value = withTiming(1);
    }
  }, [isRunning]);
  
  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.05], [1, 0.8]),
    borderColor: mode === "break" ? "#10b981" : theme.primary,
  }));

  // Animate layout changes for progress bar
  useEffect(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [currentSession, mode]);



  const checkPlanStatus = (p: any, logs: any[], now: Date) => {
      const curTimeStr = getLocalTimeString(now);
      const isPast = p.end_time < curTimeStr;
      const isUpcoming = p.start_time > curTimeStr;
      const log = logs.find(l => l.plan_id === p.id);
      return { isPast, isUpcoming, isMarked: !!log };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = getLocalDateString();
      const [plansRes, logsRes] = await Promise.all([
        supabase.from("study_plan").select("*").eq("user_id", user.id).eq("date", today),
        supabase.from("daily_log").select("plan_id, status").eq("user_id", user.id).eq("date", today)
      ]);

      if (plansRes.data) {
        const now = new Date();
        const logs = logsRes.data || [];
        
        // Enhance plans with status and saved state check
        const enhanced = await Promise.all(plansRes.data.map(async (p: any) => {
            const { isPast, isUpcoming, isMarked } = checkPlanStatus(p, logs, now);
            const saved = await storage.getItem(`study_room_state_${p.id}`);
            return { ...p, isPast, isUpcoming, isMarked, hasSavedState: !!saved };
        }));

        setAvailablePlans(enhanced.sort((a, b) => {
            const aDone = a.isMarked || a.isPast;
            const bDone = b.isMarked || b.isPast;
            if (aDone && !bDone) return 1;
            if (!aDone && bDone) return -1;
            return a.start_time.localeCompare(b.start_time);
        }));

        if (planIdParam) {
            const selected = enhanced.find(p => p.id === planIdParam);
            if (selected) {
                if (selected.isMarked) {
                    Alert.alert("Completed", "This mission is already archived.");
                    router.replace("/(tabs)/study-room");
                    return;
                }
                setPlan(selected);
                
                const saved = await storage.getItem(`study_room_state_${selected.id}`);
                if (saved) {
                    const state = JSON.parse(saved);
                    setTimeLeft(state.timeLeft);
                    setMode(state.mode);
                    setCurrentSession(state.currentSession);
                    setSettings(state.settings);
                    setIsSettingUp(false);
                    setIsCompleted(state.isCompleted || false);
                    setIsRunning(false); // Always start paused on return
                } else {
                    // Calc default settings based on plan duration
                    const [sh, sm] = selected.start_time.split(":").map(Number);
                    const [eh, em] = selected.end_time.split(":").map(Number);
                    const totalDuration = (eh * 60 + em) - (sh * 60 + sm);
                    
                    const defaultSessions = 2;
                    const defaultBreak = 5;
                    const workPerSession = Math.max(1, Math.floor((totalDuration - (defaultBreak * defaultSessions)) / defaultSessions));
                    
                    setSettings({
                        focus: workPerSession,
                        breakMin: defaultBreak,
                        sessions: defaultSessions
                    });
                    setIsSettingUp(true);
                }
            }
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to load study plans. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [planIdParam]);

  // Handle persistence
  useEffect(() => {
    if (loading || !plan || isSettingUp) return;
    const save = async () => {
        const state = { timeLeft, mode, currentSession, settings, isCompleted };
        await storage.setItem(`study_room_state_${plan.id}`, JSON.stringify(state));
    };
    save();
  }, [timeLeft, mode, currentSession, settings, isCompleted, plan, loading, isSettingUp]);

  const handleQuit = () => {
      setQuitModalVisible(true);
  };

  const markAsDone = async () => {
    if (!plan) return;
    setMarkingDone(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        // Check availability first to avoid 400 Bad Request on duplicates
        const { data: existing } = await supabase
            .from("daily_log")
            .select("id")
            .eq("plan_id", plan.id)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase.from("daily_log").insert({
                user_id: user.id,
                plan_id: plan.id,
                date: plan.date,
                status: "done",
                checked_at: new Date().toISOString()
            });
            if (error) throw error;
        }

        await storage.removeItem(`study_room_state_${plan.id}`);
        router.replace("/(tabs)");
    } catch (e: any) {
        setErrorMsg(e.message);
    } finally {
        setMarkingDone(false);
    }
  };

  const getGlobalProgress = () => {
    if (!plan) return 0;
    const totalS = settings.sessions * (settings.focus + settings.breakMin) * 60;
    const elapsed = ((currentSession - 1) * (settings.focus + settings.breakMin) * 60) + 
                    (mode === "focus" ? (settings.focus * 60 - timeLeft) : (settings.focus * 60 + (settings.breakMin * 60 - timeLeft)));
    return Math.min(100, Math.round((elapsed / (totalS || 1)) * 100));
  };

  if (loading) {
    return (
        <ThemedView style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={{ marginTop: 10, opacity: 0.5 }}>Syncing Room...</ThemedText>
        </ThemedView>
    );
  }

  // --- View: Plan Selection ---
  if (!plan) {
    return (
        <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.selectionContainer}>
                    <TouchableOpacity onPress={() => router.push("/(tabs)")} style={{ marginBottom: 16, alignSelf: 'flex-start', padding: 8, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                        <ChevronLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    
                    <View style={styles.selectionHeader}>
                        <View style={[styles.titleIcon, { backgroundColor: theme.primary }]}>
                            <Clock size={28} color="#fff" />
                        </View>
                        <Heading style={styles.selectionTitle}>Study Room</Heading>
                        <ThemedText style={styles.selectionSubtitle}>Execute your daily roadmap</ThemedText>
                    </View>

                    <View style={styles.planGrid}>
                        {availablePlans.length > 0 ? (
                            availablePlans.map(p => (
                                <View key={p.id} style={[styles.planItem, { backgroundColor: theme.card, borderColor: theme.border }, p.isMarked && { opacity: 0.5 }]}>
                                    <View style={styles.planItemInfo}>
                                        <View style={[styles.sectionBadge, { backgroundColor: p.section === 'math' ? '#3b82f6' : p.section === 'reading' ? '#f59e0b' : '#10b981' }]}>
                                            <ThemedText style={styles.badgeText}>{p.section.toUpperCase()}</ThemedText>
                                        </View>
                                        <ThemedText style={styles.planName} numberOfLines={1}>{p.tasks_text}</ThemedText>
                                        <ThemedText style={styles.planTime}>{p.start_time} - {p.end_time}</ThemedText>
                                    </View>
                                    
                                    {p.isMarked ? (
                                        <CheckCircle2 color="#10b981" size={24} />
                                    ) : p.isPast ? (
                                        <View style={styles.lockInfo}>
                                            <ThemedText style={styles.lockText}>Expired</ThemedText>
                                        </View>
                                    ) : p.isUpcoming ? (
                                        <View style={styles.lockInfo}>
                                            <Clock size={16} color={theme.textSecondary} />
                                            <ThemedText style={styles.lockText}>Starts {p.start_time}</ThemedText>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={[styles.startBtn, { backgroundColor: p.hasSavedState ? "#10b981" : theme.primary }]}
                                            onPress={() => router.push(`/(tabs)/study-room?planId=${p.id}`)}
                                        >
                                            <ThemedText style={styles.startBtnText}>{p.hasSavedState ? "CONTINUE" : "START"}</ThemedText>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <ThemedText style={styles.emptyText}>All missions for today are complete or unlisted.</ThemedText>
                                <Button title="Plan New Mission" style={{ marginTop: 20 }} onPress={() => router.push("/(tabs)/plan")} />
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
  }

  // --- View: Setup Configuration ---
  if (isSettingUp) {
    if (!plan) return null;
    const [sh, sm] = plan.start_time.split(":").map(Number);
    const [eh, em] = plan.end_time.split(":").map(Number);
    const totalDuration = (eh * 60 + em) - (sh * 60 + sm);

    // Dynamic calc of work time
    const calcWork = (brks: number, sess: number) => {
        return Math.max(1, Math.floor((totalDuration - (brks * sess)) / sess));
    };

    const handleAdjustSet = (type: 'break' | 'sessions', amount: number) => {
        setSettings(s => {
            let nextBrk = s.breakMin;
            let nextSess = s.sessions;
            if (type === 'break') nextBrk = Math.max(1, s.breakMin + amount);
            else nextSess = Math.max(1, s.sessions + amount);
            
            const nextWork = calcWork(nextBrk, nextSess);
            return { focus: nextWork, breakMin: nextBrk, sessions: nextSess };
        });
    };

    return (
        <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.setupContainer}>
                    <View style={styles.header}>
                    <TouchableOpacity onPress={() => setQuitModalVisible(true)} style={styles.backBtn}>
                        <ChevronLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                        <Heading>Mission Briefing</Heading>
                        <View style={{ width: 28 }} />
                    </View>

                    <Card style={styles.setupCard}>
                        <View style={styles.summaryGrid}>
                            <View style={styles.summaryBox}>
                                <ThemedText style={styles.summaryLabel}>TOTAL TIME</ThemedText>
                                <ThemedText style={styles.summaryValue}>{totalDuration}m</ThemedText>
                            </View>
                            <View style={styles.summaryBox}>
                                <ThemedText style={styles.summaryLabel}>WINDOW</ThemedText>
                                <ThemedText style={styles.summaryValue}>{plan.start_time}-{plan.end_time}</ThemedText>
                            </View>
                        </View>
                        
                        <View style={[styles.taskDisplay, { backgroundColor: theme.background }]}>
                            <ThemedText style={styles.taskDisplayText} numberOfLines={3}>{plan.tasks_text}</ThemedText>
                        </View>
                    </Card>

                    <Heading style={{ fontSize: 18, marginTop: 40, marginBottom: 20 }}>Configure Strategy</Heading>
                    
                    <Card style={styles.configCardMain}>
                        <View style={styles.configRow}>
                            <View style={styles.configItem}>
                                <ThemedText style={styles.configLabel}>PIECES (SESSIONS)</ThemedText>
                                <View style={styles.stepper}>
                                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjustSet('sessions', -1)}>
                                        <Minus size={20} color={theme.textPrimary} />
                                    </TouchableOpacity>
                                    <ThemedText style={styles.stepVal}>{settings.sessions}</ThemedText>
                                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjustSet('sessions', 1)}>
                                        <Plus size={20} color={theme.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.configRow, { marginTop: 24 }]}>
                            <View style={styles.configItem}>
                                <ThemedText style={styles.configLabel}>BREAK PER PIECE (m)</ThemedText>
                                <View style={styles.stepper}>
                                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjustSet('break', -1)}>
                                        <Minus size={20} color={theme.textPrimary} />
                                    </TouchableOpacity>
                                    <ThemedText style={styles.stepVal}>{settings.breakMin}</ThemedText>
                                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjustSet('break', 1)}>
                                        <Plus size={20} color={theme.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.resultBox, { backgroundColor: theme.primaryLight }]}>
                            <Zap size={20} color={theme.primary} />
                            <ThemedText style={styles.resultText}>
                                Strategy: <ThemedText style={{ fontWeight: '900', color: theme.primary }}>{settings.sessions}</ThemedText> pieces of <ThemedText style={{ fontWeight: '900', color: theme.primary }}>{settings.focus}m</ThemedText> focus each.
                            </ThemedText>
                        </View>
                    </Card>

                    <Button title="Engage Mission" style={{ marginTop: 40, height: 64 }} onPress={() => {
                        start(settings);
                        setIsSettingUp(false);
                    }} />
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
  }

  // --- View: Completion ---
  if (isCompleted) {
    if (!plan) return null;
    return (
        <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={styles.center}>
                <CheckCircle2 color={theme.primary} size={100} style={{ marginBottom: 24 }} />
                <Heading style={{ fontSize: 32, marginBottom: 12 }}>Mission Success</Heading>
                <ThemedText style={styles.successSub}>
                    You've completed your intensive study of {plan.section}. Ready to log your progress?
                </ThemedText>
                <Button 
                    title={markingDone ? "ARCHIVING..." : "LOG AS COMPLETED"} 
                    loading={markingDone}
                    onPress={markAsDone}
                    style={{ width: '100%', marginTop: 40, height: 60 }}
                />
                <TouchableOpacity style={{ marginTop: 24 }} onPress={() => setIsCompleted(false)}>
                    <ThemedText style={{ opacity: 0.4, fontWeight: '800', letterSpacing: 1 }}>KEEP WORKING</ThemedText>
                </TouchableOpacity>
            </SafeAreaView>
        </ThemedView>
    );
  }

  // --- View: Active Execution ---
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.execHeader}>
            <TouchableOpacity onPress={handleQuit}>
                <View style={[styles.quitBtn, { backgroundColor: theme.card }]}>
                    <ThemedText style={styles.quitText}>QUIT SESSION</ThemedText>
                </View>
            </TouchableOpacity>
            
            <View style={styles.dashDots}>
                {Array.from({ length: settings.sessions }).map((_, i) => (
                    <View 
                        key={i} 
                        style={[
                            styles.dashDot, 
                            { backgroundColor: (i + 1) === currentSession ? (mode === 'break' ? '#10b981' : theme.primary) : theme.border },
                            (i + 1) < currentSession && { backgroundColor: '#10b981' }
                        ]} 
                    />
                ))}
            </View>

            <View style={[styles.execBadge, { backgroundColor: mode === 'break' ? '#10b981' : theme.primary }]}>
                <ThemedText style={styles.execBadgeText}>{mode.toUpperCase()}</ThemedText>
            </View>
        </View>

        <View style={styles.timerCenter}>
            <Animated.View style={[styles.timerRing, animatedCircleStyle]}>
                 <ThemedText style={[styles.activeTimerVal, { fontSize: timeLeft >= 3600 ? 54 : 82 }]}>
                    {formatTime(timeLeft)}
                </ThemedText>
                <ThemedText style={styles.sessionStatus}>Part {currentSession} of {settings.sessions}</ThemedText>
            </Animated.View>
        </View>

        <View style={styles.actionRow}>
            <TouchableOpacity 
                style={[styles.bigPlay, { backgroundColor: theme.primary }]}
                onPress={toggle}
            >
                {isRunning ? <Pause color="#fff" size={40} fill="#fff" /> : <Play color="#fff" size={40} fill="#fff" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.resetIconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => setResetModalVisible(true)}
            >
                <RefreshCw color={theme.textPrimary} size={28} />
            </TouchableOpacity>
        </View>

        <View style={styles.globalProgressBox}>
            <View style={styles.progressLabelRow}>
                <ThemedText style={styles.progressNote}>OVERALL COMPLETION</ThemedText>
                <ThemedText style={[styles.progressPct, { color: mode === 'break' ? '#10b981' : theme.primary }]}>{getGlobalProgress()}%</ThemedText>
            </View>
            <View style={[styles.barContainer, { backgroundColor: theme.card }]}>
                <View style={[styles.barFill, { width: `${getGlobalProgress()}%`, backgroundColor: mode === 'break' ? '#10b981' : theme.primary }]} />
            </View>
        </View>

        <View style={{ flex: 1, marginTop: 40 }}>
            <Heading style={{ fontSize: 12, opacity: 0.3, letterSpacing: 2, marginBottom: 15 }}>ACTIVE OBJECTIVE</Heading>
            <Card style={styles.objectiveCard}>
                <ThemedText style={styles.objectiveText}>{plan.tasks_text}</ThemedText>
            </Card>
        </View>
      </SafeAreaView>

      <ConfirmModal 
        visible={quitModalVisible}
        title="Quit Session?"
        message="Do you want to save your progress or discard it?"
        onCancel={() => setQuitModalVisible(false)}
        onConfirm={async () => {
             if (plan) await storage.removeItem(`study_room_state_${plan.id}`);
             setQuitModalVisible(false);
             setPlan(null);
             router.setParams({ planId: undefined });
             // loadData triggered by param change
        }}
        confirmLabel="Discard"
        isDestructive
        onAlternative={() => {
            // State is already saved by useEffect
            setQuitModalVisible(false);
            setPlan(null);
            router.setParams({ planId: undefined });
        }}
        alternativeLabel="Save"
      />

      <ConfirmModal 
        visible={resetModalVisible}
        title="Reset Timer"
        message="Restart this piece? Current progress for this session will be lost."
        onCancel={() => setResetModalVisible(false)}
        onConfirm={() => {
            reset("focus");
            setResetModalVisible(false);
        }}
        confirmLabel="Reset"
        isDestructive
      />
      
      <FeedbackErrorModal 
        visible={!!errorMsg}
        error={errorMsg}
        onDismiss={() => setErrorMsg(null)}
        onRetry={loadData}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  selectionContainer: {
    padding: 24,
    paddingBottom: 60,
  },
  selectionHeader: {
    alignItems: "center",
    marginBottom: 48,
    marginTop: 20,
  },
  titleIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  selectionTitle: {
    fontSize: 32,
  },
  selectionSubtitle: {
    fontSize: 14,
    opacity: 0.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 6,
  },
  planGrid: {
    gap: 16,
  },
  planItem: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  planItemInfo: {
    flex: 1,
    gap: 4,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
  },
  planName: {
    fontSize: 16,
    fontWeight: "900",
  },
  planTime: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.4,
  },
  startBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
  },
  startBtnText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '900',
  },
  lockInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      opacity: 0.5,
  },
  lockText: {
      fontSize: 12,
      fontWeight: '900',
  },
  setupContainer: {
      padding: 24,
      paddingBottom: 60,
  },
  setupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 32,
  },
  setupCard: {
      padding: 24,
      gap: 20,
  },
  summaryGrid: {
      flexDirection: 'row',
      gap: 20,
  },
  summaryBox: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.02)',
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
  },
  summaryLabel: {
      fontSize: 9,
      fontWeight: '900',
      opacity: 0.3,
      marginBottom: 4,
  },
  summaryValue: {
      fontSize: 18,
      fontWeight: '900',
  },
  taskDisplay: {
      padding: 16,
      borderRadius: 16,
  },
  taskDisplayText: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      opacity: 0.7,
  },
  configCardMain: {
      padding: 24,
  },
  configRow: {
      gap: 10,
  },
  configLabel: {
      fontSize: 11,
      fontWeight: '900',
      opacity: 0.4,
      marginBottom: 12,
  },
  stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.03)',
      padding: 8,
      borderRadius: 18,
  },
  stepBtn: {
      width: 44,
      height: 44,
      backgroundColor: '#fff',
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
  },
  stepVal: {
      fontSize: 20,
      fontWeight: '900',
  },
  resultBox: {
      marginTop: 24,
      padding: 16,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  resultText: {
      fontSize: 14,
      fontWeight: '700',
      opacity: 0.8,
  },
  container: {
      flex: 1,
      padding: 24,
  },
  execHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
  },
  quitBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
  },
  quitText: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.4,
  },
  dashDots: {
      flexDirection: 'row',
      gap: 6,
  },
  dashDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
  },
  execBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
  },
  execBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '900',
  },
  timerCenter: {
      alignItems: 'center',
      marginBottom: 40,
  },
  timerRing: {
      width: 300,
      height: 300,
      borderRadius: 150,
      borderWidth: 4,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.01)',
  },
  activeTimerVal: {
      fontWeight: '900',
  },
  sessionStatus: {
      fontSize: 14,
      fontWeight: '900',
      opacity: 0.2,
      marginTop: 10,
  },
  actionRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 32,
      marginBottom: 40,
  },
  bigPlay: {
      width: 88,
      height: 88,
      borderRadius: 44,
      justifyContent: 'center',
      alignItems: 'center',
      shadowOpacity: 0.2,
      shadowRadius: 15,
      elevation: 8,
  },
  resetIconButton: {
      width: 56,
      height: 56,
      borderRadius: 20,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
  },
  globalProgressBox: {
      marginBottom: 20,
  },
  progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
  },
  progressNote: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.3,
  },
  progressPct: {
      fontSize: 12,
      fontWeight: '900',
  },
  barContainer: {
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
  },
  barFill: {
      height: '100%',
      borderRadius: 6,
  },
  objectiveCard: {
      padding: 20,
  },
  objectiveText: {
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 24,
      opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.5,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  header: {
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  configItem: {
      flex: 1,
  },
  successSub: {
      fontSize: 16,
      textAlign: 'center',
      fontWeight: '600',
      opacity: 0.6,
      lineHeight: 24,
      marginBottom: 32,
  }
});
