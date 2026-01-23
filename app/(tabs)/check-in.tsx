import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getLocalTimeString, getMonthYearString } from "../../lib/dateUtils";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Check, X, Play, Calendar as CalendarIcon, Clock, ChevronRight, Lock, Trash2, Edit2 } from "lucide-react-native";
import { Toast } from "../../components/Toast";
import { FeedbackErrorModal } from "../../components/FeedbackErrorModal";
import { checkConnection } from "../../lib/network";

type Status = "done" | "missed";

type StudyPlan = {
  id: string;
  date: string;
  section: "math" | "reading" | "writing";
  start_time: string;
  end_time: string;
  tasks_text: string;
  status?: Status;
  isActive?: boolean;
  isPast?: boolean;
  isUpcoming?: boolean;
};

export default function CheckInScreen() {
  const { theme, themeName } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { openPlanId } = useLocalSearchParams<{ openPlanId: string }>();
  
  const [plansByDate, setPlansByDate] = useState<Record<string, StudyPlan[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const getCalendarDays = () => {
    const today = new Date();
    const days = [];
    
    // Show next 14 days starting from today
    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push({ date: getLocalDateString(d), isCurrentMonth: true });
    }
    
    return days;
  };

  const checkPlanTimeStatus = (dateStr: string, startTime: string, endTime: string) => {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const curTime = getLocalTimeString(now);
    
    const isPast = dateStr < todayStr || (dateStr === todayStr && curTime > endTime);
    const isUpcoming = dateStr > todayStr || (dateStr === todayStr && curTime < startTime);
    const isActive = dateStr === todayStr && curTime >= startTime && curTime <= endTime;
    
    return { isPast, isUpcoming, isActive };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: plansData, error: plansError } = await supabase
        .from("study_plan")
        .select("id, date, section, start_time, end_time, tasks_text")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (plansError) throw plansError;
      
      const { data: logsData } = await supabase
          .from("daily_log")
          .select("plan_id, status")
          .eq("user_id", user.id);

      const grouped: Record<string, StudyPlan[]> = {};

      if (plansData) {
        plansData.forEach((p: any) => {
          if (!grouped[p.date]) grouped[p.date] = [];
          const log = logsData?.find(l => l.plan_id === p.id);
          const { isPast, isUpcoming, isActive } = checkPlanTimeStatus(p.date, p.start_time, p.end_time);
          
          grouped[p.date].push({
            ...p,
            status: log?.status,
            isActive,
            isPast,
            isUpcoming
          });
        });

        // Sort by time
        Object.keys(grouped).forEach(d => {
          grouped[d].sort((a, b) => a.start_time.localeCompare(b.start_time));
        });
      }

      setPlansByDate(grouped);
    } catch (e: any) {
      console.error(e);
      const isOnline = await checkConnection();
      setErrorMsg(isOnline ? (e.message || t('failedLoadPlans')) : t('noInternet'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Realtime Subscription & Periodical Ticker
  useEffect(() => {
    const channel = supabase.channel('check-in-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_plan' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_log' }, () => loadData())
      .subscribe();

    // Refresh every minute to keep time-based status accurate
    const interval = setInterval(() => {
        loadData();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (openPlanId && Object.keys(plansByDate).length > 0) {
        // Find if any date has this plan
        for (const date of Object.keys(plansByDate)) {
            const found = plansByDate[date].find(p => p.id === openPlanId);
            if (found) {
                setSelectedDate(date);
                setIsModalVisible(true);
                break;
            }
        }
    }
  }, [openPlanId, plansByDate]);

  const handleCheckIn = async (plan: StudyPlan, status: Status) => {
    if (plan.isUpcoming) {
        Alert.alert(t('locked'), t('onlyCheckInAfterStart'));
        return;
    }
    setSavingId(plan.id);
    
    // Optimistic Update
    setPlansByDate(prev => {
        const datePlans = prev[plan.date] || [];
        const updatedPlans = datePlans.map(p => 
            p.id === plan.id ? { ...p, status: status } : p
        );
        return { ...prev, [plan.date]: updatedPlans };
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
          .from("daily_log")
          .select("id")
          .eq("plan_id", plan.id)
          .maybeSingle();
      
      let error;
      
      if (existing) {
          const { error: err } = await supabase
              .from("daily_log")
              .update({ 
                  status, 
                  checked_at: new Date().toISOString() 
              })
              .eq("id", existing.id);
          error = err;
      } else {
          const { error: err } = await supabase
              .from("daily_log")
              .insert({
                  user_id: user.id,
                  plan_id: plan.id,
                  date: plan.date,
                  status,
                  checked_at: new Date().toISOString(),
              });
          error = err;
      }

      if (error) throw error;
      loadData();
    } catch (e: any) {
      // Revert optimization on error (simple reload)
      loadData();
      const isOnline = await checkConnection();
      setErrorMsg(isOnline ? (e.message || t('failedSaveStatus')) : t('noInternet'));
    } finally {
      setSavingId(null);
    }
  };

  const handleDeletePlan = async (id: string) => {
    const confirmDelete = async () => {
        try {
            await supabase.from("daily_log").delete().eq("plan_id", id);
            const { error } = await supabase.from("study_plan").delete().eq("id", id);
            if (error) throw error;
            showToast(t('missionDeleted'), "success");
            loadData();
        } catch (e: any) {
            showToast(e.message || t('failedDelete'));
        }
    };

    if (Platform.OS === 'web') {
        if (window.confirm(t('sureDelete'))) {
            confirmDelete();
        }
    } else {
        Alert.alert(
            t('deletePlan'),
            t('sureDelete'),
            [
                { text: t('cancel'), style: "cancel" },
                { text: t('delete'), style: "destructive", onPress: confirmDelete }
            ]
        );
    }
  };

  const calendarDays = getCalendarDays();
  const dayLabels = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];

  const openDayDetails = (date: string) => {
    setSelectedDate(date);
    setIsModalVisible(true);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ 
        title: t('checkIn'),
        headerShown: true,
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
                <ChevronLeft color={theme.textPrimary} size={28} />
            </TouchableOpacity>
        )
      }} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        {loading ? (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        ) : (
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(tabs)")} style={{ marginBottom: 12, alignSelf: 'flex-start', padding: 8, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Heading style={styles.title}>{t('checkIn')}</Heading>
                <ThemedText style={{ fontSize: 12, fontWeight: '800', opacity: 0.5 }}>{getMonthYearString(getLocalDateString(), t)}</ThemedText>
            </View>
            <ThemedText style={styles.subtitle}>{t('timelineSub')}</ThemedText>
                </View>

                {/* Calendar Table */}
                <Card style={styles.calendarTable}>
                    <View style={[styles.calHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
                        {dayLabels.map(label => (
                            <View key={label} style={styles.calLabelCell}>
                                <ThemedText style={styles.calLabelText}>{label}</ThemedText>
                            </View>
                        ))}
                    </View>
                    <View style={styles.calGrid}>
                        {calendarDays.map((day, idx) => {
                            const plans = plansByDate[day.date] || [];
                            const hasIncomplete = plans.some(p => !p.status && !p.isPast && !p.isUpcoming);
                            const hasPlans = plans.length > 0;
                            const isToday = day.date === getLocalDateString();
                            
                            return (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[
                                        styles.calCell, 
                                        { borderColor: theme.border },
                                        !day.isCurrentMonth && { opacity: 0.2 },
                                        isToday && { borderColor: theme.primary, borderWidth: 2 }
                                    ]}
                                    onPress={() => openDayDetails(day.date)}
                                >
                                    <ThemedText style={[styles.calDateNum, isToday && { color: theme.primary, fontWeight: '900' }]}>
                                        {day.date.split('-')[2]}
                                    </ThemedText>
                                    <View style={styles.dotContainer}>
                                        {hasPlans && (
                                            <View style={[
                                                styles.planDot, 
                                                { backgroundColor: plans.some(p => p.status === 'done') ? '#10b981' : plans.some(p => p.status === 'missed') ? '#ef4444' : plans.some(p => p.isActive) ? theme.primary : '#f59e0b' }
                                            ]} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Card>

                {/* Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.planDot, { backgroundColor: theme.primary }]} />
                        <ThemedText style={styles.legendText}>{t('incomplete')}</ThemedText>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.planDot, { backgroundColor: "#10b981" }]} />
                        <ThemedText style={styles.legendText}>{t('finished')}</ThemedText>
                    </View>
                </View>

                <Button 
                    title={t('scheduleNewMission')} 
                    onPress={() => router.push("/(tabs)/plan")}
                    style={{ marginTop: 20 }}
                />

                <View style={styles.infoSection}>
                    <Heading style={styles.infoTitle}>{t('howItWorks')}</Heading>
                    <ThemedText style={styles.infoText}>
                        {t('checkInInfo1')}
                    </ThemedText>
                    <ThemedText style={[styles.infoText, { marginTop: 8 }]}>
                        {t('checkInInfo2')}
                    </ThemedText>
                </View>
            </ScrollView>
        )}

        <Modal
            visible={isModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <Card style={[styles.modalCard, { backgroundColor: theme.card }]}>
                    <View style={styles.modalHeader}>
                        <Heading style={styles.modalTitle}>
                            {selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString('default', { month: 'long', day: 'numeric' }) : ""}
                        </Heading>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                            <X color={theme.textPrimary} size={24} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScroll}>
                        {!selectedDate || !plansByDate[selectedDate] || plansByDate[selectedDate].length === 0 ? (
                            <View style={styles.emptyModal}>
                                <ThemedText style={styles.emptyText}>{t('noCheckIns')}</ThemedText>
                                <TouchableOpacity 
                                    style={[styles.addBtn, { borderColor: theme.primary }]}
                                    onPress={() => {
                                        setIsModalVisible(false);
                                        router.push("/(tabs)/plan");
                                    }}
                                >
                                    <ThemedText style={{ color: theme.primary, fontWeight: '800' }}>{t('scheduleNow')}</ThemedText>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            plansByDate[selectedDate].map((plan) => (
                                <View key={plan.id} style={[
                                    styles.planItem, 
                                    { borderColor: theme.border },
                                    plan.status === 'done' && { backgroundColor: themeName === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4', borderColor: '#10b981' }
                                ]}>
                                    <View style={styles.planHeader}>
                                        <View style={[styles.badge, { backgroundColor: plan.section === 'math' ? '#3b82f6' : plan.section === 'reading' ? '#f59e0b' : '#10b981' }]}>
                                            <ThemedText style={styles.badgeText}>{t(plan.section)}</ThemedText>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <TouchableOpacity onPress={() => {
                                                setIsModalVisible(false);
                                                router.push(`/(tabs)/plan?editId=${plan.id}`);
                                            }}>
                                                <Edit2 size={16} color={theme.primary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeletePlan(plan.id)}>
                                                <Trash2 size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                            <ThemedText style={styles.planTime}>{plan.start_time} - {plan.end_time}</ThemedText>
                                        </View>
                                    </View>
                                    <ThemedText style={styles.planTasks}>{plan.tasks_text}</ThemedText>
                                    
                                    <View style={styles.modalActions}>
                                        {!plan.isUpcoming && plan.status !== 'done' && (
                                            <TouchableOpacity 
                                                style={[styles.studyRoomBtn, { borderColor: theme.primary }]}
                                                onPress={() => {
                                                    setIsModalVisible(false);
                                                    router.push(`/(tabs)/study-room?planId=${plan.id}`);
                                                }}
                                            >
                                                <Play size={12} color={theme.primary} fill={theme.primary} />
                                                <ThemedText style={{ color: theme.primary, fontWeight: '800', fontSize: 11 }}>{t('enterStudyRoom')}</ThemedText>
                                            </TouchableOpacity>
                                        )}

                                        <View style={styles.checkGroup}>
                                            <TouchableOpacity 
                                                style={[styles.miniCheck, { borderColor: theme.border }, plan.status === 'done' && { backgroundColor: '#10b981', borderColor: '#10b981' }, (plan.isUpcoming && !plan.status) && { opacity: 0.2 }]}
                                                onPress={() => handleCheckIn(plan, "done")}
                                                disabled={plan.isUpcoming && !plan.status}
                                            >
                                                <Check color={plan.status === 'done' ? '#fff' : '#10b981'} size={18} />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.miniCheck, { borderColor: theme.border }, plan.status === 'missed' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }, (plan.isUpcoming && !plan.status) && { opacity: 0.2 }]}
                                                onPress={() => handleCheckIn(plan, "missed")}
                                                disabled={plan.isUpcoming && !plan.status}
                                            >
                                                <X color={plan.status === 'missed' ? '#fff' : '#ef4444'} size={18} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </Card>
            </View>
        </Modal>
        
        <Toast 
            visible={toastVisible} 
            onDismiss={() => setToastVisible(false)}
            type={toastType}
        >
            {toastMessage}
        </Toast>
        <FeedbackErrorModal 
            visible={!!errorMsg}
            error={errorMsg}
            onDismiss={() => setErrorMsg(null)}
            onRetry={loadData}
        />
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
    padding: 24,
    gap: 24,
  },
  header: {
      marginBottom: 10,
  },
  title: {
      fontSize: 28,
  },
  subtitle: {
      opacity: 0.5,
      fontWeight: "600",
      marginTop: 4,
  },
  calendarTable: {
      padding: 0,
      overflow: 'hidden',
  },
  calHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.05)',
      backgroundColor: 'rgba(0,0,0,0.02)',
  },
  calLabelCell: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
  },
  calLabelText: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.3,
      textTransform: 'uppercase',
  },
  calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
  },
  calCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 0.5,
      borderColor: 'rgba(0,0,0,0.03)',
  },
  calDateNum: {
      fontSize: 14,
      fontWeight: '600',
  },
  dotContainer: {
      height: 8,
      marginTop: 4,
  },
  planDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
  },
  legend: {
      flexDirection: 'row',
      gap: 20,
      justifyContent: 'center',
  },
  legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  legendText: {
      fontSize: 11,
      fontWeight: '700',
      opacity: 0.4,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  modalCard: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '85%',
      padding: 24,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
  },
  modalTitle: {
      fontSize: 20,
  },
  modalScroll: {
      maxHeight: 500,
  },
  emptyModal: {
      alignItems: 'center',
      paddingVertical: 60,
  },
  emptyText: {
      opacity: 0.3,
      fontWeight: '700',
  },
  addBtn: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1.5,
  },
  planItem: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1.5,
      marginBottom: 16,
  },
  planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  badge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
  },
  badgeText: {
      fontSize: 8,
      fontWeight: '900',
      color: '#fff',
  },
  planTime: {
      fontSize: 11,
      fontWeight: '700',
      opacity: 0.4,
  },
  planTasks: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 20,
      lineHeight: 22,
  },
  modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  studyRoomBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
  },
  lockStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  checkGroup: {
      flexDirection: 'row',
      gap: 10,
  },
  miniCheck: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  infoSection: {
      marginTop: 20,
      padding: 24,
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  infoTitle: {
      fontSize: 14,
      color: '#B45309', // amber-900 equivalent
      marginBottom: 10,
  },
  infoText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#B45309', // amber-700
      lineHeight: 18,
      opacity: 0.8,
  }
});
