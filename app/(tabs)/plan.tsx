import React, { useState, useEffect } from "react";
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getLocalDateString, getLocalTimeString, getMonthYearString } from "../../lib/dateUtils";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar as CalendarIcon, Clock, BookOpen, ChevronLeft, ChevronRight, X, Check } from "lucide-react-native";
import { FeedbackErrorModal } from "../../components/FeedbackErrorModal";
import { checkConnection } from "../../lib/network";

type Section = "math" | "reading" | "writing";

export default function PlanScreen() {
  const { theme, themeName } = useTheme();
  const router = useRouter();

  const now = new Date();
  const curTimeStr = getLocalTimeString(now);
  const [date, setDate] = useState(getLocalDateString(now));
  const [section, setSection] = useState<Section>("math");
  
  // Default to current time, and end time + 1 hour (+5 min min duration later)
  const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const curEndStr = getLocalTimeString(defaultEnd);
  
  const [startTime, setStartTime] = useState(curTimeStr);
  const [endTime, setEndTime] = useState(curEndStr);
  const [tasks, setTasks] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<"start" | "end" | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const getCalendarDays = () => {
    const days = [];
    const dateCheck = new Date();
    // Start from today and show 21 days (3 weeks)
    for (let i = 0; i < 21; i++) {
        const d = new Date(dateCheck);
        d.setDate(d.getDate() + i);
        days.push(getLocalDateString(d));
    }
    return days;
  };

  const handleSave = async () => {
    if (!tasks) {
      Alert.alert("Error", "Please enter some tasks");
      return;
    }

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    if (startM > 59 || endM > 59) {
        Alert.alert("Invalid Time", "Minutes cannot exceed 59.");
        return;
    }
    
    const planDateObj = new Date(date + "T00:00:00");
    const startObj = new Date(planDateObj);
    startObj.setHours(startH, startM, 0, 0);
    
    const endObj = new Date(planDateObj);
    endObj.setHours(endH, endM, 0, 0);

    // Past time check - REVISED: Allow if End Time is in future
    if (endObj <= new Date()) {
      Alert.alert("Invalid Time", "The mission end time must be in the future.");
      return;
    }

    // Min duration 5 min
    const durationMin = (endObj.getTime() - startObj.getTime()) / (1000 * 60);
    if (durationMin < 5) {
        Alert.alert("Short Duration", "Minimum plan duration is 5 minutes.");
        return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { error } = await supabase.from("study_plan").insert([
        {
          user_id: user.id,
          date,
          section,
          start_time: startTime,
          end_time: endTime,
          tasks_text: tasks,
        },
      ]);

      if (error) throw error;
      
      Alert.alert("Success", "Mission committed successfully!");
      setTasks("");
      router.push("/(tabs)");
    } catch (error: any) {
      console.error(error);
      const isOnline = await checkConnection();
      const msg = isOnline 
        ? (error.message || "Failed to save plan. Server error.") 
        : "No internet connection. Please check your network and try again.";
      setErrorMsg(msg);
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = getCalendarDays();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const renderTimeDropdown = (type: "start" | "end") => {
    const current = type === "start" ? startTime : endTime;
    const [h, m] = current.split(":");

    return (
        <Card style={[styles.timeDropdown, { borderColor: theme.border }]}>
            <View style={styles.dropdownCols}>
                <View style={styles.dropdownCol}>
                    <ThemedText style={styles.colLabel}>HOUR</ThemedText>
                    <ScrollView style={styles.colScroll} nestedScrollEnabled>
                        {hours.map(hour => (
                            <TouchableOpacity 
                                key={hour} 
                                style={[styles.colItem, h === hour && { backgroundColor: theme.primaryLight }]}
                                onPress={() => {
                                    const next = `${hour}:${m}`;
                                    if (type === "start") setStartTime(next); else setEndTime(next);
                                }}
                            >
                                <ThemedText style={[styles.colText, h === hour && { color: theme.primary, fontWeight: '900' }]}>{hour}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                <View style={[styles.colDivider, { backgroundColor: theme.border }]} />
                <View style={styles.dropdownCol}>
                    <ThemedText style={styles.colLabel}>MIN</ThemedText>
                    <ScrollView style={styles.colScroll} nestedScrollEnabled>
                        {minutes.map(min => (
                            <TouchableOpacity 
                                key={min} 
                                style={[styles.colItem, m === min && { backgroundColor: theme.primaryLight }]}
                                onPress={() => {
                                    const next = `${h}:${min}`;
                                    if (type === "start") setStartTime(next); else setEndTime(next);
                                }}
                            >
                                <ThemedText style={[styles.colText, m === min && { color: theme.primary, fontWeight: '900' }]}>{min}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
            <TouchableOpacity style={[styles.closeDropdown, { backgroundColor: theme.primary }]} onPress={() => setShowTimePicker(null)}>
                <Check color="#fff" size={16} />
            </TouchableOpacity>
        </Card>
    );
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <FeedbackErrorModal 
        visible={errorVisible} 
        error={errorMsg} 
        onDismiss={() => setErrorVisible(false)} 
        onRetry={handleSave}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.push("/(tabs)")} style={{ marginBottom: 12, alignSelf: 'flex-start', padding: 8, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <Heading style={styles.title}>Plan</Heading>
            <ThemedText style={styles.subtitle}>Design your path to mastery.</ThemedText>
          </View>

          {/* New Calendar Grid */}
          <Card style={styles.calendarCard}>
              <View style={[styles.calHeader, { justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CalendarIcon size={16} color={theme.primary} />
                    <ThemedText style={styles.calTitle}>Select Schedule Date</ThemedText>
                  </View>
                  <ThemedText style={[styles.calTitle, { opacity: 0.8 }]}>{getMonthYearString(date)}</ThemedText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calScroll}>
                  {calendarDays.map((d, i) => {
                      const dayDate = new Date(d + "T00:00:00");
                      const isSelected = date === d;
                      return (
                          <TouchableOpacity 
                              key={i} 
                              style={[
                                  styles.dayCard, 
                                  { borderColor: theme.border },
                                  isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                              ]}
                              onPress={() => setDate(d)}
                          >
                              <ThemedText style={[styles.dayName, isSelected && { color: '#fff' }]}>{dayNames[dayDate.getDay()]}</ThemedText>
                              <ThemedText style={[styles.dayNum, isSelected && { color: '#fff' }]}>{dayDate.getDate()}</ThemedText>
                          </TouchableOpacity>
                      );
                  })}
              </ScrollView>
          </Card>

          <View style={styles.form}>
              {/* Section Choice */}
              <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                      <BookOpen size={18} color={theme.primary} />
                      <ThemedText style={styles.label}>Focus Area</ThemedText>
                  </View>
                  <View style={styles.tabRow}>
                      {(["math", "reading", "writing"] as Section[]).map(s => (
                          <TouchableOpacity 
                              key={s} 
                              onPress={() => setSection(s)}
                              style={[styles.tab, { borderColor: theme.border, backgroundColor: theme.card }, section === s && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                          >
                              <ThemedText style={[styles.tabText, section === s && { color: '#fff' }]}>{s.toUpperCase()}</ThemedText>
                          </TouchableOpacity>
                      ))}
                  </View>
              </View>

              {/* Time Selection */}
              <View style={styles.timeSection}>
                  <View style={styles.timeInput}>
                      <ThemedText style={styles.labelSmall}>START TIME</ThemedText>
                      <View style={styles.manualTimeRow}>
                        <TextInput 
                            style={[styles.manualTimeInput, { color: theme.textPrimary, borderColor: theme.border }]}
                            value={startTime}
                            onChangeText={(t) => setStartTime(t.replace(/[^0-9:]/g, ''))}
                            placeholder="HH:MM"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                        />
                        <TouchableOpacity 
                            style={[styles.pickerBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
                            onPress={() => setShowTimePicker(showTimePicker === "start" ? null : "start")}
                        >
                            <Clock size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      {showTimePicker === "start" && renderTimeDropdown("start")}
                  </View>
                  <View style={styles.timeInput}>
                      <ThemedText style={styles.labelSmall}>END TIME</ThemedText>
                      <View style={styles.manualTimeRow}>
                        <TextInput 
                            style={[styles.manualTimeInput, { color: theme.textPrimary, borderColor: theme.border }]}
                            value={endTime}
                            onChangeText={(t) => setEndTime(t.replace(/[^0-9:]/g, ''))}
                            placeholder="HH:MM"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numbers-and-punctuation"
                            maxLength={5}
                        />
                        <TouchableOpacity 
                            style={[styles.pickerBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => setShowTimePicker(showTimePicker === "end" ? null : "end")}
                        >
                            <Clock size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      {showTimePicker === "end" && renderTimeDropdown("end")}
                  </View>
              </View>

              {/* Tasks */}
              <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Execution Tasks</ThemedText>
                  <TextInput 
                      style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                      placeholder="Divide your session into specific tasks..."
                      placeholderTextColor={theme.textSecondary + '80'}
                      multiline
                      value={tasks}
                      onChangeText={setTasks}
                      blurOnSubmit={false}
                      onSubmitEditing={handleSave}
                  />
              </View>

              <Button 
                title={loading ? "Saving..." : "Commit Mission"} 
                onPress={handleSave} 
                loading={loading}
                style={styles.saveBtn}
              />
              <View style={[styles.instructions, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ThemedText style={[styles.instTitle, { color: theme.primary }]}>Instructions</ThemedText>
                  <ThemedText style={[styles.instText, { color: theme.textSecondary }]}>
                      Choose the section you want to study and set a clear timeframe. Be specific about your tasks to maintain focus. Once saved, these plans will appear in your dashboard and check-in timeline.
                  </ThemedText>
              </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 40,
  },
  title: {
      fontSize: 28,
  },
  subtitle: {
      opacity: 0.5,
      fontWeight: '600',
      marginTop: 4,
  },
  calendarCard: {
      padding: 24,
      marginBottom: 32,
  },
  calHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 20,
  },
  calTitle: {
      fontSize: 12,
      fontWeight: '900',
      opacity: 0.4,
      textTransform: 'uppercase',
  },
  calScroll: {
      gap: 12,
  },
  dayCard: {
      width: 60,
      height: 80,
      borderRadius: 18,
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
      fontSize: 20,
      fontWeight: '900',
  },
  form: {
      gap: 32,
  },
  inputGroup: {
      gap: 12,
  },
  labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  label: {
      fontSize: 14,
      fontWeight: '800',
  },
  tabRow: {
      flexDirection: 'row',
      gap: 10,
  },
  tab: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      backgroundColor: 'rgba(0,0,0,0.02)',
      alignItems: 'center',
      justifyContent: 'center',
  },
  tabText: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.4,
  },
  timeSection: {
      flexDirection: 'row',
      gap: 20,
      zIndex: 10,
  },
  timeInput: {
      flex: 1,
      gap: 8,
      position: 'relative',
  },
  labelSmall: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.4,
      marginLeft: 4,
  },
  timeTrigger: {
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 10,
  },
  manualTimeRow: {
      flexDirection: 'row',
      gap: 8,
  },
  manualTimeInput: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      fontSize: 16,
      fontWeight: '800',
  },
  pickerBtn: {
      width: 56,
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
  },
  timeVal: {
      fontSize: 16,
      fontWeight: '800',
  },
  textArea: {
      height: 120,
      borderRadius: 20,
      borderWidth: 1.5,
      padding: 20,
      fontSize: 15,
      fontWeight: '600',
      textAlignVertical: 'top',
  },
  saveBtn: {
      height: 60,
      borderRadius: 20,
  },
  timeDropdown: {
      position: 'absolute',
      top: 65,
      width: 180,
      height: 250,
      padding: 0,
      zIndex: 100,
      elevation: 10,
      shadowOpacity: 0.2,
      shadowRadius: 15,
      borderWidth: 1,
  },
  dropdownCols: {
      flex: 1,
      flexDirection: 'row',
  },
  dropdownCol: {
      flex: 1,
      alignItems: 'center',
  },
  colLabel: {
      fontSize: 8,
      fontWeight: '900',
      opacity: 0.3,
      paddingVertical: 10,
  },
  colScroll: {
      flex: 1,
      width: '100%',
  },
  colItem: {
      paddingVertical: 12,
      alignItems: 'center',
      width: '100%',
  },
  colText: {
      fontSize: 14,
      fontWeight: '700',
  },
  colDivider: {
      width: 1,
      height: '100%',
      opacity: 0.1,
  },
  closeDropdown: {
      padding: 10,
      alignItems: 'center',
  },
  instructions: {
      marginTop: 40,
      padding: 24,
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.1)',
  },
  instTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: '#B45309',
      marginBottom: 8,
  },
  instText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#B45309',
      lineHeight: 18,
      opacity: 0.8,
  }
});
