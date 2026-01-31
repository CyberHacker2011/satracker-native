import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  GraduationCap,
  Calendar,
  Target,
  CheckCircle2,
} from "lucide-react-native";
import Slider from "@react-native-community/slider";
import { Toast } from "../components/Toast";
import * as Linking from "expo-linking";

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

export default function SignupScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");
  const [examDate, setExamDate] = useState("");
  const [targetMath, setTargetMath] = useState(600);
  const [targetReadingWriting, setTargetReadingWriting] = useState(600);

  const educationOptions: EducationLevel[] = [
    "9th",
    "10th",
    "11th",
    "12th",
    "undergraduate",
    "graduate",
  ];

  const examDates = ["Aug 2026", "Oct 2026", "Nov 2026", "Dec 2026", "Other"];

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            "https://bjxroikxfcrrislsatwl.supabase.co/auth/v1/callback",
        },
      });
      if (error) throw error;
      if (data.url) Linking.openURL(data.url);
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!email || !password || password !== confirmPassword) {
        showToast("Please check your email and passwords.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!name || !educationLevel) {
        showToast("Please fill in your name and education level.");
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            education_level: educationLevel,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        await supabase.from("user_profiles").insert({
          user_id: data.user.id,
          name,
          education_level: educationLevel,
          exam_date: examDate,
          target_math: targetMath,
          target_reading_writing: targetReadingWriting,
        });
        showToast("Account created successfully!");
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      showToast(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>Create Account</Heading>
      <ThemedText style={styles.stepSubtitle}>
        Start your SAT journey today
      </ThemedText>

      <TouchableOpacity
        style={[styles.googleBtn, { borderColor: theme.border }]}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <ThemedText style={styles.googleText}>Sign up with Google</ThemedText>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <ThemedText style={styles.orText}>OR</ThemedText>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>

      <View style={styles.inputWrapper}>
        <Mail size={18} color={theme.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Email Address"
          placeholderTextColor={theme.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputWrapper}>
        <Lock size={18} color={theme.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeBtn}
        >
          {showPassword ? (
            <EyeOff size={18} color={theme.textSecondary} />
          ) : (
            <Eye size={18} color={theme.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputWrapper}>
        <Lock size={18} color={theme.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Confirm Password"
          placeholderTextColor={theme.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />
      </View>

      <Button title="Continue" onPress={handleNext} style={styles.mainBtn} />

      <View style={styles.footerRow}>
        <ThemedText style={{ color: theme.textSecondary }}>
          Already have an account?
        </ThemedText>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <ThemedText style={{ color: theme.primary, fontWeight: "700" }}>
            {" "}
            Sign In
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>About You</Heading>
      <ThemedText style={styles.stepSubtitle}>
        Help us personalize your study plan
      </ThemedText>

      <View style={styles.inputWrapper}>
        <User size={18} color={theme.textSecondary} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          placeholder="Full Name"
          placeholderTextColor={theme.textSecondary}
          value={name}
          onChangeText={setName}
        />
      </View>

      <ThemedText style={styles.label}>Education Level</ThemedText>
      <View style={styles.optionsGrid}>
        {educationOptions.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => setEducationLevel(opt)}
            style={[
              styles.optionCard,
              { borderColor: theme.border, backgroundColor: theme.card },
              educationLevel === opt && {
                borderColor: theme.primary,
                backgroundColor: theme.primaryLight,
              },
            ]}
          >
            <GraduationCap
              size={16}
              color={
                educationLevel === opt ? theme.primary : theme.textSecondary
              }
            />
            <ThemedText
              style={[
                styles.optionText,
                educationLevel === opt && { color: theme.primary },
              ]}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Next" onPress={handleNext} style={styles.mainBtn} />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Heading style={styles.stepTitle}>SAT Goals</Heading>
      <ThemedText style={styles.stepSubtitle}>
        Set your targets and exam date
      </ThemedText>

      <ThemedText style={styles.label}>Target Exam Date</ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dateScroll}
      >
        {examDates.map((date) => (
          <TouchableOpacity
            key={date}
            onPress={() => setExamDate(date)}
            style={[
              styles.dateCard,
              { borderColor: theme.border, backgroundColor: theme.card },
              examDate === date && {
                borderColor: theme.primary,
                backgroundColor: theme.primaryLight,
              },
            ]}
          >
            <Calendar
              size={16}
              color={examDate === date ? theme.primary : theme.textSecondary}
            />
            <ThemedText
              style={[
                styles.dateText,
                examDate === date && { color: theme.primary },
              ]}
            >
              {date}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.scoreSection}>
        <View style={styles.scoreRow}>
          <Target size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.scoreLabel}>
              Math Target: {targetMath}
            </ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={200}
              maximumValue={800}
              step={10}
              value={targetMath}
              onSlidingComplete={setTargetMath}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
            />
          </View>
        </View>

        <View style={styles.scoreRow}>
          <Target size={20} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.scoreLabel}>
              R&W Target: {targetReadingWriting}
            </ThemedText>
            <Slider
              style={styles.slider}
              minimumValue={200}
              maximumValue={800}
              step={10}
              value={targetReadingWriting}
              onSlidingComplete={setTargetReadingWriting}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.primary}
            />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.totalBox,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <CheckCircle2 size={24} color={theme.primary} />
        <View>
          <ThemedText style={styles.totalLabel}>Total Target Score</ThemedText>
          <ThemedText style={styles.totalValue}>
            {targetMath + targetReadingWriting}
          </ThemedText>
        </View>
      </View>

      <Button
        title={loading ? "Creating Account..." : "Finish Sign Up"}
        onPress={handleSignup}
        loading={loading}
        style={styles.mainBtn}
      />
    </View>
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                currentStep > 1
                  ? setCurrentStep(currentStep - 1)
                  : router.back()
              }
              style={styles.backBtn}
            >
              <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${(currentStep / 3) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast
          visible={toastVisible}
          onDismiss={() => setToastVisible(false)}
          type="error"
        >
          {toastMessage}
        </Toast>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  backBtn: {
    padding: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(100,100,100,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 32,
  },
  googleBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  orText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(100,100,100,0.05)",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  eyeBtn: {
    padding: 5,
  },
  mainBtn: {
    marginTop: 20,
    height: 54,
    borderRadius: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  optionCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    minWidth: "30%",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateScroll: {
    marginBottom: 24,
  },
  dateCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scoreSection: {
    gap: 20,
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 5,
  },
  slider: {
    width: "100%",
    height: 30,
  },
  totalBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.6,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "800",
  },
});
