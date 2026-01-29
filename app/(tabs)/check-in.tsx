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
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  // Optimize: Avoid unmounting/remounting spinner on every focus
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarStart = useMemo(() => {
    const start = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    // Adjust to start on Sunday (0)
    start.setDate(1 - start.getDay());
    return start;
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(calendarStart);
    // 6 weeks * 7 days = 42 cells to ensure full month coverage
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(getLocalDateString(d));
    }
    return days;
  }, [calendarStart]);

  const loadData = async () => {
    if (isInitialLoad) setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = calendarDays[0];
      const endDate = calendarDays[calendarDays.length - 1];

      const { data: plans } = await supabase
        .from("study_plan")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

      const { data: logs } = await supabase
        .from("daily_log")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate);

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
    }, [currentMonth, calendarDays]), // Reload when month changes
  );

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // ... (keep handleUpdateStatus, handleRepeatPlan from original if needed) ...
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
          {/* Top Bar with Edit Plan */}
          <View style={styles.header}>
            {/* Use basic navigation or title if needed, or keeping it clean as per layout */}
            {/* Originally it had a back button, keeping it for mobile logic */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.push("/(tabs)")}
            >
              <ChevronLeft size={20} color={theme.textPrimary} />
            </TouchableOpacity>

            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={prevMonth} style={styles.arrowBtn}>
                <ChevronLeft size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <ThemedText style={styles.monthTitle}>
                {currentMonth.toLocaleString("default", { month: "long" })}
              </ThemedText>
              <TouchableOpacity onPress={nextMonth} style={styles.arrowBtn}>
                <ChevronLeft
                  size={20}
                  color={theme.textPrimary}
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.editPlanBtn}
              onPress={() => router.push("/(tabs)/plan")}
            >
              <Edit2 size={16} color={theme.textPrimary} />
              <ThemedText style={styles.editPlanText}>Edit plan</ThemedText>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.calendarContainer}>
              {/* Weekday Headers */}
              <View style={styles.gridHeader}>
                {WEEKDAYS.map((day) => (
                  <ThemedText key={day} style={styles.weekdayLabel}>
                    {day.toUpperCase()}
                  </ThemedText>
                ))}
              </View>

              {/* Days Grid */}
              <ScrollView contentContainerStyle={styles.gridContent}>
                <View style={styles.grid}>
                  {calendarDays.map((d, index) => {
                    const dateObj = new Date(d);
                    const isSameMonth =
                      dateObj.getMonth() === currentMonth.getMonth();
                    const isToday = d === getLocalDateString();
                    const dayPlans = plansByDate[d] || [];

                    return (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayCell,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.card,
                          },
                          !isSameMonth && { opacity: 0.5 },
                        ]}
                        onPress={() => {
                          setSelectedDate(d);
                          setIsModalVisible(true);
                        }}
                      >
                        <View style={styles.dayNumRow}>
                          <ThemedText
                            style={[
                              styles.dayNum,
                              isToday && {
                                color: theme.primary,
                                fontWeight: "900",
                              },
                            ]}
                          >
                            {dateObj.getDate()}
                          </ThemedText>
                        </View>

                        <View style={styles.planList}>
                          {dayPlans.slice(0, 3).map((p, i) => (
                            <View
                              key={i}
                              style={[
                                styles.miniPlan,
                                {
                                  backgroundColor: theme.primary + "15",
                                  borderLeftColor: theme.primary,
                                },
                              ]}
                            >
                              <ThemedText
                                style={[
                                  styles.miniPlanText,
                                  { color: theme.primary },
                                ]}
                                numberOfLines={1}
                              >
                                {p.section}
                              </ThemedText>
                            </View>
                          ))}
                          {dayPlans.length > 3 && (
                            <ThemedText style={styles.moreText}>
                              + {dayPlans.length - 3} more
                            </ThemedText>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Keep Modal Logic Identical */}
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
                          {
                            borderColor: theme.border,
                            flexDirection: "column",
                            gap: 12,
                          },
                        ]}
                      >
                        <View style={{ width: "100%" }}>
                          <ThemedText style={styles.planTime}>
                            {p.start_time} - {p.end_time}
                          </ThemedText>
                          <ThemedText style={styles.planTasks}>
                            {p.tasks_text}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.planActions,
                            {
                              width: "100%",
                              justifyContent: "space-between",
                            },
                          ]}
                        >
                          <View style={{ flexDirection: "row", gap: 8 }}>
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
                                color={
                                  p.status === "missed" ? "#fff" : "#ef4444"
                                }
                              />
                            </TouchableOpacity>
                          </View>

                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              disabled={
                                !!p.status || p.date !== getLocalDateString()
                              }
                              onPress={() => {
                                setIsModalVisible(false);
                                router.push({
                                  pathname: "/(tabs)/plan",
                                  params: { editId: p.id },
                                });
                              }}
                              style={[
                                styles.squareBtn,
                                {
                                  backgroundColor: theme.primary + "20",
                                  opacity:
                                    !!p.status ||
                                    p.date !== getLocalDateString()
                                      ? 0.3
                                      : 1,
                                },
                              ]}
                            >
                              <Edit2 size={16} color={theme.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              disabled={p.status === "done"}
                              onPress={() => {
                                const performDelete = async () => {
                                  try {
                                    const { error: logError } = await supabase
                                      .from("daily_log")
                                      .delete()
                                      .eq("plan_id", p.id);

                                    if (logError) {
                                      console.error(
                                        "Log delete error:",
                                        logError,
                                      );
                                      if (Platform.OS === "web") {
                                        window.alert(
                                          "Error deleting logs: " +
                                            logError.message,
                                        );
                                      } else {
                                        Alert.alert(
                                          "Error deleting logs",
                                          logError.message,
                                        );
                                      }
                                      return;
                                    }

                                    const { error: planError } = await supabase
                                      .from("study_plan")
                                      .delete()
                                      .eq("id", p.id);

                                    if (planError) {
                                      console.error(
                                        "Plan delete error:",
                                        planError,
                                      );
                                      if (Platform.OS === "web") {
                                        window.alert(
                                          "Error deleting plan: " +
                                            planError.message,
                                        );
                                      } else {
                                        Alert.alert(
                                          "Error deleting plan",
                                          planError.message,
                                        );
                                      }
                                    } else {
                                      if (Platform.OS !== "web") {
                                        Alert.alert("Success", "Plan deleted.");
                                      }
                                      loadData();
                                    }
                                  } catch (err: any) {
                                    console.error("Delete exception:", err);
                                    if (Platform.OS === "web") {
                                      window.alert(
                                        "Error: " +
                                          (err.message || "Unknown error"),
                                      );
                                    } else {
                                      Alert.alert(
                                        "Error",
                                        err.message || "Unknown error",
                                      );
                                    }
                                  }
                                };

                                if (Platform.OS === "web") {
                                  if (
                                    window.confirm(
                                      "Are you sure you want to delete this plan? This action cannot be undone.",
                                    )
                                  ) {
                                    performDelete();
                                  }
                                } else {
                                  Alert.alert(
                                    "Delete Plan",
                                    "Are you sure you want to delete this plan?",
                                    [
                                      { text: "Cancel", style: "cancel" },
                                      {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: performDelete,
                                      },
                                    ],
                                  );
                                }
                              }}
                              style={[
                                styles.squareBtn,
                                {
                                  backgroundColor: "#ef444420",
                                  opacity: p.status === "done" ? 0.3 : 1,
                                },
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  navBtn: { padding: 4 },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  arrowBtn: { padding: 4 },
  monthTitle: { fontSize: 15, fontWeight: "700" },
  editPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  editPlanText: { fontSize: 13, fontWeight: "600" },

  calendarContainer: { flex: 1 },
  gridHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.5,
  },

  gridContent: { flexGrow: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%", // 100/7
    aspectRatio: 0.8, // Taller cells for plans
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    padding: 4,
    justifyContent: "flex-start",
  },
  dayNumRow: { flexDirection: "row", marginBottom: 4 },
  dayNum: { fontSize: 13, fontWeight: "600", marginLeft: 4, marginTop: 4 },
  planList: { gap: 4 },
  miniPlan: {
    borderRadius: 4,
    borderLeftWidth: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 2,
  },
  miniPlanText: { fontSize: 9, fontWeight: "700" },
  moreText: { fontSize: 9, opacity: 0.5, marginLeft: 4, fontStyle: "italic" },

  // ... (keep modal styles) ...
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
    marginTop: 8,
    marginBottom: 0,
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
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
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
