import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
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
import {
  getLocalDateString,
  getMonthYearString,
  getLocalTimeString,
} from "../../lib/dateUtils";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
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

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateString(today), [today]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const isCurrentMonthView = useMemo(() => {
    return (
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  }, [currentMonth, today]);

  const scrollRef = useRef<ScrollView>(null);

  const calendarStart = useMemo(() => {
    // Always start from the standard beginning of the month's grid (the Sunday on or before the 1st)
    const start = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    start.setDate(1 - start.getDay());
    return start;
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const days: (string | null)[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startPadding = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(getLocalDateString(new Date(year, month, i)));
    }
    return days;
  }, [currentMonth]);

  const scrollToToday = useCallback(() => {
    if (!isCurrentMonthView) return;

    const index = calendarDays.indexOf(todayStr);
    if (index !== -1) {
      const row = Math.floor(index / 7);
      // Approximate height calculation:
      // cellWidth = width / 7
      // cellHeight = cellWidth / aspectRatio
      // We use a simplified calculation or a fixed offset if needed.
      // Since width is dynamic, we can estimate.
      const cellWidth = width / 7;
      const cellHeight = cellWidth / 1.15; // Updated aspectRatio
      const scrollY = Math.max(0, (row - 1) * cellHeight); // Scroll to show row above too for context

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 100);
    }
  }, [calendarDays, isCurrentMonthView, todayStr, width]);

  useEffect(() => {
    if (isCurrentMonthView) {
      scrollToToday();
    }
  }, [currentMonth, isCurrentMonthView]);

  const canGoPrev = !isCurrentMonthView;
  const canGoNext = isCurrentMonthView;

  const loadData = async () => {
    if (isInitialLoad) setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const validDays = calendarDays.filter((d) => d !== null);
      const startDate = validDays[0];
      const endDate = validDays[validDays.length - 1];

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
    if (!canGoPrev) return;
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    if (!canGoNext) return;
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  // ... (keep handleUpdateStatus, handleRepeatPlan from original if needed) ...
  const handleUpdateStatus = async (
    planId: string,
    date: string,
    status: "done" | "missed",
    p?: any,
  ) => {
    const today = getLocalDateString();
    if (date !== today) {
      Alert.alert("Info", "You can only check-in for today's sessions.");
      return;
    }

    if (p && p.start_time > getLocalTimeString(new Date(Date.now() + 60000))) {
      Alert.alert("Info", "This session has not started yet.");
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
          {/* Top Bar with navigation and Edit Plan */}
          <View style={styles.header}>
            <View style={styles.monthSelector}>
              <TouchableOpacity
                onPress={prevMonth}
                disabled={!canGoPrev}
                style={[styles.arrowBtn, !canGoPrev && { opacity: 0.2 }]}
              >
                <ChevronLeft size={20} color={theme.textPrimary} />
              </TouchableOpacity>
              <ThemedText style={styles.monthTitle}>
                {currentMonth.toLocaleString("default", { month: "long" })}
              </ThemedText>
              <TouchableOpacity
                onPress={nextMonth}
                disabled={!canGoNext}
                style={[styles.arrowBtn, !canGoNext && { opacity: 0.2 }]}
              >
                <ChevronRight size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {isCurrentMonthView && (
                <TouchableOpacity
                  style={styles.todayBtn}
                  onPress={scrollToToday}
                >
                  <ThemedText style={styles.todayBtnText}>Today</ThemedText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.editPlanBtn}
                onPress={() => router.push("/(tabs)/plan")}
              >
                <Edit2 size={16} color={theme.textPrimary} />
                <ThemedText style={styles.editPlanText}>Edit plan</ThemedText>
              </TouchableOpacity>
            </View>
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
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.grid}>
                  {calendarDays.map((d, index) => {
                    if (!d) {
                      return (
                        <View
                          key={`pad-${index}`}
                          style={[
                            styles.dayCell,
                            {
                              borderColor: theme.border,
                              backgroundColor: "rgba(0,0,0,0.01)",
                            },
                          ]}
                        />
                      );
                    }
                    const dateObj = new Date(d);
                    const isToday = d === todayStr;
                    const isPast = d < todayStr;
                    const dayPlans = plansByDate[d] || [];

                    const getPlanChipStyles = (section: string) => {
                      const s = section?.toLowerCase() || "";
                      if (s.includes("mock") || s.includes("test"))
                        return { bg: "#bbf7d0", color: "#065f46" };
                      if (s.includes("qbank") || s.includes("practice"))
                        return { bg: "#bfdbfe", color: "#1e40af" };
                      if (s.includes("vocab"))
                        return { bg: "#ffedd5", color: "#9a3412" };
                      if (s.includes("drill"))
                        return { bg: "#e0e7ff", color: "#3730a3" };
                      return { bg: theme.primary + "25", color: theme.primary };
                    };

                    return (
                      <TouchableOpacity
                        key={d}
                        disabled={isPast}
                        style={[
                          styles.dayCell,
                          {
                            borderColor: theme.border,
                            backgroundColor: theme.card,
                          },
                          isPast && styles.disabledCell,
                          isToday && {
                            backgroundColor: theme.primary + "15",
                            borderWidth: 2,
                            borderColor: theme.primary,
                            zIndex: 1,
                          },
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
                                fontSize: 14,
                              },
                              isPast && {
                                color: theme.textSecondary,
                                opacity: 0.2,
                              },
                            ]}
                          >
                            {dateObj.getDate()}
                          </ThemedText>
                        </View>

                        <View style={styles.planList}>
                          {dayPlans.slice(0, 3).map((p, i) => {
                            const chipStyles = getPlanChipStyles(p.section);
                            return (
                              <View
                                key={i}
                                style={[
                                  styles.miniPlan,
                                  {
                                    backgroundColor: isPast
                                      ? "rgba(0,0,0,0.03)"
                                      : chipStyles.bg,
                                    borderLeftColor: isPast
                                      ? "rgba(0,0,0,0.15)"
                                      : chipStyles.color,
                                    borderWidth: isPast ? 0 : 0.5,
                                    borderColor: chipStyles.color + "40",
                                  },
                                  isPast && { elevation: 0, shadowOpacity: 0 },
                                ]}
                              >
                                <ThemedText
                                  style={[
                                    styles.miniPlanText,
                                    {
                                      color: isPast
                                        ? "rgba(0,0,0,0.25)"
                                        : chipStyles.color,
                                      fontWeight: "900",
                                    },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {p.section}
                                </ThemedText>
                              </View>
                            );
                          })}
                          {dayPlans.length > 3 && (
                            <ThemedText
                              style={[
                                styles.moreText,
                                isPast && { opacity: 0.15 },
                              ]}
                            >
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
                            {(() => {
                              const isToday = p.date === getLocalDateString();
                              const isNotStarted =
                                isToday &&
                                p.start_time >
                                  getLocalTimeString(
                                    new Date(Date.now() + 60000),
                                  );
                              const canCheckIn = isToday && !isNotStarted;

                              return (
                                <>
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleUpdateStatus(
                                        p.id,
                                        p.date,
                                        "done",
                                        p,
                                      )
                                    }
                                    disabled={!canCheckIn}
                                    style={[
                                      styles.actionBtn,
                                      {
                                        opacity: canCheckIn ? 1 : 0.3,
                                      },
                                      p.status === "done" && {
                                        backgroundColor: "#10b981",
                                      },
                                    ]}
                                  >
                                    <Check
                                      size={16}
                                      color={
                                        p.status === "done" ? "#fff" : "#10b981"
                                      }
                                    />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() =>
                                      handleUpdateStatus(
                                        p.id,
                                        p.date,
                                        "missed",
                                        p,
                                      )
                                    }
                                    disabled={!canCheckIn}
                                    style={[
                                      styles.actionBtn,
                                      {
                                        opacity: canCheckIn ? 1 : 0.3,
                                      },
                                      p.status === "missed" && {
                                        backgroundColor: "#ef4444",
                                      },
                                    ]}
                                  >
                                    <X
                                      size={16}
                                      color={
                                        p.status === "missed"
                                          ? "#fff"
                                          : "#ef4444"
                                      }
                                    />
                                  </TouchableOpacity>
                                </>
                              );
                            })()}
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
  calendarContainer: { flex: 1 },
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
  monthTitle: { fontSize: 15, fontWeight: "800" },
  todayBtn: {
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
  },
  todayBtnText: { fontSize: 13, fontWeight: "700" },
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

  gridHeader: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.02)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 14,
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(0,0,0,0.5)",
    letterSpacing: 0.5,
  },

  gridContent: { flexGrow: 1 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  dayCell: {
    width: "14.28%", // 100/7
    aspectRatio: 1.15, // Shorter cells to fit more on screen
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    padding: 6,
    justifyContent: "flex-start",
  },
  disabledCell: {
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  dayNumRow: { flexDirection: "row", marginBottom: 6 },
  dayNum: { fontSize: 13, fontWeight: "700", marginLeft: 4, marginTop: 4 },
  planList: { gap: 4 },
  miniPlan: {
    borderRadius: 6,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginHorizontal: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  miniPlanText: { fontSize: 9, fontWeight: "800" },
  moreText: {
    fontSize: 8,
    opacity: 0.4,
    marginLeft: 4,
    fontStyle: "italic",
    fontWeight: "700",
  },

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
