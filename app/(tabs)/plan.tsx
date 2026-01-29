import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../lib/supabase";
import {
  getLocalDateString,
  getLocalTimeString,
  getMonthYearString,
} from "../../lib/dateUtils";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  ChevronLeft,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react-native";
import { Toast } from "../../components/Toast";
import { PremiumGate } from "../../components/PremiumGate";

type Section = "Math" | "Reading and Writing";

export default function PlanScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId: string }>();

  const now = new Date();
  const [date, setDate] = useState(getLocalDateString(now));
  const [section, setSection] = useState<Section>("Math");
  const [startTime, setStartTime] = useState(getLocalTimeString(now));
  const [endTime, setEndTime] = useState(
    getLocalTimeString(new Date(now.getTime() + 60 * 60 * 1000)),
  );
  const [tasks, setTasks] = useState("");
  const [automate, setAutomate] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">(
    "error",
  );

  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "error",
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  useEffect(() => {
    if (editId) {
      (async () => {
        setLoading(true);
        const { data } = await supabase
          .from("study_plan")
          .select("*")
          .eq("id", editId)
          .single();
        if (data) {
          setDate(data.date);
          let s = data.section;
          if (s === "reading" || s === "writing") s = "Reading and Writing";
          if (s === "math") s = "Math";
          setSection(s as Section);
          setStartTime(data.start_time);
          setEndTime(data.end_time);
          setTasks(data.tasks_text);
        }
        setLoading(false);
      })();
    }
  }, [editId]);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 30; i++) {
      // Increased range
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(getLocalDateString(d));
    }
    return days;
  }, []);

  const handleSave = async () => {
    if (!tasks) return showToast(t("pleaseEnterTasks"));
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast("User not authenticated", "error");
        return;
      }

      // Map UI section to DB enum/value
      // Assuming DB expects lowercase "math", "reading", or "writing"
      // We map "Reading and Writing" -> "reading" as a safe fallback that works with the read logic
      const dbSection = section === "Math" ? "math" : "reading";

      const basePlan = {
        user_id: user.id,
        date,
        section: dbSection,
        start_time: startTime,
        end_time: endTime,
        tasks_text: tasks,
      };

      if (automate && selectedWeekdays.length > 0) {
        const plans = [basePlan];
        // Generate plans for next 7 days for selected weekdays
        for (let i = 1; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          if (selectedWeekdays.includes(d.getDay())) {
            plans.push({
              ...basePlan,
              date: getLocalDateString(d),
            });
          }
        }
        const { error } = await supabase.from("study_plan").insert(plans);
        if (error) throw error;
      } else {
        const { error } = editId
          ? await supabase.from("study_plan").update(basePlan).eq("id", editId)
          : await supabase.from("study_plan").insert([basePlan]);
        if (error) throw error;
      }

      showToast(t("missionCommitted"), "success");
      setTimeout(() => router.push("/(tabs)"), 1500);
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Toast
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        type={toastType}
      >
        {toastMessage}
      </Toast>
      <SafeAreaView style={{ flex: 1 }}>
        <PremiumGate feature="Plan">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(tabs)")}>
              <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Heading style={{ fontSize: 20 }}>
              {editId ? "Edit Plan" : "Create Plan"}
            </Heading>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sectionHeader}>
              <CalendarIcon size={16} color={theme.primary} />
              <ThemedText style={styles.sectionLabel}>SELECT DATE</ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateList}
            >
              {calendarDays.map((d) => {
                const isSelected = date === d;
                const dObj = new Date(d + "T00:00:00");
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dateCard,
                      { borderColor: theme.border },
                      isSelected && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setDate(d)}
                  >
                    <ThemedText
                      style={[styles.dateDay, isSelected && { color: "#fff" }]}
                    >
                      {dObj.toLocaleDateString("en-US", { weekday: "short" })}
                    </ThemedText>
                    <ThemedText
                      style={[styles.dateNum, isSelected && { color: "#fff" }]}
                    >
                      {dObj.getDate()}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <BookOpen size={16} color={theme.primary} />
              <ThemedText style={styles.sectionLabel}>FOCUS AREA</ThemedText>
            </View>
            <View style={styles.tabRow}>
              {(["Math", "Reading and Writing"] as Section[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.tab,
                    { borderColor: theme.border },
                    section === s && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setSection(s)}
                >
                  <ThemedText
                    style={[styles.tabText, section === s && { color: "#fff" }]}
                  >
                    {s}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.sectionLabel}>START</ThemedText>
                <TextInput
                  style={[
                    styles.timeInput,
                    { borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.sectionLabel}>END</ThemedText>
                <TextInput
                  style={[
                    styles.timeInput,
                    { borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="10:00"
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionLabel}>
                SESSION OBJECTIVES
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="What will you accomplish?"
              multiline
              value={tasks}
              onChangeText={setTasks}
            />

            <View style={styles.sectionHeader}>
              <Zap size={16} color={theme.primary} />
              <ThemedText style={styles.sectionLabel}>AUTOMATE</ThemedText>
            </View>
            <View
              style={[
                styles.automateCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.autoHeader}>
                <ThemedText style={{ fontWeight: "700" }}>
                  Repeat Plan
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setAutomate(!automate)}
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: automate ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleDot,
                      { marginLeft: automate ? 22 : 2 },
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {automate && (
                <View style={styles.weekdayRow}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          if (selectedWeekdays.includes(idx)) {
                            setSelectedWeekdays(
                              selectedWeekdays.filter((d) => d !== idx),
                            );
                          } else {
                            setSelectedWeekdays([...selectedWeekdays, idx]);
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
                            selectedWeekdays.includes(idx) && { color: "#fff" },
                          ]}
                        >
                          {day}
                        </ThemedText>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              )}
            </View>

            <Button
              title={loading ? "Saving..." : "Lock in Mission"}
              onPress={handleSave}
              loading={loading}
              style={styles.saveBtn}
            />
          </ScrollView>
        </PremiumGate>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  container: { paddingHorizontal: 20, paddingVertical: 24, gap: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: -8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "900",
    opacity: 0.5,
    letterSpacing: 1.2,
  },
  dateList: { gap: 10 },
  dateCard: {
    width: 60,
    height: 76,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 10, fontWeight: "900", opacity: 0.5, marginBottom: 2 },
  dateNum: { fontSize: 19, fontWeight: "900" },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 12, fontWeight: "900", opacity: 0.6 },
  timeRow: { flexDirection: "row", gap: 16 },
  timeInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  textArea: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 16,
    fontWeight: "600",
    textAlignVertical: "top",
  },
  automateCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  autoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2 },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: { fontSize: 11, fontWeight: "900" },
  saveBtn: { height: 56, borderRadius: 16, marginTop: 12 },
});
