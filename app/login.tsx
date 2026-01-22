import React, { useState, useRef } from "react";
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Mail, Lock } from "lucide-react-native";

type Screen = "login" | "forgot-password" | "check-email";

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
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
    if (!email || !password) {
      setErrorMessage("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/(tabs)");
    } catch (error: any) {
      setErrorMessage(error.message || "Login failed. Please try again.");
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
      setErrorMessage(error.message || "Failed to send reset email.");
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
        <ThemedText style={{ marginTop: 10, opacity: 0.5, fontWeight: "700" }}>Loading...</ThemedText>
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
                  <Heading style={styles.title}>Welcome Back</Heading>
                  <ThemedText style={styles.subtitle}>Sign in to continue your SAT prep journey</ThemedText>

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
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <Lock size={16} color={theme.textSecondary} />
                        <ThemedText style={styles.label}>Password</ThemedText>
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
                        <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                      </View>
                    )}

                    <Button 
                      title={loading ? "Signing In..." : "Sign In"} 
                      onPress={handleLogin} 
                      loading={loading}
                      style={styles.submitButton}
                    />

                    <TouchableOpacity onPress={() => setScreen("forgot-password")} style={{ marginTop: 16 }}>
                      <ThemedText style={[styles.linkText, { color: theme.primary }]}>Forgot your password?</ThemedText>
                    </TouchableOpacity>

                    <View style={styles.divider}>
                      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                      <ThemedText style={styles.dividerText}>OR</ThemedText>
                      <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                    </View>

                    <Button 
                      title="Create New Account" 
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
                  <Heading style={styles.title}>Forgot Password?</Heading>
                  <ThemedText style={styles.subtitle}>Enter your email and we'll send you a reset link</ThemedText>

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
                        <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                      </View>
                    )}

                    <Button 
                      title={loading ? "Sending..." : "Send Reset Link"} 
                      onPress={handleForgotPassword} 
                      loading={loading}
                      style={styles.submitButton}
                    />

                    <TouchableOpacity onPress={() => setScreen("login")} style={{ marginTop: 20 }}>
                      <ThemedText style={[styles.linkText, { color: theme.primary }]}>Back to Sign In</ThemedText>
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
                  <Heading style={styles.title}>Check Your Email</Heading>
                  <ThemedText style={[styles.subtitle, { textAlign: 'center' }]}>
                    We've sent a password reset link to {email}
                  </ThemedText>

                  <View style={styles.form}>
                    <Button 
                      title={loading ? "Resending..." : "Resend Email"} 
                      variant="secondary"
                      onPress={handleResendEmail} 
                      loading={loading}
                      style={styles.submitButton}
                    />

                    <TouchableOpacity onPress={() => setScreen("login")} style={{ marginTop: 20 }}>
                      <ThemedText style={[styles.linkText, { color: theme.primary }]}>Back to Sign In</ThemedText>
                    </TouchableOpacity>

                    <View style={[styles.contactBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <ThemedText style={styles.contactTitle}>Need help?</ThemedText>
                      <ThemedText style={styles.contactText}>ibrohimshaymardanov011@gmail.com</ThemedText>
                      <ThemedText style={styles.contactText}>t.me/@ibrohimfr</ThemedText>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>© 2026 SAT Tracker. All Rights Reserved.</ThemedText>
              <View style={styles.footerLinks}>
                <ThemedText style={styles.footerLink}>ibrohimshaymardanov011@gmail.com</ThemedText>
                <ThemedText style={styles.footerDot}>•</ThemedText>
                <ThemedText style={styles.footerLink}>t.me/@ibrohimfr</ThemedText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
