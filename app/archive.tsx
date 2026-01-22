import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useRouter, Stack } from "expo-router";
import { supabase } from "../lib/supabase";
import { getLocalDateString, getMonthYearString } from "../lib/dateUtils";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock } from "lucide-react-native";
import { FeedbackErrorModal } from "../components/FeedbackErrorModal";
import { checkConnection } from "../lib/network";

type StudyPlan = {
  id: string;
  date: string;
  section: "math" | "reading" | "writing";
  start_time: string;
  end_time: string;
  tasks_text: string;
  status?: "done" | "missed" | "untracked";
};

export default function ArchiveScreen() {
  const { theme, themeName } = useTheme();
  const router = useRouter();
  
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Start from Yesterday
  const initialDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  })();
  
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Generate last 30 days starting from yesterday
  const getHistoryDays = () => {
      const days = [];
      const today = new Date();
      // Start from 1 to skip today
      for (let i = 1; i <= 30; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          days.push(getLocalDateString(d));
      }
      return days; // [Yesterday, day-2, ...]
  };

  const historyDays = getHistoryDays();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  async function loadPlanForDate(dateStr: string) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: plansData, error: plansError } = await supabase
        .from("study_plan")
        .select("id, date, section, start_time, end_time, tasks_text")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .order("start_time", { ascending: true });

      if (plansError) throw plansError;

      if (plansData && plansData.length > 0) {
        const planIds = plansData.map(p => p.id);
        const { data: logsData } = await supabase
          .from("daily_log")
          .select("plan_id, status")
          .in("plan_id", planIds);

        const enriched = plansData.map((p: any) => {
          const log = logsData?.find(l => l.plan_id === p.id);
          return {
            ...p,
            status: log?.status || "untracked"
          };
        });

        setPlans(enriched);
      } else {
        setPlans([]);
      }
    } catch (e: any) {
      console.error(e);
      const isOnline = await checkConnection();
      setErrorMsg(isOnline ? (e.message || "Failed to load history.") : "No internet connection.");
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlanForDate(selectedDate);
  }, [selectedDate]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <FeedbackErrorModal 
        visible={errorVisible} 
        error={errorMsg} 
        onDismiss={() => setErrorVisible(false)} 
        onRetry={() => loadPlanForDate(selectedDate)}
      />
      <Stack.Screen options={{ 
        title: "Study History", 
        headerShown: true,
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                <ChevronLeft color={theme.textPrimary} size={28} />
            </TouchableOpacity>
        ),
        headerStyle: { backgroundColor: theme.card },
        headerShadowVisible: false,
      }} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <View style={styles.container}>
            {/* Calendar Strip */}
            <View style={styles.calendarSection}>
                <View style={[styles.calHeader, { justifyContent: 'space-between' }]}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                     <CalendarIcon size={16} color={theme.primary} />
                     <ThemedText style={styles.calTitle}>Select Date</ThemedText>
                   </View>
                   <ThemedText style={[styles.calTitle, { opacity: 0.8 }]}>{getMonthYearString(selectedDate)}</ThemedText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calScroll}>
                    {/* Inverted layout logic or simpler: Reverse the array? NO. 
                        We want Today on Right? Or Left? 
                        Typically history goes Left (New -> Old). 
                        Our array is [Today, Yesterday...]
                        So render as is.
                     */}
                    {historyDays.map((d, i) => {
                       const dayDate = new Date(d + "T00:00:00");
                       const isSelected = selectedDate === d;
                       return (
                           <TouchableOpacity 
                               key={i} 
                               style={[
                                   styles.dayCard, 
                                   { borderColor: theme.border, backgroundColor: theme.card },
                                   isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                               ]}
                               onPress={() => setSelectedDate(d)}
                           >
                               <ThemedText style={[styles.dayName, isSelected && { color: '#fff' }]}>{dayNames[dayDate.getDay()]}</ThemedText>
                               <ThemedText style={[styles.dayNum, isSelected && { color: '#fff' }]}>{dayDate.getDate()}</ThemedText>
                           </TouchableOpacity>
                       );
                   })}
                </ScrollView>
            </View>

            {/* Content for Date */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.listContainer}>
                    {plans.length === 0 ? (
                        <View style={styles.empty}>
                            <Clock size={64} color={theme.textSecondary} opacity={0.2} />
                            <ThemedText style={styles.emptyText}>No records for this date</ThemedText>
                        </View>
                    ) : (
                        plans.map((plan) => (
                            <Card key={plan.id} style={styles.planCard}>
                                <View style={styles.cardMain}>
                                    <View style={styles.leftInfo}>
                                        <View style={[styles.sectionIndicator, { backgroundColor: plan.section === 'math' ? '#3b82f6' : plan.section === 'reading' ? '#f59e0b' : '#10b981' }]} />
                                        <View>
                                            <ThemedText style={styles.planSubject}>{plan.section.toUpperCase()}</ThemedText>
                                            <ThemedText style={styles.tasks} numberOfLines={1}>{plan.tasks_text}</ThemedText>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.rightInfo}>
                                        <ThemedText style={styles.planTime}>
                                            {plan.start_time} - {plan.end_time}
                                        </ThemedText>
                                        <View style={styles.statusBadge}>
                                            {plan.status === "done" ? (
                                                <View style={[styles.outcomeBadge, { backgroundColor: themeName === 'dark' ? '#064e3b' : '#f0fdf4', borderColor: '#10b981' }]}>
                                                    <CheckCircle2 color="#10b981" size={12} strokeWidth={3} />
                                                    <ThemedText style={[styles.outcomeText, { color: '#10b981' }]}>DONE</ThemedText>
                                                </View>
                                            ) : plan.status === "missed" ? (
                                                <View style={[styles.outcomeBadge, { backgroundColor: themeName === 'dark' ? '#450a0a' : '#fef2f2', borderColor: '#ef4444' }]}>
                                                    <XCircle color="#ef4444" size={12} strokeWidth={3} />
                                                    <ThemedText style={[styles.outcomeText, { color: '#ef4444' }]}>MISSED</ThemedText>
                                                </View>
                                            ) : (
                                                <ThemedText style={styles.untrackedText}>UNTRACKED</ThemedText>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </Card>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
      flex: 1,
  },
  center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
  },
  calendarSection: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  calHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
      paddingHorizontal: 24,
  },
  calTitle: {
      fontSize: 12,
      fontWeight: '900',
      opacity: 0.4,
      textTransform: 'uppercase',
  },
  calScroll: {
      paddingHorizontal: 24,
      gap: 12,
  },
  dayCard: {
      width: 50,
      height: 70,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
  },
  dayName: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.5,
      marginBottom: 4,
  },
  dayNum: {
      fontSize: 18,
      fontWeight: '900',
  },
  listContainer: {
      padding: 24,
      gap: 16,
  },
  empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 20,
  },
  emptyText: {
      fontSize: 16,
      fontWeight: "700",
      opacity: 0.3,
  },
  planCard: {
      padding: 16,
  },
  cardMain: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
  },
  leftInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
  },
  sectionIndicator: {
      width: 4,
      height: 32,
      borderRadius: 2,
  },
  planSubject: {
      fontSize: 10,
      fontWeight: "900",
      opacity: 0.4,
      letterSpacing: 1,
      marginBottom: 4,
  },
  tasks: {
      fontSize: 14,
      fontWeight: "700",
  },
  rightInfo: {
      alignItems: "flex-end",
      gap: 6,
  },
  planTime: {
      fontSize: 11,
      fontWeight: "800",
      opacity: 0.5,
      fontVariant: ["tabular-nums"],
  },
  statusBadge: {
      flexDirection: "row",
      alignItems: "center",
  },
  outcomeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
  },
  outcomeText: {
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 0.5,
  },
  untrackedText: {
      fontSize: 9,
      fontWeight: "900",
      opacity: 0.3,
      letterSpacing: 0.5,
  },
});
