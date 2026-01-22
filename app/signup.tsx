import React, { useState, useRef } from "react";
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Eye, EyeOff } from "lucide-react-native";
import Slider from '@react-native-community/slider';

type EducationLevel = '5th' | '6th' | '7th' | '8th' | '9th' | '10th' | '11th' | '12th' | 'undergraduate' | 'graduate';

export default function SignupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Step 1: Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2: Personal Info
  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState<EducationLevel | "">("");

  // Step 3: SAT Info
  const [examDate, setExamDate] = useState("");
  const [targetMath, setTargetMath] = useState(400);
  const [targetReadingWriting, setTargetReadingWriting] = useState(400);
  const [previousMath, setPreviousMath] = useState(200);
  const [previousReadingWriting, setPreviousReadingWriting] = useState(200);
  const [hasPreviousScore, setHasPreviousScore] = useState(false);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const educationOptions: EducationLevel[] = [
    '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'undergraduate', 'graduate'
  ];

  const examDates = [
    "March 2026", "May 2026", "June 2026", "August 2026", 
    "October 2026", "November 2026", "December 2026", "Other"
  ];

  const validatePassword = (pass: string): { valid: boolean; message?: string } => {
    if (pass.length < 8) return { valid: false, message: "Password must be at least 8 characters long" };
    if (!/[A-Z]/.test(pass)) return { valid: false, message: "Password must contain at least one uppercase letter" };
    if (!/[a-z]/.test(pass)) return { valid: false, message: "Password must contain at least one lowercase letter" };
    if (!/[0-9]/.test(pass)) return { valid: false, message: "Password must contain at least one number" };
    return { valid: true };
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!email || !password || !confirmPassword) {
        Alert.alert("Missing Fields", "Please fill in all fields");
        return;
      }
      const validation = validatePassword(password);
      if (!validation.valid) {
        Alert.alert("Weak Password", validation.message || "");
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert("Password Mismatch", "Passwords do not match");
        return;
      }
    } else if (currentStep === 2) {
      if (!name || !educationLevel) {
        Alert.alert("Missing Fields", "Please complete all required fields");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleSkip = () => {
    if (currentStep === 2 || currentStep === 3) {
      handleSignup();
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      const { error: profileError } = await supabase.from("user_profiles").insert({
        user_id: authData.user.id,
        name: name || null,
        education_level: educationLevel || null,
        exam_date: examDate || null,
        target_math: targetMath,
        target_reading_writing: targetReadingWriting,
        previous_math: hasPreviousScore ? previousMath : null,
        previous_reading_writing: hasPreviousScore ? previousReadingWriting : null,
      });

      if (profileError) throw profileError;

      Alert.alert(
        "Success!",
        "Account created successfully! Please check your email for verification.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (error: any) {
      Alert.alert("Signup Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalTarget = targetMath + targetReadingWriting;
  const totalPrevious = previousMath + previousReadingWriting;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : router.back()}
              style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            >
              <ChevronLeft size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            
            {(currentStep === 2 || currentStep === 3) && (
              <TouchableOpacity onPress={handleSkip}>
                <ThemedText style={[styles.skipText, { color: theme.primary }]}>Skip</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.progressContainer, { backgroundColor: theme.border }]}>
            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]} />
          </View>

          <View style={styles.content}>
            <Heading style={styles.title}>
              {currentStep === 1 && "Create Account"}
              {currentStep === 2 && "Tell Us About You"}
              {currentStep === 3 && "Your SAT Goals"}
            </Heading>
            <ThemedText style={styles.subtitle}>
              {currentStep === 1 && "Set up your credentials"}
              {currentStep === 2 && "We'll personalize your experience"}
              {currentStep === 3 && "Help us track your progress"}
            </ThemedText>

            {/* Step 1: Email & Password */}
            {currentStep === 1 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Email Address</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="your.email@example.com"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Password</ThemedText>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary, flex: 1 }]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      ref={passwordRef}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                  <ThemedText style={styles.hint}>At least 8 characters, with uppercase, lowercase, and numbers</ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Confirm Password</ThemedText>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary, flex: 1 }]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      ref={confirmRef}
                      returnKeyType="done"
                      onSubmitEditing={handleNext}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                      {showConfirmPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                    </TouchableOpacity>
                  </View>
                </View>

                <Button title="Continue" onPress={handleNext} style={styles.button} />
                
                <TouchableOpacity onPress={() => router.push("/login")} style={{ marginTop: 20 }}>
                  <ThemedText style={[styles.linkText, { color: theme.primary }]}>
                    Already have an account? Sign in
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Preferred Name</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder="What should we call you?"
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Education Level</ThemedText>
                  <View style={styles.optionsGrid}>
                    {educationOptions.map(option => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionBtn,
                          { borderColor: theme.border, backgroundColor: theme.card },
                          educationLevel === option && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => setEducationLevel(option)}
                      >
                        <ThemedText style={[styles.optionText, educationLevel === option && { color: '#fff', fontWeight: '700' }]}>
                          {option === 'undergraduate' || option === 'graduate' ? option : option}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Button title="Continue" onPress={handleNext} style={styles.button} />
              </View>
            )}

            {/* Step 3: SAT Goals */}
            {currentStep === 3 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Exam Date</ThemedText>
                  <View style={styles.datesGrid}>
                    {examDates.map(date => (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.dateBtn,
                          { borderColor: theme.border, backgroundColor: theme.card },
                          examDate === date && { backgroundColor: theme.primary, borderColor: theme.primary }
                        ]}
                        onPress={() => setExamDate(date)}
                      >
                        <ThemedText style={[styles.dateText, examDate === date && { color: '#fff', fontWeight: '700' }]}>
                          {date}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Target SAT Score</ThemedText>
                  
                  <View style={styles.scoreSection}>
                    <ThemedText style={styles.scoreLabel}>Math</ThemedText>
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
                    <ThemedText style={styles.scoreLabel}>Reading & Writing</ThemedText>
                    <View style={styles.sliderRow}>
                      <Slider
                        style={styles.slider}
                        minimumValue={200}
                        maximumValue={800}
                        step={10}
                        value={targetReadingWriting}
                        onValueChange={setTargetReadingWriting}
                        minimumTrackTintColor={theme.primary}
                        maximumTrackTintColor={theme.border}
                        thumbTintColor={theme.primary}
                      />
                      <ThemedText style={styles.scoreValue}>{targetReadingWriting}</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.totalBox, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                    <ThemedText style={[styles.totalLabel, { color: theme.primary }]}>Total Target</ThemedText>
                    <ThemedText style={[styles.totalValue, { color: theme.primary }]}>{totalTarget}</ThemedText>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity 
                      style={[styles.checkbox, { borderColor: theme.border }, hasPreviousScore && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => setHasPreviousScore(!hasPreviousScore)}
                    >
                      {hasPreviousScore && <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</ThemedText>}
                    </TouchableOpacity>
                    <ThemedText style={styles.label}>I have a previous SAT score</ThemedText>
                  </View>

                  {hasPreviousScore && (
                    <>
                      <View style={styles.scoreSection}>
                        <ThemedText style={styles.scoreLabel}>Math</ThemedText>
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
                          <ThemedText style={styles.scoreValue}>{previousMath}</ThemedText>
                        </View>
                      </View>

                      <View style={styles.scoreSection}>
                        <ThemedText style={styles.scoreLabel}>Reading & Writing</ThemedText>
                        <View style={styles.sliderRow}>
                          <Slider
                            style={styles.slider}
                            minimumValue={200}
                            maximumValue={800}
                            step={10}
                            value={previousReadingWriting}
                            onValueChange={setPreviousReadingWriting}
                            minimumTrackTintColor={theme.primary}
                            maximumTrackTintColor={theme.border}
                            thumbTintColor={theme.primary}
                          />
                          <ThemedText style={styles.scoreValue}>{previousReadingWriting}</ThemedText>
                        </View>
                      </View>

                      <View style={[styles.totalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <ThemedText style={styles.totalLabel}>Previous Total</ThemedText>
                        <ThemedText style={styles.totalValue}>{totalPrevious}</ThemedText>
                      </View>
                    </>
                  )}
                </View>

                <Button 
                  title={loading ? "Creating Account..." : "Complete Signup"} 
                  onPress={handleSignup} 
                  loading={loading}
                  style={styles.button} 
                />
              </View>
            )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 28,
  },
  progressBar: {
    height: '100%',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 28,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 8,
  },
  hint: {
    fontSize: 11,
    opacity: 0.5,
    fontWeight: '600',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '18%',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  datesGrid: {
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
    fontWeight: '600',
  },
  scoreSection: {
    gap: 8,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.6,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '900',
    minWidth: 50,
    textAlign: 'right',
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 50,
    borderRadius: 10,
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
