import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react-native";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  // Extract and verify token from URL hash sent by Supabase
  useEffect(() => {
    const handlePasswordResetToken = async () => {
      try {
        // Supabase sends tokens in URL hash like: #access_token=xxx&refresh_token=yyy&type=recovery
        if (typeof window !== "undefined") {
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1),
          );

          const error = hashParams.get("error");
          const errorDescription = hashParams.get("error_description");
          const type = hashParams.get("type");

          if (error) {
            setError(errorDescription || "Invalid or expired reset link");
            setIsValidating(false);
            setTimeout(() => router.replace("/login"), 3000);
            return;
          }

          // Check if this is a recovery link
          if (type !== "recovery") {
            setError("Invalid reset link");
            setIsValidating(false);
            setTimeout(() => router.replace("/login"), 3000);
            return;
          }
        }

        // Supabase client automatically handles tokens from URL when initialized
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setError("Invalid or expired reset link. Please request a new one.");
          setIsValidating(false);
          setTimeout(() => router.replace("/login"), 3000);
          return;
        }

        // Valid session - user can now reset password
        console.log("Valid reset session found");
        setIsValidating(false);
      } catch (err: any) {
        console.error("Token validation error:", err);
        setError("Failed to validate reset link");
        setIsValidating(false);
        setTimeout(() => router.replace("/login"), 3000);
      }
    };

    handlePasswordResetToken();
  }, []);

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
              style={[
                styles.successIcon,
                { backgroundColor: theme.primaryLight },
              ]}
            >
              <CheckCircle size={48} color="#10b981" />
            </View>
            <Heading style={styles.successTitle}>Password Reset!</Heading>
            <ThemedText style={styles.successText}>
              Your password has been successfully reset.
            </ThemedText>
            <ThemedText style={[styles.successText, { marginTop: 8 }]}>
              Redirecting to login...
            </ThemedText>
          </Card>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isValidating) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <Card style={styles.successCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.successText, { marginTop: 16 }]}>
              Validating reset link...
            </ThemedText>
            {error ? (
              <ThemedText style={[styles.errorText, { marginTop: 8 }]}>
                {error}
              </ThemedText>
            ) : null}
          </Card>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Card style={styles.card}>
          <Heading style={styles.title}>Reset Password</Heading>
          <ThemedText style={styles.subtitle}>
            Enter your new password
          </ThemedText>

          {error ? (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Lock size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="New Password"
                placeholderTextColor={theme.textSecondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Lock size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="Confirm Password"
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
            title={loading ? "Resetting..." : "Reset Password"}
            onPress={handleResetPassword}
            disabled={loading}
            style={{ marginTop: 24 }}
          />

          {loading && (
            <ActivityIndicator
              size="small"
              color={theme.primary}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: "#fee",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcc",
  },
  errorText: {
    color: "#c00",
    fontSize: 13,
    fontWeight: "600",
  },
  inputContainer: {
    gap: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  successCard: {
    padding: 40,
    alignItems: "center",
    gap: 16,
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
    fontSize: 24,
  },
  successText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
