import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react-native";

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
  const [isValidating, setIsValidating] = useState(true);

  // Extract and verify token from URL hash sent by Supabase
  // Handle standard Supabase reset flow: Link -> Deep Link -> Extract Tokens -> Set Session
  // Extract and verify token from URL (Deep Link) OR Route Params (from _layout redirect)
  useEffect(() => {
    let isMounted = true;

    const validateSessionOrLink = async (url: string | null) => {
      try {
        console.log(
          "ResetPassword validation starting...",
          url ? "with URL" : "checking params/session",
        );

        // 0. Check for passed originalUrl from _layout
        const nestedUrl = params.originalUrl as string;
        const effectiveUrl = url || nestedUrl;

        // 1. Check Route Params (direct keys)
        const queryCode = params.code as string;
        const queryError = params.error as string;

        if (queryError) {
          if (isMounted)
            setError(
              (params.error_description as string) || "Error from redirect",
            );
          setTimeout(() => router.replace("/login"), 4000);
          return;
        }

        if (queryCode) {
          console.log("Found code in route params");
          const { error } =
            await supabase.auth.exchangeCodeForSession(queryCode);
          if (error) throw error;
          if (isMounted) setIsValidating(false);
          return;
        }

        // 2. Check Effective URL (Deep Link or Nested)
        const targetUrl = effectiveUrl || (await Linking.getInitialURL());

        if (targetUrl) {
          let paramsString = "";
          const hashIdx = targetUrl.indexOf("#");
          const queryIdx = targetUrl.indexOf("?");

          // Hash takes precedence for access_token
          if (hashIdx !== -1) {
            paramsString = targetUrl.substring(hashIdx + 1);
          } else if (queryIdx !== -1) {
            paramsString = targetUrl.substring(queryIdx + 1);
          }

          if (paramsString) {
            const urlParams = new URLSearchParams(paramsString);
            const accessToken = urlParams.get("access_token");
            const refreshToken = urlParams.get("refresh_token");
            const code = urlParams.get("code");
            const linkError = urlParams.get("error");

            if (linkError) {
              throw new Error(
                urlParams.get("error_description") || "Link contained error",
              );
            }

            if (code) {
              console.log("Found code in Deep Link");
              const { error } =
                await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              if (isMounted) setIsValidating(false);
              return;
            }

            if (accessToken && refreshToken) {
              console.log("Found tokens in Deep Link hash");
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) throw error;
              if (isMounted) setIsValidating(false);
              return;
            }
          }
        }

        // 3. Last Resort: Check if we are ALREADY authenticated
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) setIsValidating(false);
          return;
        }
      } catch (err: any) {
        console.error("Validation error:", err);
        if (isMounted) setError(err.message || "Failed to validate session");
      }
    };

    validateSessionOrLink(null);

    // Listen to new OS links
    const sub = Linking.addEventListener("url", (e) => {
      validateSessionOrLink(e.url);
    });

    // Fail-safe timeout
    const finalTimeout = setTimeout(() => {
      if (isValidating && isMounted) {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
            setError("Link expired or invalid. Please try again.");
          } else {
            setIsValidating(false);
          }
        });
      }
    }, 10000);

    return () => {
      isMounted = false;
      sub.remove();
      clearTimeout(finalTimeout);
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
};

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

export default ResetPasswordScreen;
