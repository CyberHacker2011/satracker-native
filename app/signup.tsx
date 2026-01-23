import React, { useState, useRef } from "react";
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Eye, EyeOff, AlertCircle } from "lucide-react-native";
import Slider from '@react-native-community/slider';
import { FeedbackErrorModal } from "../components/FeedbackErrorModal";
import { Toast } from "../components/Toast";

type EducationLevel = '5th' | '6th' | '7th' | '8th' | '9th' | '10th' | '11th' | '12th' | 'undergraduate' | 'graduate';

export default function SignupScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('error');

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };
  
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Step 1: Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [emailExistsError, setEmailExistsError] = useState<boolean>(false);

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

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const validatePassword = (pass: string): { valid: boolean; message?: string } => {
    if (pass.length < 6) return { valid: false, message: t('passwordRequirements') };
    if (!/[a-zA-Z]/.test(pass)) return { valid: false, message: t('passwordRequirements') };
    if (!/[0-9]/.test(pass)) return { valid: false, message: t('passwordRequirements') };
    return { valid: true };
  };

  const handleNext = async () => {
    setStep1Error(null);
    setEmailExistsError(false);
    if (currentStep === 1) {
      if (!email) {
        setStep1Error(t('enterEmail'));
        return;
      }
      if (!validateEmail(email)) {
        setStep1Error(t('invalidEmail'));
        return;
      }
      if (!password) {
        setStep1Error(t('createPassword'));
        return;
      }
      const validation = validatePassword(password);
      if (!validation.valid) {
        setStep1Error(t('passwordRequirements'));
        return;
      }
      if (password !== confirmPassword) {
        setStep1Error(t('passwordsDoNotMatch'));
        return;
      }

      // Move signUp to the final step to prevent early redirect
    } else if (currentStep === 2) {
      if (!name || !educationLevel) {
        showToast(t('completeRequiredFields'));
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
      // Step 1: Create the auth account with metadata for redundancy
      const { data: { user, session }, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            education_level: educationLevel,
          }
        }
      });

      if (signupError) {
        if (signupError.message.toLowerCase().includes("already registered") || signupError.message.toLowerCase().includes("taken")) {
          setCurrentStep(1);
          setEmailExistsError(true);
          showToast(t('userAlreadyExists'));
        } else {
          showToast(signupError.message || t('unexpectedError'));
        }
        setLoading(false);
        return;
      }

      const userId = user?.id;
      if (!userId) throw new Error(t('unexpectedError'));

      // Step 2: Create the user profile in separate table
      // We do this concurrently but wait for it before showing success
      const { error: profileError } = await supabase.from("user_profiles").insert({
        user_id: userId,
        name: name || null,
        education_level: educationLevel || null,
        exam_date: examDate || null,
        target_math: targetMath,
        target_reading_writing: targetReadingWriting,
        previous_math: hasPreviousScore ? previousMath : null,
        previous_reading_writing: hasPreviousScore ? previousReadingWriting : null,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // We continue anyway since metadata is saved and account exists
      }

      showToast(t('accountCreatedSuccess'), "success");
      
      // If session exists, _layout.tsx will handle the redirect.
      // If email verification is needed, session will be null.
      if (!session) {
        showToast(t('checkEmailVerify'), "info");
      }
      
    } catch (error: any) {
      showToast(error.message || t('unexpectedError'));
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
              <TouchableOpacity onPress={() => handleSkip()}>
                <ThemedText style={[styles.skipText, { color: theme.primary }]}>{t('skip')}</ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.progressContainer, { backgroundColor: theme.border }]}>
            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.primary }]} />
          </View>

          <View style={styles.content}>
            <Heading style={styles.title}>
              {currentStep === 1 && t('createAccount')}
              {currentStep === 2 && t('tellUsAboutYou')}
              {currentStep === 3 && t('satGoals')}
            </Heading>
            <ThemedText style={styles.subtitle}>
              {currentStep === 1 && t('setUpCredentials')}
              {currentStep === 2 && t('personalizeExperience')}
              {currentStep === 3 && t('trackProgress')}
            </ThemedText>

            {/* Step 1: Email & Password */}
            {currentStep === 1 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('emailAddress')}</ThemedText>
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
                  {emailExistsError && (
                    <ThemedText style={[styles.hint, { color: '#ef4444', marginTop: 4, fontWeight: '700' }]}>
                      {t('userAlreadyExists')}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('createPassword')}</ThemedText>
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
                  <ThemedText style={styles.hint}>{t('hints')}</ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('confirmPassword')}</ThemedText>
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

                {step1Error && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color="#ef4444" />
                    <ThemedText style={styles.errorText}>{step1Error}</ThemedText>
                  </View>
                )}

                <Button title={loading && currentStep === 1 ? t('checking') : t('continue')} onPress={handleNext} style={styles.button} loading={loading && currentStep === 1} />
                
                <TouchableOpacity onPress={() => router.push("/login")} style={{ marginTop: 20 }}>
                  <ThemedText style={[styles.linkText, { color: theme.primary }]}>
                    {t('alreadyHaveAccount')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('preferredName')}</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                    placeholder={t('namePlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('educationLevel')}</ThemedText>
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
                          {t(option)}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <Button title={t('continue')} onPress={handleNext} style={styles.button} />
              </View>
            )}

            {/* Step 3: SAT Goals */}
            {currentStep === 3 && (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('examDate')}</ThemedText>
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
                          {date.split(' ')[0] === 'Other' ? t('other') : date.replace(date.split(' ')[0], t(date.split(' ')[0].toLowerCase()))}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>{t('targetScore')}</ThemedText>
                  
                  <View style={styles.scoreSection}>
                    <ThemedText style={styles.scoreLabel}>{t('math')}</ThemedText>
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
                    <ThemedText style={styles.scoreLabel}>{t('readingWriting')}</ThemedText>
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
                    <ThemedText style={[styles.totalLabel, { color: theme.primary }]}>{t('totalTarget')}</ThemedText>
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
                    <ThemedText style={styles.label}>{t('havePreviousScore')}</ThemedText>
                  </View>

                  {hasPreviousScore && (
                    <>
                      <View style={styles.scoreSection}>
                        <ThemedText style={styles.scoreLabel}>{t('math')}</ThemedText>
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
                        <ThemedText style={styles.scoreLabel}>{t('readingWriting')}</ThemedText>
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
                        <ThemedText style={styles.totalLabel}>{t('previousTotal')}</ThemedText>
                        <ThemedText style={styles.totalValue}>{totalPrevious}</ThemedText>
                      </View>
                    </>
                  )}
                </View>

                <Button 
                  title={loading ? t('creatingAccount') : t('completeSignup')} 
                  onPress={handleSignup} 
                  loading={loading}
                  style={styles.button} 
                />
              </View>
            )}
          </View>
        </ScrollView>
        <Toast 
          visible={toastVisible} 
          onDismiss={() => setToastVisible(false)}
          type={toastType}
        >
          {toastMessage}
        </Toast>
        <FeedbackErrorModal 
          visible={modalVisible} 
          error={modalError} 
          onDismiss={() => setModalVisible(false)} 
        />
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
  errorContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
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
