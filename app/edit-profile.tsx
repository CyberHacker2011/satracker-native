import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter, Stack } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  User,
  GraduationCap,
  Calendar,
  Target,
} from "lucide-react-native";
import { FeedbackErrorModal } from "../components/FeedbackErrorModal";
import Slider from "@react-native-community/slider";
import { usePremium } from "../hooks/usePremium";
import { useSafeBack } from "../hooks/useSafeBack";

type EducationLevel =
  | "5th"
  | "6th"
  | "7th"
  | "8th"
  | "9th"
  | "10th"
  | "11th"
  | "12th"
  | "undergraduate"
  | "graduate";

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const safeBack = useSafeBack();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile Data
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [examDate, setExamDate] = useState("");
  const [targetMath, setTargetMath] = useState(400);
  const [targetRW, setTargetRW] = useState(400);
  const [previousMath, setPreviousMath] = useState(200);
  const [previousRW, setPreviousRW] = useState(200);
  const [hasPreviousScore, setHasPreviousScore] = useState(false);

  const educationOptions: EducationLevel[] = [
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
    "undergraduate",
    "graduate",
  ];

  const examDates = [
    "March 2026",
    "May 2026",
    "June 2026",
    "August 2026",
    "October 2026",
    "November 2026",
    "December 2026",
    "Other",
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setName(data.name || "");
        setEducationLevel(data.education_level || "");
        setExamDate(data.exam_date || "");
        setTargetMath(data.target_math || 400);
        setTargetRW(data.target_reading_writing || 400);
        setPreviousMath(data.previous_math || 200);
        setPreviousRW(data.previous_reading_writing || 200);
        setHasPreviousScore(
          !!(data.previous_math || data.previous_reading_writing),
        );
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || t("failedLoadProfile"));
      setErrorVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t("notAuthenticated"));

      const profileData = {
        user_id: user.id,
        name: name || null,
        education_level: educationLevel || null,
        exam_date: examDate || null,
        target_math: targetMath,
        target_reading_writing: targetRW,
        previous_math: hasPreviousScore ? previousMath : null,
        previous_reading_writing: hasPreviousScore ? previousRW : null,
      };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(profileData, { onConflict: "user_id" });

      if (error) throw error;

      Alert.alert(t("success"), t("profileUpdated"));
      safeBack();
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || t("failedUpdateProfile"));
      setErrorVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const totalTarget = targetMath + targetRW;
  const totalPrevious = previousMath + previousRW;

  if (loading) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <FeedbackErrorModal
          visible={errorVisible}
          error={errorMsg}
          onDismiss={() => {
            setErrorVisible(false);
            setLoading(false);
          }}
          onRetry={loadProfile}
        />
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <FeedbackErrorModal
        visible={errorVisible}
        error={errorMsg}
        onDismiss={() => {
          setErrorVisible(false);
          setLoading(false);
        }}
        onRetry={loadProfile}
      />
      <Stack.Screen
        options={{
          title: t("editProfile"),
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={safeBack}>
              <ChevronLeft color={theme.textPrimary} size={28} />
            </TouchableOpacity>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Personal Information */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color={theme.primary} />
              <ThemedText style={styles.sectionTitle}>
                {t("personalInfo")}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>{t("name")}</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder={t("yourName")}
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>
                {t("educationLevel")}
              </ThemedText>
              <View style={styles.grid}>
                {educationOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.gridBtn,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                      },
                      educationLevel === option && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setEducationLevel(option)}
                  >
                    <ThemedText
                      style={[
                        styles.gridText,
                        educationLevel === option && {
                          color: "#fff",
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {t(option)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>

          {/* Exam Date */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={theme.primary} />
              <ThemedText style={styles.sectionTitle}>
                {t("examDate")}
              </ThemedText>
            </View>

            <View style={styles.dateGrid}>
              {examDates.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateBtn,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                    examDate === date && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setExamDate(date)}
                >
                  <ThemedText
                    style={[
                      styles.dateText,
                      examDate === date && { color: "#fff", fontWeight: "700" },
                    ]}
                  >
                    {date.split(" ")[0] === "Other"
                      ? t("other")
                      : date.replace(
                          date.split(" ")[0],
                          t(date.split(" ")[0].toLowerCase()),
                        )}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* SAT Scores */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Target size={20} color={theme.primary} />
              <ThemedText style={styles.sectionTitle}>
                {t("satScores")}
              </ThemedText>
            </View>

            <ThemedText style={styles.subsectionTitle}>
              {t("targetScore")}
            </ThemedText>
            <View style={styles.scoreSection}>
              <ThemedText style={styles.scoreLabel}>{t("math")}</ThemedText>
              <View style={styles.sliderRow}>
                <Slider
                  style={styles.slider}
                  minimumValue={200}
                  maximumValue={800}
                  step={10}
                  value={targetMath}
                  onValueChange={setTargetMath}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />
                <ThemedText style={styles.scoreValue}>{targetMath}</ThemedText>
              </View>
            </View>

            <View style={styles.scoreSection}>
              <ThemedText style={styles.scoreLabel}>
                {t("readingWriting")}
              </ThemedText>
              <View style={styles.sliderRow}>
                <Slider
                  style={styles.slider}
                  minimumValue={200}
                  maximumValue={800}
                  step={10}
                  value={targetRW}
                  onValueChange={setTargetRW}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />
                <ThemedText style={styles.scoreValue}>{targetRW}</ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.totalBox,
                {
                  backgroundColor: theme.primaryLight,
                  borderColor: theme.primary,
                },
              ]}
            >
              <ThemedText style={[styles.totalLabel, { color: theme.primary }]}>
                {t("totalTarget")}
              </ThemedText>
              <ThemedText style={[styles.totalValue, { color: theme.primary }]}>
                {totalTarget}
              </ThemedText>
            </View>

            <ThemedText style={styles.subsectionTitle}>
              {t("previousScoreOptional")}
            </ThemedText>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  hasPreviousScore && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setHasPreviousScore(!hasPreviousScore)}
              >
                {hasPreviousScore && (
                  <ThemedText
                    style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}
                  >
                    ✓
                  </ThemedText>
                )}
              </TouchableOpacity>
              <ThemedText style={styles.checkboxLabel}>
                {t("havePreviousScore")}
              </ThemedText>
            </View>

            {hasPreviousScore && (
              <>
                <View style={styles.scoreSection}>
                  <ThemedText style={styles.scoreLabel}>{t("math")}</ThemedText>
                  <View style={styles.sliderRow}>
                    <Slider
                      style={styles.slider}
                      minimumValue={200}
                      maximumValue={800}
                      step={10}
                      value={previousMath}
                      onValueChange={setPreviousMath}
                      minimumTrackTintColor={theme.primary}
                      maximumTrackTintColor={theme.border}
                      thumbTintColor={theme.primary}
                    />
                    <ThemedText style={styles.scoreValue}>
                      {previousMath}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.scoreSection}>
                  <ThemedText style={styles.scoreLabel}>
                    {t("readingWriting")}
                  </ThemedText>
                  <View style={styles.sliderRow}>
                    <Slider
                      style={styles.slider}
                      minimumValue={200}
                      maximumValue={800}
                      step={10}
                      value={previousRW}
                      onValueChange={setPreviousRW}
                      minimumTrackTintColor={theme.primary}
                      maximumTrackTintColor={theme.border}
                      thumbTintColor={theme.primary}
                    />
                    <ThemedText style={styles.scoreValue}>
                      {previousRW}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.totalBox,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <ThemedText style={styles.totalLabel}>
                    {t("previousTotal")}
                  </ThemedText>
                  <ThemedText style={styles.totalValue}>
                    {totalPrevious}
                  </ThemedText>
                </View>
              </>
            )}
          </Card>

          <Button
            title={saving ? t("saving") : t("saveChanges")}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  section: {
    padding: 20,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 8,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: "18%",
    alignItems: "center",
  },
  gridText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateGrid: {
    gap: 8,
  },
  dateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scoreSection: {
    gap: 8,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.6,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: "900",
    minWidth: 50,
    textAlign: "right",
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    height: 50,
    borderRadius: 10,
    marginTop: 8,
  },
});
