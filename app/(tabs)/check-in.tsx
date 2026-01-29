import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getMonthYearString } from "../../lib/dateUtils";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Check,
  X,
  Calendar as CalendarIcon,
  Play,
  Edit2,
  Trash2,
} from "lucide-react-native";
import { PremiumGate } from "../../components/PremiumGate";

export default function CheckInScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [plansByDate, setPlansByDate] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [repeatingPlanId, setRepeatingPlanId] = useState<string | null>(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [isRepeating, setIsRepeating] = useState(false);

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Optimize: Avoid unmounting/remounting spinner on every focus
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const loadData = async () => {
    // Only show spinner on first load
    if (isInitialLoad) setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = getLocalDateString(new Date());
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const endDateStr = getLocalDateString(endDate);

      // Only fetch plans for relevant window
      const { data: plans } = await supabase
        .from("study_plan")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDateStr);

      // Only fetch logs for relevant window (if needed) or matching plans
      // Optimally, fetch logs for the plan IDs we found, but date range is simpler for batch
      const { data: logs } = await supabase
        .from("daily_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDateStr);

      const grouped: Record<string, any[]> = {};
      plans?.forEach((p) => {
        const log = logs?.find((l) => l.plan_id === p.id);
        if (!grouped[p.date]) grouped[p.date] = [];
        grouped[p.date].push({ ...p, status: log?.status });
      });
      setPlansByDate(grouped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const calendarDays = useMemo(() => {
    const days = [];
    const now = new Date();
    // Start from today and show 24 days (4 rows of 6)
    for (let i = 0; i < 24; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      days.push(getLocalDateString(d));
    }
    return days;
  }, []);

  const handleUpdateStatus = async (
    planId: string,
    date: string,
    status: "done" | "missed",
  ) => {
    if (date !== getLocalDateString()) {
      Alert.alert("Info", "You can only check-in for today's sessions.");
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from("daily_log")
        .select("id")
        .eq("plan_id", planId)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("daily_log")
          .update({ status })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("daily_log")
          .insert({ user_id: user?.id, plan_id: planId, date, status });
      }
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRepeatPlan = async (p: any) => {
    if (selectedWeekdays.length === 0) {
      Alert.alert("Error", "Please select at least one weekday.");
      return;
    }
    setIsRepeating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const newPlans = [];
      const startDate = new Date();
      for (let i = 1; i <= 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        if (selectedWeekdays.includes(d.getDay())) {
          newPlans.push({
            user_id: user.id,
            section: p.section,
            start_time: p.start_time,
            end_time: p.end_time,
            tasks_text: p.tasks_text,
            date: getLocalDateString(d),
          });
        }
      }

      if (newPlans.length > 0) {
        const { error } = await supabase.from("study_plan").insert(newPlans);
        if (error) throw error;
        Alert.alert("Success", `Plan repeated for ${newPlans.length} days.`);
      }
      setRepeatingPlanId(null);
      setSelectedWeekdays([]);
      loadData();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to repeat plan.");
    } finally {
      setIsRepeating(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <PremiumGate feature="Check-in">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(tabs)")}>
              <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Heading style={{ fontSize: 20 }}>Check-in</Heading>
            <View style={{ width: 24 }} />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.container}>
              <View style={styles.calHeaderRow}>
                <ThemedText style={styles.calTitle}>
                  SUCCESS TIMELINE
                </ThemedText>
                <ThemedText style={styles.monthLabel}>
                  {getMonthYearString(getLocalDateString(), t)}
                </ThemedText>
              </View>

              <View style={styles.calGrid}>
                {calendarDays.map((d: string) => {
                  const dayPlans = plansByDate[d] || [];
                  const isToday = d === getLocalDateString();
                  const dObj = new Date(d + "T00:00:00");
                  const hasDone = dayPlans.some((p) => p.status === "done");
                  const hasMissed = dayPlans.some((p) => p.status === "missed");
                  const hasPending = dayPlans.some((p) => !p.status);

                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.calCell,
                        { borderColor: theme.border },
                        isToday && {
                          borderColor: theme.primary,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => {
                        setSelectedDate(d);
                        setIsModalVisible(true);
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.dateNum,
                          isToday && { color: theme.primary },
                        ]}
                      >
                        {dObj.getDate()}
                      </ThemedText>
                      <View style={styles.dots}>
                        {hasDone && (
                          <View
                            style={[styles.dot, { backgroundColor: "#10b981" }]}
                          />
                        )}
                        {hasMissed && (
                          <View
                            style={[styles.dot, { backgroundColor: "#ef4444" }]}
                          />
                        )}
                        {hasPending && (
                          <View
                            style={[
                              styles.dot,
                              { backgroundColor: theme.primary },
                            ]}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
                  <ThemedText style={styles.legendText}>DONE</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.dot, { backgroundColor: theme.primary }]}
                  />
                  <ThemedText style={styles.legendText}>PLANNED</ThemedText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                  <ThemedText style={styles.legendText}>MISSED</ThemedText>
                </View>
              </View>

              <Button
                title="Plan New Session"
                style={{ marginTop: 32 }}
                onPress={() => router.push("/(tabs)/plan")}
              />
            </ScrollView>
          )}

          <Modal visible={isModalVisible} transparent animationType="fade">
            <View style={styles.modalBackdrop}>
              <View
                style={[styles.modalContent, { backgroundColor: theme.card }]}
              >
                <View style={styles.modalHeader}>
                  <Heading style={{ fontSize: 18 }}>{selectedDate}</Heading>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <X size={20} color={theme.textPrimary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll}>
                  {selectedDate && plansByDate[selectedDate]?.length > 0 ? (
                    plansByDate[selectedDate].map((p) => (
                      <View
                        key={p.id}
                        style={[
                          styles.modalPlanItem,
                          { borderColor: theme.border },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.planTime}>
                            {p.start_time} - {p.end_time}
                          </ThemedText>
                          <ThemedText style={styles.planTasks}>
                            {p.tasks_text}
                          </ThemedText>
                        </View>
                        <View style={styles.planActions}>
                          {/* Status Buttons - Circles */}
                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateStatus(p.id, p.date, "done")
                            }
                            style={[
                              styles.actionBtn,
                              {
                                opacity:
                                  p.date === getLocalDateString() ? 1 : 0.3,
                              },
                              p.status === "done" && {
                                backgroundColor: "#10b981",
                              },
                            ]}
                          >
                            <Check
                              size={16}
                              color={p.status === "done" ? "#fff" : "#10b981"}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateStatus(p.id, p.date, "missed")
                            }
                            style={[
                              styles.actionBtn,
                              {
                                opacity:
                                  p.date === getLocalDateString() ? 1 : 0.3,
                              },
                              p.status === "missed" && {
                                backgroundColor: "#ef4444",
                              },
                            ]}
                          >
                            <X
                              size={16}
                              color={p.status === "missed" ? "#fff" : "#ef4444"}
                            />
                          </TouchableOpacity>

                          {/* Edit / Delete / Repeat - Rectangles/Different Style */}
                          <TouchableOpacity
                            onPress={() => {
                              setIsModalVisible(false);
                              router.push({
                                pathname: "/(tabs)/plan",
                                params: { editId: p.id },
                              });
                            }}
                            style={[
                              styles.squareBtn,
                              { backgroundColor: theme.primary + "20" },
                            ]}
                          >
                            <Edit2 size={16} color={theme.primary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert("Delete Plan", "Are you sure?", [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: async () => {
                                    // First delete from daily_log to satisfy constraints
                                    await supabase
                                      .from("daily_log")
                                      .delete()
                                      .eq("plan_id", p.id);

                                    const { error } = await supabase
                                      .from("study_plan")
                                      .delete()
                                      .eq("id", p.id);
                                    if (error)
                                      Alert.alert("Error", error.message);
                                    else loadData();
                                  },
                                },
                              ]);
                            }}
                            style={[
                              styles.squareBtn,
                              { backgroundColor: "#ef444420" },
                            ]}
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              setRepeatingPlanId(
                                repeatingPlanId === p.id ? null : p.id,
                              )
                            }
                            style={[
                              styles.squareBtn,
                              { backgroundColor: theme.primary + "20" },
                            ]}
                          >
                            <CalendarIcon size={16} color={theme.primary} />
                          </TouchableOpacity>
                        </View>
                        {repeatingPlanId === p.id && (
                          <View style={styles.repeatContainer}>
                            <ThemedText style={styles.repeatTitle}>
                              REPEAT FOR NEXT 7 DAYS
                            </ThemedText>
                            <View style={styles.weekdayRow}>
                              {WEEKDAYS.map((day, idx) => (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={() => {
                                    if (selectedWeekdays.includes(idx)) {
                                      setSelectedWeekdays(
                                        selectedWeekdays.filter(
                                          (d) => d !== idx,
                                        ),
                                      );
                                    } else {
                                      setSelectedWeekdays([
                                        ...selectedWeekdays,
                                        idx,
                                      ]);
                                    }
                                  }}
                                  style={[
                                    styles.dayCircle,
                                    { borderColor: theme.border },
                                    selectedWeekdays.includes(idx) && {
                                      backgroundColor: theme.primary,
                                      borderColor: theme.primary,
                                    },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.dayText,
                                      selectedWeekdays.includes(idx) && {
                                        color: "#fff",
                                      },
                                    ]}
                                  >
                                    {day}
                                  </ThemedText>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <Button
                              title={
                                isRepeating ? "Processing..." : "Confirm Repeat"
                              }
                              onPress={() => handleRepeatPlan(p)}
                              loading={isRepeating}
                              style={{ marginTop: 12, height: 40 }}
                            />
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.emptyText}>
                      No sessions planned for this day.
                    </ThemedText>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </PremiumGate>
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
  container: { padding: 24, paddingBottom: 60 },
  calHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calTitle: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.4,
    letterSpacing: 1.5,
  },
  monthLabel: { fontSize: 12, fontWeight: "800", opacity: 0.6 },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  calCell: {
    width: "15%", // Adjust for 6 per row
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  dateNum: { fontSize: 13, fontWeight: "900" },
  dots: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 32,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 10, fontWeight: "900", opacity: 0.4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: { borderRadius: 24, padding: 24, maxHeight: "80%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalScroll: { gap: 12 },
  modalPlanItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  planTime: { fontSize: 11, fontWeight: "800", opacity: 0.4 },
  planTasks: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  planActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.4,
    paddingVertical: 40,
    fontWeight: "600",
  },
  repeatContainer: {
    width: "100%",
    padding: 12,
    marginTop: -8,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  repeatTitle: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.5,
    marginBottom: 10,
    textAlign: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: { fontSize: 9, fontWeight: "900" },
  squareBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
