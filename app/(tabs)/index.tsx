import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, ScrollView, View, TouchableOpacity, RefreshControl, ActivityIndicator, LayoutAnimation, Platform, UIManager, Linking, Alert } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getLocalTimeString } from "../../lib/dateUtils";
import { Bell, Flame, Target, BookOpen, Clock, Calendar, ChevronRight, Play, ArrowRight, Zap, X } from "lucide-react-native";
import { FeedbackErrorModal } from "../../components/FeedbackErrorModal";
import { checkConnection } from "../../lib/network";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DashboardPlan = {
  id: string;
  section: "math" | "reading" | "writing";
  start_time: string;
  end_time: string;
  tasks_text: string;
  isActive: boolean;
  isPast: boolean;
  isMarked?: boolean;
};

export default function DashboardScreen() {
  const { theme, themeName } = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetScore, setTargetScore] = useState<number | null>(null);
  const [daysUntilExam, setDaysUntilExam] = useState<number | null>(null);
  const [todayPlans, setTodayPlans] = useState<DashboardPlan[]>([]);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const examDates: Record<string, string> = {
    "March 2026": "2026-03-14",
    "May 2026": "2026-05-02",
    "June 2026": "2026-06-06",
    "August 2026": "2026-08-15",
    "October 2026": "2026-10-03",
    "November 2026": "2026-11-07",
    "December 2026": "2026-12-05",
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setUserName(profile.name || "");
          setExamDate(profile.exam_date || "");
          
          const totalTarget = (profile.target_math || 0) + (profile.target_reading_writing || 0);
          setTargetScore(totalTarget || null);

          // Calculate days until exam
          if (profile.exam_date && examDates[profile.exam_date]) {
            const examDateObj = new Date(examDates[profile.exam_date]);
            examDateObj.setHours(10, 0, 0, 0); // Set to 10:00 AM
            
            const now = new Date();
            const diffTime = examDateObj.getTime() - now.getTime();
            // Calculate fractional days
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            setDaysUntilExam(diffDays > 0 ? diffDays : null);
          }
        }
        
        const today = getLocalDateString();
        const [plansRes, logsRes] = await Promise.all([
          supabase.from("study_plan").select("*").eq("user_id", user.id).eq("date", today),
          supabase.from("daily_log").select("plan_id, status").eq("user_id", user.id).eq("date", today)
        ]);
        
        if (plansRes.data) {
          const now = new Date();
          const curTime = getLocalTimeString(now);
          const logs = logsRes.data || [];
          
          const processed = plansRes.data.map((p: any) => {
            const log = logs.find((l: any) => l.plan_id === p.id);
            return {
              ...p,
              isActive: curTime >= p.start_time && curTime <= p.end_time,
              isPast: curTime > p.end_time,
              isMarked: !!log
            };
          });

          processed.sort((a, b) => {
            const aDone = a.isMarked || a.isPast;
            const bDone = b.isMarked || b.isPast;
            if (aDone && !bDone) return 1;
            if (!aDone && bDone) return -1;
            return a.start_time.localeCompare(b.start_time);
          });

          setTodayPlans(processed);
        }
      }
    } catch (e: any) {
      console.error(e);
      const isOnline = await checkConnection();
      const msg = isOnline 
        ? (e.message || "Failed to fetch data. Server error.") 
        : "No internet connection. Please check your network and try again.";
      setErrorMsg(msg);
      setErrorVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const [feedbackVisible, setFeedbackVisible] = useState(true);
  
  // Real-time timer update & fresh data ticker
  useEffect(() => {
    if (!examDate || !examDates[examDate]) {
        // Still run ticker even if no exam date set
        const interval = setInterval(() => fetchData(), 60000);
        return () => clearInterval(interval);
    }
    
    const targetDate = new Date(examDates[examDate]);
    targetDate.setHours(10, 0, 0, 0);

    const countdownInterval = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      const diffInDays = diff / (1000 * 60 * 60 * 24);
      setDaysUntilExam(diffInDays > 0 ? diffInDays : 0);
    }, 1000);

    const dataInterval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => {
        clearInterval(countdownInterval);
        clearInterval(dataInterval);
    };
  }, [examDate]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <FeedbackErrorModal 
        visible={errorVisible} 
        error={errorMsg} 
        onDismiss={() => {
            setErrorVisible(false);
            setLoading(false);
        }} 
        onRetry={fetchData}
      />
      {loading ? (
        <ThemedView style={styles.center}>
            <ActivityIndicator color={theme.primary} size="large" />
            <ThemedText style={{ marginTop: 10, opacity: 0.5, fontWeight: '700' }}>Loading Dashboard...</ThemedText>
        </ThemedView>
      ) : (
        <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Welcome Header */}
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Hello, <ThemedText style={{ color: theme.primary, textTransform: 'capitalize' }}>{userName || "Friend"}</ThemedText>!</ThemedText>
              <ThemedText style={styles.subtitle}>Ready to crush the SAT?</ThemedText>
            </View>
            <View style={styles.headerActions}>
                <TouchableOpacity onPress={() => router.push("/(tabs)/plan")} style={[styles.mainBtn, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.mainBtnText}>Create Plan</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/(tabs)/study-room")} style={[styles.secondBtn, { borderColor: theme.border }]}>
                    <ThemedText style={[styles.secondBtnText, { color: theme.primary }]}>Start Timer</ThemedText>
                </TouchableOpacity>
            </View>
          </View>

          {/* Compact Stats Card */}
          {(userName || examDate || targetScore) && (
            <Card style={styles.profileCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                
                {/* Left: Target Score */}
                {targetScore ? (
                    <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Target size={14} color={theme.primary} />
                            <ThemedText style={{ fontSize: 10, fontWeight: '800', opacity: 0.5, textTransform: 'uppercase' }}>Target</ThemedText>
                        </View>
                        <ThemedText style={{ fontSize: 28, fontWeight: '900', color: theme.primary, lineHeight: 32 }}>{targetScore}</ThemedText>
                        <TouchableOpacity onPress={() => router.push("/edit-profile")}>
                            <ThemedText style={{ fontSize: 10, fontWeight: '700', opacity: 0.4 }}>Edit Goal ›</ThemedText>
                        </TouchableOpacity>
                    </View>
                ) : <View />}

                {/* Right: Countdown */}
                {daysUntilExam !== null && (
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Calendar size={10} color={theme.textSecondary} />
                            <ThemedText style={{ fontSize: 9, fontWeight: '700', opacity: 0.5 }}>{examDate}</ThemedText>
                        </View>
                        <View style={[styles.timerGrid, { gap: 2 }]}>
                            <View style={[styles.timerBox, { width: 28 }]}>
                              <View style={[styles.timerCard, { backgroundColor: theme.card, borderColor: theme.border, padding: 2, minWidth: 24, borderRadius: 6 }]}>
                                <ThemedText style={[styles.timerValue, { fontSize: 12 }]}>{Math.floor(daysUntilExam)}</ThemedText>
                              </View>
                              <ThemedText style={[styles.timerLabel, { fontSize: 5 }]}>D</ThemedText>
                            </View>
                            <View style={[styles.timerBox, { width: 28 }]}>
                              <View style={[styles.timerCard, { backgroundColor: theme.card, borderColor: theme.border, padding: 2, minWidth: 24, borderRadius: 6 }]}>
                                <ThemedText style={[styles.timerValue, { fontSize: 12 }]}>{Math.floor((daysUntilExam % 1) * 24)}</ThemedText>
                              </View>
                              <ThemedText style={[styles.timerLabel, { fontSize: 5 }]}>H</ThemedText>
                            </View>
                            <View style={[styles.timerBox, { width: 28 }]}>
                              <View style={[styles.timerCard, { backgroundColor: theme.card, borderColor: theme.border, padding: 2, minWidth: 24, borderRadius: 6 }]}>
                                <ThemedText style={[styles.timerValue, { fontSize: 12 }]}>{Math.floor((daysUntilExam * 24 * 60) % 60)}</ThemedText>
                              </View>
                              <ThemedText style={[styles.timerLabel, { fontSize: 5 }]}>M</ThemedText>
                            </View>
                            <View style={[styles.timerBox, { width: 28 }]}>
                              <View style={[styles.timerCard, { backgroundColor: theme.card, borderColor: theme.border, padding: 2, minWidth: 24, borderRadius: 6 }]}>
                                <ThemedText style={[styles.timerValue, { fontSize: 12 }]}>{Math.floor((daysUntilExam * 24 * 3600) % 60)}</ThemedText>
                              </View>
                              <ThemedText style={[styles.timerLabel, { fontSize: 5 }]}>S</ThemedText>
                            </View>
                        </View>
                    </View>
                )}
              </View>
            </Card>
          )}

              <View style={{ marginBottom: 20 }} />

              {/* Prompt to Complete Profile */}
              {!userName && (
                <TouchableOpacity onPress={() => router.push("/edit-profile")}>
                  <Card style={[styles.profileCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                            <ThemedText style={{ fontSize: 20 }}>👤</ThemedText>
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={{ fontWeight: '800', fontSize: 16 }}>Complete Your Profile</ThemedText>
                            <ThemedText style={{ fontSize: 12, opacity: 0.7 }}>Set your name and exam date to personalize your dashboard.</ThemedText>
                        </View>
                        <ChevronRight color={theme.primary} size={20} />
                    </View>
                  </Card>
                </TouchableOpacity>
              )}

          <View style={styles.layout}>
            {/* Main Content */}
            <View style={styles.mainCol}>
                <Card style={styles.scheduleCard}>
                    <View style={styles.scheduleHeader}>
                        <View style={styles.scheduleTitleRow}>
                            <View style={[styles.accentBar, { backgroundColor: theme.primary }]} />
                            <Heading style={styles.scheduleTitle}>TODAY'S PLANS</Heading>
                        </View>
                        <TouchableOpacity onPress={() => router.push("/(tabs)/check-in")}>
                            <ThemedText style={[styles.fullCheckLink, { color: theme.primary }]}>Full Check-in →</ThemedText>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.scheduleList}>
                        {todayPlans.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIcon, { backgroundColor: themeName === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}>
                                    <Target size={32} color={themeName === 'dark' ? '#fff' : '#9ca3af'} />
                                </View>
                                <ThemedText style={styles.emptyTitle}>No plans set for today</ThemedText>
                                <ThemedText style={styles.emptySub}>Success doesn't just happen. It's planned.</ThemedText>
                                <TouchableOpacity 
                                    style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                                    onPress={() => router.push("/(tabs)/plan")}
                                >
                                    <ThemedText style={styles.emptyBtnText}>Create a Plan</ThemedText>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            todayPlans.map((plan) => (
                                <View 
                                    key={plan.id}
                                    style={[
                                        styles.planRow, 
                                        { borderColor: theme.border },
                                        plan.isActive && { borderColor: theme.primary, borderWidth: 2 }
                                    ]}
                                >
                                    <View style={styles.planInfo}>
                                        <View style={[styles.sectionBar, { backgroundColor: plan.section === 'math' ? '#3b82f6' : plan.section === 'reading' ? '#f59e0b' : '#10b981' }]} />
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.planTagRow}>
                                                <ThemedText style={[styles.planTag, { color: plan.section === 'math' ? '#3b82f6' : plan.section === 'reading' ? '#f59e0b' : '#10b981' }]}>{plan.section}</ThemedText>
                                                {plan.isActive && (
                                                    <View style={[styles.activeBadge, { backgroundColor: theme.primary }]}>
                                                        <ThemedText style={styles.activeBadgeText}>ACTIVE</ThemedText>
                                                    </View>
                                                )}
                                                {plan.isMarked && (
                                                    <View style={[styles.activeBadge, { backgroundColor: '#10b981' }]}>
                                                        <ThemedText style={styles.activeBadgeText}>DONE</ThemedText>
                                                    </View>
                                                )}
                                            </View>
                                            <ThemedText style={styles.tasksText} numberOfLines={1}>{plan.tasks_text}</ThemedText>
                                            <ThemedText style={styles.timeText}>{plan.start_time} - {plan.end_time}</ThemedText>
                                        </View>
                                    </View>
                                    {!plan.isMarked && !plan.isPast && (
                                        <TouchableOpacity 
                                            style={[
                                                styles.enterRoomBtn, 
                                                { 
                                                    backgroundColor: plan.isActive ? theme.primary : 'transparent',
                                                    borderColor: plan.isActive ? theme.primary : theme.border,
                                                    borderWidth: 1,
                                                    opacity: plan.isActive ? 1 : 0.5
                                                }
                                            ]}
                                            onPress={() => {
                                                if (plan.isMarked || plan.isPast) {
                                                    const msg = "This session is already completed or expired.";
                                                    if (Platform.OS === 'web') window.alert(msg);
                                                    else Alert.alert("Plan Closed", msg);
                                                    return;
                                                }
                                                if (!plan.isActive) {
                                                    const msg = `This plan is scheduled for ${plan.start_time}. Access will open then.`;
                                                    if (Platform.OS === 'web') window.alert(msg);
                                                    else Alert.alert("Stand By", msg);
                                                    return;
                                                }
                                                router.push(`/(tabs)/study-room?planId=${plan.id}`);
                                            }}
                                        >
                                            <ThemedText style={[styles.enterRoomText, { color: plan.isActive ? '#fff' : theme.textSecondary }]}>Enter Study Room</ThemedText>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </Card>

                {/* Quick Access Grid */}
                <View style={styles.quickGrid}>
                    <TouchableOpacity style={[styles.streakCard, { backgroundColor: theme.primary }]} onPress={() => router.push("/(tabs)/check-in")}>
                        <Heading style={styles.quickTitle}>Build Your Streak</Heading>
                        <ThemedText style={styles.quickSub}>Consistent study is the key to a high score. Check in daily to build your momentum.</ThemedText>
                        <View style={styles.quickAction}>
                            <ThemedText style={[styles.quickActionText, { color: theme.primary }]}>Go to Check-in →</ThemedText>
                        </View>
                    </TouchableOpacity>

                    <Card style={styles.roomCard}>
                        <TouchableOpacity onPress={() => router.push("/(tabs)/study-room")}>
                            <Heading style={styles.quickTitleBlack}>Study Room</Heading>
                            <ThemedText style={styles.quickSubBlack}>Execute your scheduled objectives with integrated piece-by-piece management.</ThemedText>
                            <View style={[styles.quickActionBlack, { backgroundColor: theme.primary }]}>
                                <ThemedText style={styles.quickActionTextBlack}>Go to Study Room →</ThemedText>
                            </View>
                        </TouchableOpacity>
                    </Card>
                </View>
            </View>

            {/* Sidebar (Desktop view logic - column on side) */}
            <View style={styles.sideCol}>
                <Card style={styles.linksCard}>
                    <ThemedText style={styles.linksLabel}>QUICK LINKS</ThemedText>
                    <TouchableOpacity style={styles.linkItem} onPress={() => router.push("/(tabs)/plan")}>
                        <View style={[styles.linkIcon, { backgroundColor: theme.primaryLight }]}>
                            <Calendar size={18} color={theme.primary} />
                        </View>
                        <ThemedText style={styles.linkText}>Study Planner</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkItem} onPress={() => router.push("/(tabs)/check-in")}>
                        <View style={[styles.linkIcon, { backgroundColor: '#f0fdf4' }]}>
                            <Zap size={18} color="#10b981" />
                        </View>
                        <ThemedText style={styles.linkText}>Daily Check-in</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkItem} onPress={() => router.push("/archive")}>
                        <View style={[styles.linkIcon, { backgroundColor: '#eff6ff' }]}>
                            <BookOpen size={18} color="#3b82f6" />
                        </View>
                        <ThemedText style={styles.linkText}>Study History</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkItem} onPress={() => router.push("/(tabs)/focus")}>
                        <View style={[styles.linkIcon, { backgroundColor: '#fdf4ff' }]}>
                            <Clock size={18} color="#c026d3" />
                        </View>
                        <ThemedText style={styles.linkText}>Classic Timer</ThemedText>
                    </TouchableOpacity>
                </Card>

                <Card style={[styles.tipCard, { backgroundColor: themeName === 'dark' ? 'rgba(245, 158, 11, 0.05)' : '#fffbeb', borderColor: theme.primaryLight }]}>
                    <ThemedText style={[styles.tipTitle, { color: theme.primary }]}>Study Tip</ThemedText>
                    <ThemedText style={styles.tipText}>"The secret of getting ahead is getting started." — Stay consistent with your daily plans to reach your target score.</ThemedText>
                </Card>
            </View>
          </View>
          
          {/* Extra closing tags removed */}
          
          {/* Footer Contact */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <View style={styles.footerContent}>
                <ThemedText style={styles.copyright}>© 2026 SAT Tracker. All Rights Reserved.</ThemedText>
                <View style={styles.contactInfo}>
                    <ThemedText style={styles.contactItem}>ibrohimshaymardanov011@gmail.com</ThemedText>
                    <View style={styles.dot} />
                    <ThemedText style={styles.contactItem}>t.me/@ibrohimfr</ThemedText>
                </View>
            </View>
          </View>
        </ScrollView>
        
        {/* Floating Feedback FAB */}
        {feedbackVisible && (
          <View style={[styles.fab, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={() => Linking.openURL("https://t.me/ibrohimfr")} style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <View style={[styles.fabBadge, { backgroundColor: theme.primaryLight }]}>
                  <ThemedText style={[styles.fabBadgeText, { color: theme.primary }]}>Feedback</ThemedText>
              </View>
              <ThemedText style={styles.fabText}>Have suggestions?</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFeedbackVisible(false)} style={{ marginLeft: 8, padding: 4 }}>
                <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
      )}
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
    padding: 24,
    paddingTop: 40,
    paddingBottom: 80, // Add padding for FAB
  },
  header: {
    marginBottom: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.5,
    marginTop: 8,
  },
  headerActions: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
  },
  mainBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 14,
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
  },
  mainBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 14,
  },
  secondBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
  },
  secondBtnText: {
      fontWeight: '900',
      fontSize: 14,
  },
  layout: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 32,
  },
  mainCol: {
      flex: 2,
      minWidth: 350,
      gap: 32,
  },
  sideCol: {
      flex: 1,
      minWidth: 280,
      gap: 24,
  },
  scheduleCard: {
      padding: 0,
      overflow: 'hidden',
  },
  scheduleHeader: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: 'rgba(0,0,0,0.02)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  scheduleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  accentBar: {
      width: 4,
      height: 20,
      borderRadius: 2,
  },
  scheduleTitle: {
      fontSize: 16,
  },
  fullCheckLink: {
      fontSize: 12,
      fontWeight: '900',
  },
  scheduleList: {
      padding: 24,
      gap: 16,
  },
  emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
  },
  emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
  },
  emptyTitle: {
      fontSize: 18,
      fontWeight: '900',
      marginBottom: 4,
  },
  emptySub: {
      fontSize: 14,
      opacity: 0.5,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 24,
  },
  emptyBtn: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
  },
  emptyBtnText: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 14,
  },
  planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      flexWrap: 'wrap',
      gap: 16,
  },
  planInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
  },
  sectionBar: {
      width: 4,
      height: 40,
      borderRadius: 2,
  },
  planText: {
      flex: 1,
  },
  planTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
  },
  planTag: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  activeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  activeBadgeText: {
      color: '#fff',
      fontSize: 8,
      fontWeight: '900',
  },
  tasksText: {
      fontSize: 15,
      fontWeight: '800',
  },
  timeText: {
      fontSize: 12,
      opacity: 0.4,
      fontWeight: '700',
      marginTop: 2,
  },
  enterRoomBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
  },
  enterRoomText: {
      fontSize: 12,
      fontWeight: '900',
  },
  quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 24,
  },
  streakCard: {
      flex: 1,
      minWidth: 250,
      padding: 32,
      borderRadius: 32,
  },
  quickTitle: {
      color: '#fff',
      fontSize: 20,
  },
  quickSub: {
      color: '#fff',
      opacity: 0.8,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 24,
  },
  quickAction: {
      alignSelf: 'flex-start',
      backgroundColor: '#fff',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
  },
  quickActionText: {
      fontSize: 12,
      fontWeight: '900',
  },
  roomCard: {
      flex: 1,
      minWidth: 250,
      padding: 32,
      borderRadius: 32,
  },
  quickTitleBlack: {
      fontSize: 20,
  },
  quickSubBlack: {
      opacity: 0.5,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 24,
  },
  quickActionBlack: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
  },
  quickActionTextBlack: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '900',
  },
  linksCard: {
      padding: 24,
      gap: 16,
  },
  linksLabel: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.4,
      letterSpacing: 2,
      marginBottom: 8,
  },
  linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
  },
  linkIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  },
  linkText: {
      fontSize: 14,
      fontWeight: '800',
  },
  tipCard: {
      padding: 24,
      borderWidth: 1,
      borderStyle: 'dashed',
  },
  tipTitle: {
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 10,
  },
  tipText: {
      fontSize: 12,
      fontWeight: '600',
      fontStyle: 'italic',
      opacity: 0.7,
      lineHeight: 18,
  },
  footer: {
      marginTop: 64,
      paddingBottom: 20,
  },
  footerLine: {
      height: 1,
      backgroundColor: 'rgba(0,0,0,0.05)',
      marginBottom: 24,
  },
  footerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
  },
  copyright: {
      fontSize: 11,
      fontWeight: '700',
      opacity: 0.3,
  },
  contactInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  contactItem: {
      fontSize: 10,
      fontWeight: '700',
      opacity: 0.25,
  },
  dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
  },
  fabBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  fabBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
  },
  fabText: {
      fontSize: 12,
      fontWeight: '700',
  },
  profileCard: {
    padding: 20,
    marginBottom: 20,
    gap: 24,
  },
  countdownSection: {
    gap: 16,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countdownTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timerBox: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  timerCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.6,
  },
  examDateText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.6,
  },
  scoreSection: {
    gap: 12,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  totalScore: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  scoreBreakdown: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    width: 40,
  },
  progressTrack: {
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressTarget: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  progressCurrent: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
  },
  setupProfileBtn: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  setupText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
