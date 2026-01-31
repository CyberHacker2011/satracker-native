import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { Button } from "../components/Button";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  Chrome,
} from "lucide-react-native";
import { Toast } from "../components/Toast";
import * as Linking from "expo-linking";

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

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const passwordRef = useRef<TextInput>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Use the configured production URL if available, otherwise fallback to linking
      const siteUrl =
        process.env.EXPO_PUBLIC_SITE_URL || "https://app.satracker.uz";

      // @ts-ignore
      const isElectron = typeof window !== "undefined" && !!window.require;

      if (isElectron) {
        // ELECTRON POLLING FLOW
        // 1. Generate ID
        const handshakeId =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);

        // 2. Create Handshake
        const { error: insertError } = await supabase
          .from("auth_handshakes")
          .insert({ id: handshakeId });

        if (insertError)
          throw new Error(
            "Failed to initialize login handshake: " + insertError.message,
          );

        // 3. Open Browser
        const authUrl = `${siteUrl}/electron-auth?id=${handshakeId}`;
        await Linking.openURL(authUrl);
        showToast("Browser opened. Please login there.");

        // 4. Poll for results
        // Poll for 2 minutes max
        const startTime = Date.now();
        const pollInterval = setInterval(async () => {
          if (Date.now() - startTime > 120000) {
            clearInterval(pollInterval);
            setLoading(false);
            showToast("Login timed out. Please try again.");
            return;
          }

          const { data, error } = await supabase
            .from("auth_handshakes")
            .select("*")
            .eq("id", handshakeId)
            .single();

          if (data && data.access_token && data.refresh_token) {
            clearInterval(pollInterval);

            // 5. Login Success
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });

            if (sessionError) {
              showToast("Failed to set session: " + sessionError.message);
              setLoading(false);
            } else {
              // Cleanup
              await supabase
                .from("auth_handshakes")
                .delete()
                .eq("id", handshakeId);
              router.replace("/(tabs)");
            }
          }
        }, 2000);

        // Return early, let polling handle the rest
        return;
      }

      // STANDARD WEB/NATIVE FLOW
      let redirectTo = siteUrl ? siteUrl : Linking.createURL("/");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      if (data.url) {
        if (Platform.OS === "web") {
          window.location.href = data.url;
        } else {
          Linking.openURL(data.url);
        }
      }
    } catch (e: any) {
      showToast(e.message || "Google Sign-In failed");
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage(t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.replace("/(tabs)");
    } catch (error: any) {
      setErrorMessage(error.message || t("loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage(t("enterEmail"));
      return;
    }
    setLoading(true);
    try {
      // Use the deep link for reset password
      const redirectTo = Linking.createURL("/reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setScreen("check-email");
    } catch (error: any) {
      showToast(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={[styles.logo, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.logoText}>S</ThemedText>
              </View>
              <ThemedText style={styles.appName}>SAT Tracker</ThemedText>
            </View>

            <View style={styles.card}>
              {screen === "login" ? (
                <>
                  <Heading style={styles.title}>{t("welcomeBack")}</Heading>
                  <ThemedText style={styles.subtitle}>
                    {t("signInToContinue")}
                  </ThemedText>

                  {/* Google Sign In */}
                  <TouchableOpacity
                    style={[
                      styles.googleBtn,
                      {
                        borderColor: theme.border,
                        flexDirection: "row",
                        gap: 10,
                        justifyContent: "center",
                      },
                    ]}
                    onPress={handleGoogleLogin}
                    disabled={loading}
                  >
                    <Chrome size={20} color={theme.textPrimary} />
                    <ThemedText style={styles.googleText}>
                      Sign in with Google
                    </ThemedText>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View
                      style={[styles.line, { backgroundColor: theme.border }]}
                    />
                    <ThemedText style={styles.orText}>{t("or")}</ThemedText>
                    <View
                      style={[styles.line, { backgroundColor: theme.border }]}
                    />
                  </View>

                  <View style={styles.form}>
                    <View style={styles.inputContainer}>
                      <Mail
                        size={20}
                        color={theme.textSecondary}
                        style={styles.icon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder={t("emailAddress")}
                        placeholderTextColor={theme.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordRef.current?.focus()}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Lock
                        size={20}
                        color={theme.textSecondary}
                        style={styles.icon}
                      />
                      <TextInput
                        ref={passwordRef}
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder={t("password")}
                        placeholderTextColor={theme.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        returnKeyType="go"
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color={theme.textSecondary} />
                        ) : (
                          <Eye size={20} color={theme.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {errorMessage && (
                      <View style={styles.errorBox}>
                        <AlertCircle size={16} color={theme.error} />
                        <ThemedText
                          style={[styles.errorText, { color: theme.error }]}
                        >
                          {errorMessage}
                        </ThemedText>
                      </View>
                    )}

                    <TouchableOpacity
                      style={{ alignSelf: "flex-end", marginBottom: 20 }}
                      onPress={() => setScreen("forgot-password")}
                    >
                      <ThemedText
                        style={{
                          color: theme.primary,
                          fontSize: 13,
                          fontWeight: "600",
                        }}
                      >
                        {t("forgotPassword")}?
                      </ThemedText>
                    </TouchableOpacity>

                    <Button
                      title={loading ? t("signingIn") : t("signIn")}
                      onPress={handleLogin}
                      loading={loading}
                    />

                    <View style={styles.footerRow}>
                      <ThemedText style={{ color: theme.textSecondary }}>
                        {t("dontHaveAccount")}
                      </ThemedText>
                      <TouchableOpacity onPress={() => router.push("/signup")}>
                        <ThemedText
                          style={[styles.link, { color: theme.primary }]}
                        >
                          {t("signUp")}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              ) : screen === "forgot-password" ? (
                <>
                  <Heading style={styles.title}>{t("resetPassword")}</Heading>
                  <ThemedText style={styles.subtitle}>
                    {t("enterEmailReset")}
                  </ThemedText>

                  <View style={styles.form}>
                    <View style={styles.inputContainer}>
                      <Mail
                        size={20}
                        color={theme.textSecondary}
                        style={styles.icon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.textPrimary }]}
                        placeholder={t("emailAddress")}
                        placeholderTextColor={theme.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>

                    {errorMessage && (
                      <View style={styles.errorBox}>
                        <AlertCircle size={16} color={theme.error} />
                        <ThemedText
                          style={[styles.errorText, { color: theme.error }]}
                        >
                          {errorMessage}
                        </ThemedText>
                      </View>
                    )}

                    <Button
                      title={loading ? "Sending..." : t("sendResetLink")}
                      onPress={handleForgotPassword}
                      loading={loading}
                    />

                    <TouchableOpacity
                      style={styles.backBtn}
                      onPress={() => setScreen("login")}
                    >
                      <ThemedText style={{ color: theme.textSecondary }}>
                        {t("backToSignIn")}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Mail size={32} color={theme.primary} />
                  </View>
                  <Heading style={styles.title}>{t("checkEmail")}</Heading>
                  <ThemedText
                    style={[styles.subtitle, { textAlign: "center" }]}
                  >
                    {t("resetLinkSent")} {email}
                  </ThemedText>

                  <Button
                    title={t("backToSignIn")}
                    onPress={() => setScreen("login")}
                    variant="secondary"
                  />
                </>
              )}
            </View>
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
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  logoText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
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
    gap: 16,
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.4,
  },
  form: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(100,100,100,0.05)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  eyeBtn: {
    padding: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
  },
  link: {
    fontWeight: "700",
  },
  backBtn: {
    alignItems: "center",
    marginTop: 20,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
});
