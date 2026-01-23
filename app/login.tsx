import React, { useState, useRef } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react-native";
import { FeedbackErrorModal } from "../components/FeedbackErrorModal";
import { Toast } from "../components/Toast";

type Screen = "login" | "forgot-password" | "check-email";

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace("/(tabs)");
      } else {
        setIsCheckingAuth(false);
      }
    });
  }, []);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email) {
      setErrorMessage(t('enterEmail'));
      return;
    }
    if (!password) {
      setErrorMessage(t('enterPassword'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error(t('invalidCredentials'));
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error(t('emailNotConfirmed'));
        } else if (error.message.includes("User not found")) {
          throw new Error(t('userNotFound'));
        }
        throw error;
      }
      router.replace("/(tabs)");
    } catch (error: any) {
      const msg = error.message || t('loginFailed');
      if (msg === t('invalidCredentials')) {
        setErrorMessage(msg);
      } else {
        showToast(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage(null);
    if (!email) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'sat-tracker://reset-password',
      });
      if (error) throw error;
      setScreen("check-email");
    } catch (error: any) {
      showToast(error.message || t('failedSendReset'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    await handleForgotPassword();
  };

  if (isCheckingAuth) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: 10, opacity: 0.5, fontWeight: "700" }}>{t('loadingDashboard')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.content}>
              <View style={[styles.logo, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.logoText}>S</ThemedText>
              </View>

              {/* Login Screen */}
              {screen === "login" && (
                <>
                  <Heading style={styles.title}>{t('welcomeBack')}</Heading>
                  <ThemedText style={styles.subtitle}>{t('signInToContinue')}</ThemedText>

                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Mail size={16} color={theme.textSecondary} />
                        <ThemedText style={styles.label}>{t('emailAddress')}</ThemedText>
                      </View>
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
                      <View style={styles.labelRow}>
                        <Lock size={16} color={theme.textSecondary} />
                        <ThemedText style={styles.label}>{t('password')}</ThemedText>
                      </View>
                      <View style={styles.passwordContainer}>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary, flex: 1 }]}
                          placeholder="••••••••"
                          placeholderTextColor={theme.textSecondary}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          ref={passwordRef}
                          returnKeyType="go"
                          onSubmitEditing={handleLogin}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                          {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {errorMessage && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color="#ef4444" />
                        <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                      </View>
                    )}

                    <Button 
                      title={loading ? t('signingIn') : t('signIn')} 
                      onPress={handleLogin} 
                      loading={loading}
                      style={styles.submitButton}
                    />

                    <TouchableOpacity onPress={() => setScreen("forgot-password")} style={{ marginTop: 16 }}>
                      <ThemedText style={[styles.linkText, { color: theme.primary }]}>{t('forgotPassword')}</ThemedText>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                      <ThemedText style={styles.dividerText}>{t('or')}</ThemedText>
                      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                    </View>

                    <Button 
                      title={t('createNewAccount')} 
                      variant="secondary"
                      onPress={() => router.push("/signup")}
                      style={styles.secondaryButton}
                    />
                  </View>
                </>
              )}

              {/* Forgot Password Screen */}
              {screen === "forgot-password" && (
                <>
                  <Heading style={styles.title}>{t('forgotPassword')}</Heading>
                  <ThemedText style={styles.subtitle}>{t('enterEmailReset')}</ThemedText>

                  <View style={styles.form}>
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Mail size={16} color={theme.textSecondary} />
                        <ThemedText style={styles.label}>Email</ThemedText>
                      </View>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                        placeholder="your.email@example.com"
                        placeholderTextColor={theme.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="go"
                        onSubmitEditing={handleForgotPassword}
                      />
                    </View>

                    {errorMessage && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color="#ef4444" />
                        <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                      </View>
                    )}

                    <Button 
                      title={loading ? t('sending') : t('sendResetLink')} 
                      onPress={handleForgotPassword} 
                      loading={loading}
                      style={styles.submitButton}
                    />

                    <TouchableOpacity onPress={() => setScreen("login")} style={{ marginTop: 20 }}>
                      <ThemedText style={[styles.linkText, { color: theme.primary }]}>{t('backToSignIn')}</ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Check Email Screen */}
              {screen === "check-email" && (
                <>
                  <View style={[styles.successIcon, { backgroundColor: theme.primaryLight }]}>
                    <Mail size={40} color={theme.primary} />
                  </View>
                  <Heading style={styles.title}>{t('checkYourEmail')}</Heading>
                  <ThemedText style={[styles.subtitle, { textAlign: 'center' }]}>
                    {t('weSentResetLink').replace('{email}', email)}
                  </ThemedText>

                  <View style={styles.form}>
                    <Button 
                      title={loading ? t('resending') : t('resendEmail')} 
                      variant="secondary"
                      onPress={handleResendEmail} 
                      loading={loading}
                      style={styles.submitButton}
                    />

                    <TouchableOpacity onPress={() => setScreen("login")} style={{ marginTop: 20 }}>
                      <ThemedText style={[styles.linkText, { color: theme.primary }]}>{t('backToSignIn')}</ThemedText>
                    </TouchableOpacity>

                    <View style={[styles.contactBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ThemedText style={styles.contactTitle}>{t('needHelp')}</ThemedText>
                      <ThemedText style={styles.contactText}>ibrohimshaymardanov011@gmail.com</ThemedText>
                      <ThemedText style={styles.contactText}>t.me/@ibrohimfr</ThemedText>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>© 2026 SAT Tracker. {t('allRightsReserved')}.</ThemedText>
              <View style={styles.footerLinks}>
                <ThemedText style={styles.footerLink}>ibrohimshaymardanov011@gmail.com</ThemedText>
                <ThemedText style={styles.footerDot}>•</ThemedText>
                <ThemedText style={styles.footerLink}>t.me/@ibrohimfr</ThemedText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
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
    right: 16,
    padding: 8,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  submitButton: {
    height: 56,
    borderRadius: 14,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.4,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  contactBox: {
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.4,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLink: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.3,
  },
  footerDot: {
    fontSize: 10,
    opacity: 0.2,
  },
});
