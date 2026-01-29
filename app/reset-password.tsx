import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Lock, CheckCircle, KeyRound } from "lucide-react-native";

const ResetPasswordScreen = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);

  // Check if we have a session. If so, we can proceed to update password.
  // If not, we need to handle the deep link logic to ESTABLISH the session first.
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        if (mounted) setSessionVerified(true);
      } else {
        // Handle deep link extraction if not already handled by _layout
        // ... (Simple validation, we assume _layout or Supabase auto-handling)
        // If user arrives here without session, we might be in trouble unless the link *just* processed.
        // But let's verify parameters.
        if (params.type === "recovery" || params.access_token) {
          // Supabase client usually handles the hash fragment automatically on web and some native setups,
          // but getting the session is the source of truth.
          // We'll give it a moment.
          setTimeout(async () => {
            const {
              data: { session: retrySession },
            } = await supabase.auth.getSession();
            if (retrySession && mounted) setSessionVerified(true);
          }, 1000);
        }
      }
    };
    checkSession();
    return () => {
      mounted = false;
    };
  }, [params]);

  const handleResetPassword = async () => {
    setError("");

    if (!newPassword) {
      setError(t("enterPassword") || "Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Sign out and redirect after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <Card style={styles.successCard}>
            <View
              style={[styles.successIcon, { backgroundColor: "#10b98120" }]}
            >
              <CheckCircle size={48} color="#10b981" />
            </View>
            <Heading style={styles.successTitle}>All Set!</Heading>
            <ThemedText style={styles.successText}>
              Your password has been changed successfully.
            </ThemedText>
            <Button
              title="Go to Login"
              onPress={() => router.replace("/login")}
              style={{ marginTop: 20, width: "100%" }}
            />
          </Card>
        </SafeAreaView>
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
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.primary + "20" },
                ]}
              >
                <KeyRound size={32} color={theme.primary} />
              </View>
              <Heading style={styles.title}>New Password</Heading>
              <ThemedText style={styles.subtitle}>
                Create a strong password to secure your account.
              </ThemedText>
            </View>

            <Card style={styles.formCard}>
              {error ? (
                <View style={styles.errorBox}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>New Password</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Lock size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={theme.textSecondary}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={theme.textSecondary} />
                    ) : (
                      <Eye size={20} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Confirm Password</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Lock size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={theme.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={theme.textSecondary} />
                    ) : (
                      <Eye size={20} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Button
                title={loading ? "Updating..." : "Set New Password"}
                onPress={handleResetPassword}
                disabled={loading}
                loading={loading}
                style={{ marginTop: 12 }}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    maxWidth: 240,
  },
  formCard: {
    padding: 24,
    gap: 20,
    borderRadius: 24,
  },
  errorBox: {
    backgroundColor: "#fee",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  errorText: {
    color: "#c00",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  successCard: {
    padding: 32,
    alignItems: "center",
    gap: 16,
    margin: 24,
    marginTop: "30%",
    borderRadius: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
  },
  successText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});

export default ResetPasswordScreen;
