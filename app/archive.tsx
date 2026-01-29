import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter, Stack } from "expo-router";
import { supabase } from "../lib/supabase";
import { getLocalDateString, getMonthYearString } from "../lib/dateUtils";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit2,
} from "lucide-react-native";
import { Toast } from "../components/Toast";
import { PremiumGate } from "../components/PremiumGate";

export default function ArchiveScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"error" | "success" | "info">(
    "error",
  );

  const initialDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  })();

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  const historyDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getLocalDateString(d));
    }
    return days;
  }, []);

  const loadData = async (dateStr: string) => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: plans } = await supabase
        .from("study_plan")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .order("start_time");
      const { data: logs } = await supabase
        .from("daily_log")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateStr);

      const enriched = plans?.map((p) => ({
        ...p,
        status: logs?.find((l) => l.plan_id === p.id)?.status || "untracked",
      }));
      setPlans(enriched || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <PremiumGate feature="Archive">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(tabs)")}>
              <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Heading style={{ fontSize: 20 }}>Study Archive</Heading>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.calSection}>
            <View style={styles.calHeader}>
              <CalendarIcon size={14} color={theme.primary} />
              <ThemedText style={styles.calTitle}>SUCCESS HISTORY</ThemedText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calScroll}
            >
              {historyDays.map((d: string) => {
                const isSelected = selectedDate === d;
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
                    onPress={() => setSelectedDate(d)}
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
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.container}>
              {plans.length === 0 ? (
                <View style={styles.empty}>
                  <Clock size={48} color={theme.textSecondary} opacity={0.2} />
                  <ThemedText style={styles.emptyText}>
                    No sessions recorded for this day.
                  </ThemedText>
                </View>
              ) : (
                plans.map((p) => (
                  <View
                    key={p.id}
                    style={[styles.planItem, { borderColor: theme.border }]}
                  >
                    <View style={styles.planHeader}>
                      <ThemedText style={styles.planTag}>
                        {p.section.toUpperCase()}
                      </ThemedText>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: "/(tabs)/plan",
                              params: { editId: p.id },
                            })
                          }
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
                                  const { error } = await supabase
                                    .from("study_plan")
                                    .delete()
                                    .eq("id", p.id);
                                  if (error) setToastMessage(error.message);
                                  else {
                                    setToastMessage("Plan deleted");
                                    setToastType("success");
                                    loadData(selectedDate);
                                  }
                                  setToastVisible(true);
                                },
                              },
                            ]);
                          }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <ThemedText style={styles.planTasks}>
                        {p.tasks_text}
                      </ThemedText>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              p.status === "done"
                                ? "#10b981"
                                : p.status === "missed"
                                  ? "#ef4444"
                                  : "rgba(0,0,0,0.05)",
                          },
                        ]}
                      >
                        <ThemedText style={styles.statusText}>
                          {p.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.planTime}>
                      {p.start_time} - {p.end_time}
                    </ThemedText>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </PremiumGate>
      </SafeAreaView>
      <Toast
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        type={toastType}
      >
        {toastMessage}
      </Toast>
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
  container: { padding: 24, paddingBottom: 60, gap: 16 },
  calSection: {
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(0,0,0,0.02)",
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  calTitle: {
    fontSize: 9,
    fontWeight: "900",
    opacity: 0.4,
    letterSpacing: 1.5,
  },
  calScroll: { paddingHorizontal: 24, gap: 10 },
  dateCard: {
    width: 48,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { fontSize: 8, fontWeight: "900", opacity: 0.5, marginBottom: 2 },
  dateNum: { fontSize: 16, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 80, gap: 16 },
  emptyText: { opacity: 0.3, fontWeight: "700" },
  planItem: { padding: 20, borderRadius: 20, borderWidth: 1.5, gap: 8 },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planTag: {
    fontSize: 10,
    fontWeight: "900",
    color: "#3b82f6",
    letterSpacing: 1,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 8, fontWeight: "900", color: "#fff" },
  planTasks: { fontSize: 15, fontWeight: "700" },
  planTime: { fontSize: 11, fontWeight: "800", opacity: 0.4 },
});
