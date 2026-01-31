import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView } from "../../components/ThemedView";
import { Button } from "../../components/Button";
import { usePlanStore } from "../../store/planStore";
import { ChevronLeft, Check, Zap } from "lucide-react-native";
import Slider from "@react-native-community/slider";
import { supabase } from "../../lib/supabase";
import { DayPlan } from "../../types/plan";

const { width } = Dimensions.get("window");

const STEPS = ["Exam", "Score", "Intensity", "Focus", "Schedule"];

// --- Step Components Outside to Fix Focus Issues ---

const ExamStep = ({ theme, onboardingData, setOnboardingData }: any) => {
  const DATES = [
    "March 2026",
    "May 2026",
    "June 2026",
    "August 2026",
    "September 2026",
    "October 2026",
    "November 2026",
    "December 2026",
  ];

  return (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>When is your next SAT exam?</Heading>
      <View style={styles.optionGrid}>
        {DATES.map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.optionCard,
              { borderColor: theme.border },
              onboardingData.testDate === d && {
                borderColor: theme.primary,
                backgroundColor: theme.primary + "08",
              },
            ]}
            onPress={() => setOnboardingData({ testDate: d })}
          >
            <View
              style={[
                styles.radio,
                { borderColor: theme.border },
                onboardingData.testDate === d && { borderColor: theme.primary },
              ]}
            >
              {onboardingData.testDate === d && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: theme.primary },
                  ]}
                />
              )}
            </View>
            <ThemedText style={styles.optionText}>{d}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const ScoreStep = ({ theme, onboardingData, setOnboardingData }: any) => {
  return (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>
        What's your current SAT performance?
      </Heading>
      <View style={styles.scoreRow}>
        <View style={styles.scoreInputGroup}>
          <View style={styles.rowBetween}>
            <ThemedText style={styles.label}>Maths</ThemedText>
            <View style={[styles.scoreDisplay, { borderColor: theme.border }]}>
              <ThemedText style={styles.scoreValue}>
                {onboardingData.scores.math}
              </ThemedText>
            </View>
          </View>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={200}
            maximumValue={800}
            step={10}
            value={onboardingData.scores.math}
            onSlidingComplete={(v) =>
              setOnboardingData({
                scores: { ...onboardingData.scores, math: v },
              })
            }
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.primary}
          />
        </View>
        <View style={styles.scoreInputGroup}>
          <View style={styles.rowBetween}>
            <ThemedText style={styles.label}>Reading & Writing</ThemedText>
            <View style={[styles.scoreDisplay, { borderColor: theme.border }]}>
              <ThemedText style={styles.scoreValue}>
                {onboardingData.scores.ebrw}
              </ThemedText>
            </View>
          </View>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={200}
            maximumValue={800}
            step={10}
            value={onboardingData.scores.ebrw}
            onSlidingComplete={(v) =>
              setOnboardingData({
                scores: { ...onboardingData.scores, ebrw: v },
              })
            }
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.primary}
          />
        </View>
      </View>
      <View
        style={[styles.overallBox, { backgroundColor: theme.primary + "10" }]}
      >
        <ThemedText style={[styles.overallText, { color: theme.primary }]}>
          Overall: {onboardingData.scores.math + onboardingData.scores.ebrw}
        </ThemedText>
      </View>
    </View>
  );
};

