import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  User,
  GraduationCap,
  Calendar,
  Target,
} from "lucide-react-native";

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [examDate, setExamDate] = useState("");
  const [targetMath, setTargetMath] = useState(800);
  const [targetRW, setTargetRW] = useState(800);
  const [prevMath, setPrevMath] = useState(0);
  const [prevRW, setPrevRW] = useState(0);
  const [hasPrev, setHasPrev] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      if (data) {
        setName(data.name || "");
        setEducationLevel(data.education_level || "");
        setExamDate(data.exam_date || "");
        setTargetMath(data.target_math || 800);
        setTargetRW(data.target_reading_writing || 800);
        setPrevMath(data.previous_math || 0);
        setPrevRW(data.previous_reading_writing || 0);
        setHasPrev(data.has_previous_score || false);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("user_profiles").upsert(
        {
          user_id: user?.id,
          name,
          education_level: educationLevel,
          exam_date: examDate,
          target_math: targetMath,
          target_reading_writing: targetRW,
          previous_math: prevMath,
          previous_reading_writing: prevRW,
          has_previous_score: hasPrev,
        },
        { onConflict: "user_id" },
      );
      Alert.alert(t("success"), t("profileUpdated"));
      router.back();
    } catch (e: any) {
      Alert.alert(t("error"), e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Heading style={{ fontSize: 20 }}>Edit Profile</Heading>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.sectionHeader}>
            <User size={16} color={theme.primary} />
            <ThemedText style={styles.sectionLabel}>IDENTITY</ThemedText>
          </View>
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.border, color: theme.textPrimary },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
          />

          <View style={styles.sectionHeader}>
            <GraduationCap size={16} color={theme.primary} />
            <ThemedText style={styles.sectionLabel}>GRADE / LEVEL</ThemedText>
          </View>
          <View style={styles.grid}>
            {[
              "6th",
              "7th",
              "8th",
              "9th",
              "10th",
              "11th",
              "12th",
              "Undergraduate",
            ].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.gridBtn,
                  { borderColor: theme.border },
                  educationLevel === level && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setEducationLevel(level)}
              >
                <ThemedText
                  style={[
                    styles.gridText,
                    educationLevel === level && { color: "#fff" },
                  ]}
                >
                  {level}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Calendar size={16} color={theme.primary} />
            <ThemedText style={styles.sectionLabel}>EXAM DATE</ThemedText>
          </View>
          <View style={styles.grid}>
            {[
              "March 2026",
              "May 2026",
              "June 2026",
              "August 2026",
              "October 2026",
              "November 2026",
              "December 2026",
            ].map((date) => (
              <TouchableOpacity
                key={date}
                style={[
                  styles.gridBtn,
                  { borderColor: theme.border },
                  examDate === date && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setExamDate(date)}
              >
                <ThemedText
                  style={[
                    styles.gridText,
                    examDate === date && { color: "#fff" },
                  ]}
                >
                  {date}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Target size={16} color={theme.primary} />
            <ThemedText style={styles.sectionLabel}>TARGET SCORE</ThemedText>
          </View>
          <View style={styles.scoreRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.smallLabel}>
                Math: {targetMath}
              </ThemedText>
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
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.smallLabel}>R&W: {targetRW}</ThemedText>
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
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setHasPrev(!hasPrev)}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: theme.primary,
                  backgroundColor: hasPrev ? theme.primary : "transparent",
                },
              ]}
            />
            <ThemedText style={styles.checkText}>
              I have a previous score
            </ThemedText>
          </TouchableOpacity>

          {hasPrev && (
            <View style={styles.scoreRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.smallLabel}>
                  Math: {prevMath}
                </ThemedText>
                <Slider
                  style={styles.slider}
                  minimumValue={200}
                  maximumValue={800}
                  step={10}
                  value={prevMath}
                  onValueChange={setPrevMath}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.smallLabel}>R&W: {prevRW}</ThemedText>
                <Slider
                  style={styles.slider}
                  minimumValue={200}
                  maximumValue={800}
                  step={10}
                  value={prevRW}
                  onValueChange={setPrevRW}
                  minimumTrackTintColor={theme.primary}
                  maximumTrackTintColor={theme.border}
                  thumbTintColor={theme.primary}
                />
              </View>
            </View>
          )}

          <Button
            title={saving ? "Saving..." : "Save Changes"}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  container: { padding: 24, gap: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: -8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.4,
    letterSpacing: 1.5,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  gridBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    minWidth: "28%",
  },
  gridText: { fontSize: 12, fontWeight: "800", textAlign: "center" },
  scoreRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  smallLabel: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.4,
    marginBottom: 4,
  },
  smallInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "800",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2 },
  checkText: { fontSize: 14, fontWeight: "700" },
  slider: { width: "100%", height: 30 },
  saveBtn: { height: 56, borderRadius: 16, marginTop: 20 },
});