const IntensityStep = ({ theme, onboardingData, setOnboardingData }: any) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const INTENSITIES = [
    { label: "Light", time: 30 },
    { label: "Steady", time: 60 },
    { label: "Focused", time: 90 },
    { label: "Intense", time: 120 },
    { label: "Rigorous", time: 150 },
    { label: "Max Prep", time: 180 },
  ];

  const TIMES = [
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "14:00",
    "15:00",
    "16:00",
    "19:00",
    "20:00",
    "21:00",
  ];

  return (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>Your daily SAT study goal</Heading>
      <View style={styles.optionGrid}>
        {INTENSITIES.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={[
              styles.optionCard,
              { borderColor: theme.border },
              onboardingData.studyGoal === opt.time && {
                borderColor: theme.primary,
                backgroundColor: theme.primary + "08",
              },
            ]}
            onPress={() => setOnboardingData({ studyGoal: opt.time })}
          >
            <View
              style={[
                styles.radio,
                { borderColor: theme.border },
                onboardingData.studyGoal === opt.time && {
                  borderColor: theme.primary,
                },
              ]}
            >
              {onboardingData.studyGoal === opt.time && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: theme.primary },
                  ]}
                />
              )}
            </View>
            <View>
              <ThemedText style={styles.optionText}>{opt.label}</ThemedText>
              <ThemedText style={styles.optionSub}>
                {opt.time} minutes
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Heading style={[styles.stepTitle, { marginTop: 30, fontSize: 18 }]}>
        Preferred start time
      </Heading>
      <View style={styles.timePickerContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {TIMES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.timeBtnSlot,
                { borderColor: theme.border },
                onboardingData.preferredStartTime === t && {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={() => setOnboardingData({ preferredStartTime: t })}
            >
              <ThemedText
                style={[
                  styles.timeSlotText,
                  onboardingData.preferredStartTime === t && { color: "#fff" },
                ]}
              >
                {t}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const FocusStep = ({ theme, onboardingData, setOnboardingData }: any) => {
  const MATH = [
    "algebra",
    "advanced math",
    "problem solving data",
    "trigonometry",
  ];
  const RW = [
    "craft and structure",
    "information and ideas",
    "standard english conventions",
    "expression of ideas",
  ];

  const toggle = (
    list: string[],
    key: "mathStruggles" | "readingStruggles",
    item: string,
  ) => {
    if (list.includes(item)) {
      setOnboardingData({ [key]: list.filter((i) => i !== item) });
    } else if (list.length < 2) {
      setOnboardingData({ [key]: [...list, item] });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>
        What do you struggle with most?
      </Heading>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <ThemedText style={styles.categoryTitle}>Maths</ThemedText>
            <ThemedText style={styles.categoryLimit}>
              {onboardingData.mathStruggles.length}/2
            </ThemedText>
          </View>
          {MATH.map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.checkRow}
              onPress={() =>
                toggle(onboardingData.mathStruggles, "mathStruggles", t)
              }
            >
              <View
                style={[
                  styles.check,
                  { borderColor: theme.border },
                  onboardingData.mathStruggles.includes(t) && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                {onboardingData.mathStruggles.includes(t) && (
                  <Check size={12} color="#fff" />
                )}
              </View>
              <ThemedText style={styles.checkText}>{t}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ width: 20 }} />
        <View style={{ flex: 1 }}>
          <View style={styles.rowBetween}>
            <ThemedText style={styles.categoryTitle}>
              Reading & Writing
            </ThemedText>
            <ThemedText style={styles.categoryLimit}>
              {onboardingData.readingStruggles.length}/2
            </ThemedText>
          </View>
          {RW.map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.checkRow}
              onPress={() =>
                toggle(onboardingData.readingStruggles, "readingStruggles", t)
              }
            >
              <View
                style={[
                  styles.check,
                  { borderColor: theme.border },
                  onboardingData.readingStruggles.includes(t) && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                {onboardingData.readingStruggles.includes(t) && (
                  <Check size={12} color="#fff" />
                )}
              </View>
              <ThemedText style={styles.checkText}>{t}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const ScheduleStep = ({ theme, onboardingData, setOnboardingData }: any) => {
  const PER_WEEK = [2, 3, 4, 5, 6, 7];
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const toggleOff = (day: string) => {
    const needed = 7 - onboardingData.daysPerWeek;
    if (onboardingData.daysOff.includes(day)) {
      setOnboardingData({
        daysOff: onboardingData.daysOff.filter((d: string) => d !== day),
      });
    } else if (onboardingData.daysOff.length < needed) {
      setOnboardingData({ daysOff: [...onboardingData.daysOff, day] });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>
        How many days per week can you study?
      </Heading>
      <View style={styles.optionGrid}>
        {PER_WEEK.map((n) => (
          <TouchableOpacity
            key={n}
            style={[
              styles.miniCard,
              { borderColor: theme.border },
              onboardingData.daysPerWeek === n && {
                borderColor: theme.primary,
                backgroundColor: theme.primary + "08",
              },
            ]}
            onPress={() => setOnboardingData({ daysPerWeek: n, daysOff: [] })}
          >
            <View
              style={[
                styles.radio,
                { borderColor: theme.border },
                onboardingData.daysPerWeek === n && {
                  borderColor: theme.primary,
                },
              ]}
            >
              {onboardingData.daysPerWeek === n && (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: theme.primary },
                  ]}
                />
              )}
            </View>
            <ThemedText style={styles.optionText}>{n} days</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
      {onboardingData.daysPerWeek < 7 && (
        <>
          <View style={[styles.rowBetween, { marginTop: 30 }]}>
            <Heading style={[styles.stepTitle, { fontSize: 18 }]}>
              Select your {7 - onboardingData.daysPerWeek} days off
            </Heading>
            <ThemedText style={styles.categoryLimit}>
              {onboardingData.daysOff.length}/{7 - onboardingData.daysPerWeek}
            </ThemedText>
          </View>
          <View style={styles.optionGrid}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.miniCard,
                  { borderColor: theme.border },
                  onboardingData.daysOff.includes(d) && {
                    backgroundColor: "#000",
                    borderColor: "#000",
                  },
                ]}
                onPress={() => toggleOff(d)}
              >
                <View
                  style={[
                    styles.square,
                    { borderColor: theme.border },
                    onboardingData.daysOff.includes(d) && {
                      borderColor: "#fff",
                    },
                  ]}
                >
                  {onboardingData.daysOff.includes(d) && (
                    <Check size={12} color="#fff" />
                  )}
                </View>
                <ThemedText
                  style={[
                    styles.optionText,
                    onboardingData.daysOff.includes(d) && { color: "#fff" },
                  ]}
                >
                  {d}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <ThemedText style={styles.subText}>
        This helps us build a path that fits your life.
      </ThemedText>
    </View>
  );
};

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    onboardingData,
    setOnboardingData,
    generatePlan,
    isGenerating,
    draftPlan,
    setDraftPlan,
  } = usePlanStore();

  const [step, setStep] = useState(0);

  const PlanPreview = () => {
    if (!draftPlan) return null;

    const savePlan = async () => {
      try {
        setDraftPlan(null); // Optimistic UI
        router.replace("/(tabs)"); // Navigate immediately for speed

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const workload = draftPlan.days;
        const insertChunk: any[] = workload.map((item) => {
          const [s, e] = (item.tasks_text || "09:00 - 10:00").split(" - ");
          return {
            user_id: user.id,
            date: item.date,
            section: item.section.toLowerCase().includes("math")
              ? "math"
              : "reading",
            study_type: item.type || "Learning",
            tasks_text: `${item.topic}: ${item.specific_goal}`,
            status: "todo",
            start_time: s,
            end_time: e.split(" ")[0],
            duration: onboardingData.studyGoal,
            ai_generated: true, // It is AI generated
            day_number: item.day,
          };
        });

        // Bulk insert in one shot
        if (insertChunk.length > 0) {
          const { error } = await supabase
            .from("study_plan")
            .insert(insertChunk);
          if (error) {
            console.error("Supabase planning error:", error);
          }
        }

        await supabase
          .from("user_profiles")
          .update({
            exam_date: onboardingData.testDate,
            target_math: onboardingData.scores.math,
            target_reading_writing: onboardingData.scores.ebrw,
            has_onboarded: true,
          })
          .eq("user_id", user.id);
      } catch (e) {
        console.error("Save failed", e);
      }
    };

    const getPlanChipStyles = (type: string) => {
      const t = type?.toLowerCase() || "";
      if (t.includes("mock"))
        return { bg: "#bbf7d0", color: "#065f46", border: "#4ade80" };
      if (t.includes("practice"))
        return { bg: "#bfdbfe", color: "#1e40af", border: "#60a5fa" };
      if (t.includes("learning"))
        return { bg: "#ffedd5", color: "#9a3412", border: "#fb923c" };
      return {
        bg: theme.primary + "25",
        color: theme.primary,
        border: theme.primary,
      };
    };

    return (
      <View
        style={[styles.previewContainer, { backgroundColor: theme.background }]}
      >
        <View style={styles.previewHeaderRow}>
          <Heading style={styles.previewTitle}>Your Prep Path</Heading>
          <View style={styles.previewActionRow}>
            <TouchableOpacity
              style={[styles.miniActionBtn, { borderColor: theme.border }]}
              onPress={() => generatePlan()}
            >
              <Zap size={14} color={theme.primary} style={{ marginRight: 4 }} />
              <ThemedText style={styles.miniActionText}>Regenerate</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.miniActionBtn,
                { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
              onPress={savePlan}
            >
              <Check size={14} color="#fff" style={{ marginRight: 4 }} />
              <ThemedText style={[styles.miniActionText, { color: "#fff" }]}>
                Accept
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
        <View
          style={[styles.summaryBox, { backgroundColor: theme.primary + "08" }]}
        >
          <ThemedText style={styles.summary}>
            {draftPlan.meta.summary}
          </ThemedText>
        </View>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        >
          {draftPlan.days.map((d, i) => {
            const chip = getPlanChipStyles(d.type || "");
            const displayDate = d.date
              ? new Date(d.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : `Day ${d.day}`;
            return (
              <View
                key={i}
                style={[
                  styles.planCard,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.card,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 3,
                  },
                ]}
              >
                <View
                  style={[styles.cardAccent, { backgroundColor: chip.border }]}
                />
                <View style={styles.aiBadge}>
                  <Zap size={10} color="#fff" fill="#fff" />
                  <ThemedText style={styles.aiBadgeText}>AI</ThemedText>
                </View>
                <View style={styles.rowBetween}>
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: chip.bg,
                        borderColor: chip.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[styles.chipText, { color: chip.color }]}
                    >
                      {d.type?.toUpperCase() || "GOAL"}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.planDateText}>
                    {displayDate} • {d.start_time} - {d.end_time}
                  </ThemedText>
                </View>
                <View
                  style={[styles.row, { marginTop: 12, alignItems: "center" }]}
                >
                  <ThemedText
                    style={[
                      styles.planSection,
                      { color: d.section === "Math" ? "#3b82f6" : "#ec4899" },
                    ]}
                  >
                    {d.section.toUpperCase()}
                  </ThemedText>
                  <View
                    style={{
                      width: 1,
                      height: 12,
                      backgroundColor: theme.border,
                      marginHorizontal: 8,
                    }}
                  />
                  <ThemedText style={styles.planTopic} numberOfLines={1}>
                    {d.topic}
                  </ThemedText>
                </View>
                <ThemedText style={styles.planGoal}>
                  {d.specific_goal}
                </ThemedText>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await generatePlan();
    }
  };

  const stepProps = { theme, onboardingData, setOnboardingData };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {!draftPlan && (
          <View style={styles.progressHeader}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressPin,
                  { backgroundColor: i <= step ? "#10b981" : "#e5e7eb" },
                ]}
              />
            ))}
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {draftPlan ? (
            <PlanPreview />
          ) : (
            <>
              {step === 0 && <ExamStep {...stepProps} />}
              {step === 1 && <ScoreStep {...stepProps} />}
              {step === 2 && <IntensityStep {...stepProps} />}
              {step === 3 && <FocusStep {...stepProps} />}
              {step === 4 && <ScheduleStep {...stepProps} />}
            </>
          )}
        </ScrollView>

        {!draftPlan && (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => step > 0 && setStep(step - 1)}
              style={{ padding: 10 }}
            >
              <ChevronLeft
                size={28}
                color={step > 0 ? theme.textPrimary : "transparent"}
              />
            </TouchableOpacity>
            <Button
              title={
                step === 4
                  ? isGenerating
                    ? "Preparing..."
                    : "Create schedule"
                  : "Next"
              }
              onPress={handleNext}
              loading={isGenerating}
              style={{
                flex: 1,
                marginLeft: 20,
                backgroundColor:
                  step === 4 &&
                  onboardingData.daysOff.length < 7 - onboardingData.daysPerWeek
                    ? "#e5e7eb"
                    : theme.primary,
                borderRadius: 25,
                height: 56,
              }}
              disabled={
                step === 4 &&
                onboardingData.daysOff.length < 7 - onboardingData.daysPerWeek
              }
            />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  progressHeader: { flexDirection: "row", gap: 6, padding: 20, paddingTop: 10 },
  progressPin: { flex: 1, height: 4, borderRadius: 2 },
  stepContainer: { padding: 20 },
  stepTitle: { fontSize: 24, fontWeight: "800", marginBottom: 20 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  optionCard: {
    width: (width - 54) / 2,
    padding: 16,
    borderWidth: 1,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  miniCard: {
    width: (width - 54) / 2,
    padding: 12,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  optionText: { fontWeight: "700", fontSize: 14 },
  optionSub: { fontSize: 12, opacity: 0.5 },
  scoreRow: { gap: 24 },
  scoreInputGroup: { gap: 8 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "700" },
  scoreDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  scoreValue: { fontWeight: "800" },
  overallBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 40,
    alignItems: "center",
  },
  overallText: { fontWeight: "800", fontSize: 18 },
  row: { flexDirection: "row", gap: 10 },
  timePickerContainer: {
    marginTop: 10,
    height: 50,
  },
  timeBtnSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  timeSlotText: {
    fontWeight: "700",
    fontSize: 14,
  },
  categoryTitle: { fontWeight: "800", fontSize: 14 },
  categoryLimit: { opacity: 0.4, fontSize: 12 },
  checkRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkText: { fontWeight: "500", fontSize: 13 },
  square: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  subText: { marginTop: 20, opacity: 0.5, fontSize: 13 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  previewContainer: { flex: 1, padding: 20 },
  previewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  previewTitle: { fontSize: 22, fontWeight: "900" },
  previewActionRow: { flexDirection: "row", gap: 8 },
  miniActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  miniActionText: { fontWeight: "800", fontSize: 13 },
  summary: { opacity: 0.8, fontSize: 14, lineHeight: 20 },
  planCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    position: "relative",
    overflow: "hidden",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  chipText: { fontSize: 10, fontWeight: "900" },
  planDateText: { fontSize: 11, fontWeight: "700", opacity: 0.4 },
  planSection: { fontWeight: "800", fontSize: 10, marginRight: 10 },
  planTopic: { fontWeight: "700", fontSize: 14, flex: 1 },
  planGoal: { fontSize: 13, opacity: 0.7, marginTop: 4 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
  },
  aiBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    backgroundColor: "#a855f7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  aiBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  summaryBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
});
