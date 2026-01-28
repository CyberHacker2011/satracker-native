import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { Lock, Crown, Calendar, User, CheckCircle } from "lucide-react-native";

const ADMIN_PASSWORD = "Hech_qaysi_1";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  is_premium: boolean;
  premium_expires_at: string | null;
  subscription_type: string | null;
}

export default function AdminPremiumPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customMonths, setCustomMonths] = useState<{ [key: string]: string }>(
    {},
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      // Get all user profiles using admin function (bypasses RLS)
      const { data: profiles, error: profileError } = await supabase.rpc(
        "get_all_user_profiles",
      );

      if (profileError) {
        console.error("Profile error:", profileError);
        throw profileError;
      }

      // Map profiles to user list
      const userList: UserProfile[] = (profiles || []).map((profile: any) => ({
        id: profile.user_id,
        email: profile.email || "No email",
        name: profile.name || "User",
        is_premium: profile.is_premium || false,
        premium_expires_at: profile.premium_expires_at || null,
        subscription_type: profile.subscription_type || null,
      }));

      setUsers(userList);
    } catch (error: any) {
      console.error("Load error:", error);
      setError(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const grantPremium = async (
    userId: string,
    userName: string,
    months: 1 | 3,
  ) => {
    const confirmMessage = `Grant ${months} month${months > 1 ? "s" : ""} premium to ${userName}?`;

    const confirmed =
      Platform.OS === "web"
        ? window.confirm(confirmMessage)
        : await new Promise((resolve) => {
            Alert.alert("Confirm Premium Grant", confirmMessage, [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              { text: "Yes", onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) return;

    try {
      // Use admin function to grant premium (bypasses RLS)
      const { error } = await supabase.rpc("admin_grant_premium", {
        target_user_id: userId,
        months: months,
      });

      if (error) throw error;

      const successMsg = `Premium granted for ${months} month${months > 1 ? "s" : ""}!`;
      if (Platform.OS === "web") {
        alert(successMsg);
      } else {
        Alert.alert("Success", successMsg);
      }

      loadUsers(); // Refresh list
    } catch (error: any) {
      const errorMsg = error.message || "Failed to grant premium";
      if (Platform.OS === "web") {
        alert("Error: " + errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
    }
  };

  const expandPremium = async (userId: string, userName: string) => {
    const months = customMonths[userId];
    if (!months || isNaN(parseInt(months)) || parseInt(months) <= 0) {
      const errorMsg = "Please enter a valid number of months";
      if (Platform.OS === "web") alert(errorMsg);
      else Alert.alert("Error", errorMsg);
      return;
    }

    const monthsNum = parseInt(months);
    const confirmMessage = `Expand premium by ${monthsNum} month${monthsNum > 1 ? "s" : ""} for ${userName}?`;

    const confirmed =
      Platform.OS === "web"
        ? window.confirm(confirmMessage)
        : await new Promise((resolve) => {
            Alert.alert("Confirm Expansion", confirmMessage, [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              { text: "Yes", onPress: () => resolve(true) },
            ]);
          });

    if (!confirmed) return;

    try {
      // Find the user to get their current expiry
      const user = users.find((u) => u.id === userId);

      // Calculate new expiry date by adding months to current expiry or today
      let newExpiryDate: Date;
      if (user?.is_premium && user?.premium_expires_at) {
        // User has existing premium - extend from current expiry
        const currentExpiry = new Date(user.premium_expires_at);
        newExpiryDate = new Date(currentExpiry);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsNum);
      } else {
        // User has no premium - start from today
        newExpiryDate = new Date();
        newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsNum);
      }

      // Update database directly with calculated expiry
      const { error } = await supabase
        .from("user_profiles")
        .update({
          is_premium: true,
          premium_expires_at: newExpiryDate.toISOString(),
          subscription_type: monthsNum >= 3 ? "quarterly" : "monthly",
        })
        .eq("user_id", userId);

      if (error) throw error;

      const successMsg = `Premium expanded by ${monthsNum} month${monthsNum > 1 ? "s" : ""}!`;
      if (Platform.OS === "web") alert(successMsg);
      else Alert.alert("Success", successMsg);

      setCustomMonths({ ...customMonths, [userId]: "" });
      loadUsers();
    } catch (error: any) {
      const errorMsg = error.message || "Failed to expand premium";
      if (Platform.OS === "web") alert("Error: " + errorMsg);
      else Alert.alert("Error", errorMsg);
    }
  };

  const revokePremium = async (userId: string, userName: string) => {
    const confirmMessage = `Revoke premium from ${userName}?`;

    const confirmed =
      Platform.OS === "web"
        ? window.confirm(confirmMessage)
        : await new Promise((resolve) => {
            Alert.alert("Confirm Revoke", confirmMessage, [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Yes",
                style: "destructive",
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    try {
      // Direct update instead of RPC for revoke
      const { error } = await supabase
        .from("user_profiles")
        .update({
          is_premium: false,
          premium_expires_at: null,
          subscription_type: null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      const successMsg = `Premium revoked from ${userName}`;
      if (Platform.OS === "web") alert(successMsg);
      else Alert.alert("Success", successMsg);

      loadUsers();
    } catch (error: any) {
      const errorMsg = error.message || "Failed to revoke premium";
      if (Platform.OS === "web") alert("Error: " + errorMsg);
      else Alert.alert("Error", errorMsg);
    }
  };

  if (!isAuthenticated) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={[
              styles.loginCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={[styles.lockIcon, { backgroundColor: theme.primary }]}>
              <Lock size={32} color="#fff" />
            </View>
            <Heading style={styles.loginTitle}>Admin Access</Heading>
            <ThemedText style={styles.loginSubtitle}>
              Enter admin password
            </ThemedText>

            <TextInput
              style={[
                styles.passwordInput,
                {
                  backgroundColor: theme.background,
                  borderColor: error ? "#ef4444" : theme.border,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError("");
              }}
              onSubmitEditing={handleLogin}
            />

            {error ? (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            ) : null}

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.primary }]}
              onPress={handleLogin}
            >
              <ThemedText style={styles.loginButtonText}>
                Access Admin Panel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Crown size={32} color={theme.primary} />
            <Heading style={styles.title}>Premium Management</Heading>
            <ThemedText style={styles.subtitle}>
              Grant premium subscriptions to users
            </ThemedText>
          </View>

          {error ? (
            <Card style={styles.errorCard}>
              <ThemedText style={{ color: "#ef4444", fontWeight: "700" }}>
                {error}
              </ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={loadUsers}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "900" }}>
                  Retry
                </ThemedText>
              </TouchableOpacity>
            </Card>
          ) : null}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText style={{ marginTop: 12, opacity: 0.5 }}>
                Loading users...
              </ThemedText>
            </View>
          ) : (
            <View style={styles.usersList}>
              {users.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <ThemedText style={{ opacity: 0.5 }}>
                    No users found
                  </ThemedText>
                </Card>
              ) : (
                users.map((user) => (
                  <Card key={user.id} style={styles.userCard}>
                    <View style={styles.userInfo}>
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: theme.primaryLight },
                        ]}
                      >
                        <User size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.userName}>
                          {user.name}
                        </ThemedText>
                        <ThemedText style={styles.userEmail}>
                          {user.email}
                        </ThemedText>
                        <ThemedText style={styles.userId}>{user.id}</ThemedText>
                        {user.is_premium && user.premium_expires_at ? (
                          <View style={styles.premiumBadge}>
                            <CheckCircle size={12} color="#10b981" />
                            <ThemedText style={styles.premiumText}>
                              Premium until{" "}
                              {new Date(
                                user.premium_expires_at,
                              ).toLocaleDateString()}
                            </ThemedText>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: theme.primaryLight,
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() =>
                          grantPremium(user.id, user.name || user.email, 1)
                        }
                      >
                        <Calendar size={16} color={theme.primary} />
                        <ThemedText
                          style={[
                            styles.actionButtonText,
                            { color: theme.primary },
                          ]}
                        >
                          1 Month
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.primaryAction,
                          { backgroundColor: theme.primary },
                        ]}
                        onPress={() =>
                          grantPremium(user.id, user.name || user.email, 3)
                        }
                      >
                        <Calendar size={16} color="#fff" />
                        <ThemedText
                          style={[styles.actionButtonText, { color: "#fff" }]}
                        >
                          3 Months
                        </ThemedText>
                      </TouchableOpacity>

                      {user.is_premium && (
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            {
                              backgroundColor: "#ef4444",
                              borderColor: "#ef4444",
                            },
                          ]}
                          onPress={() =>
                            revokePremium(user.id, user.name || user.email)
                          }
                        >
                          <Lock size={16} color="#fff" />
                          <ThemedText
                            style={[styles.actionButtonText, { color: "#fff" }]}
                          >
                            Revoke
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.customMonthsContainer}>
                      <TextInput
                        style={[
                          styles.customInput,
                          {
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                          },
                        ]}
                        placeholder="Enter months"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="numeric"
                        value={customMonths[user.id] || ""}
                        onChangeText={(text) =>
                          setCustomMonths({ ...customMonths, [user.id]: text })
                        }
                      />
                      <TouchableOpacity
                        style={[
                          styles.expandButton,
                          { backgroundColor: theme.primary },
                        ]}
                        onPress={() =>
                          expandPremium(user.id, user.name || user.email)
                        }
                      >
                        <ThemedText
                          style={[styles.actionButtonText, { color: "#fff" }]}
                        >
                          Expand
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  loginCard: {
    width: "100%",
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 24,
  },
  passwordInput: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  loginButton: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  errorCard: {
    padding: 20,
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyCard: {
    padding: 40,
    alignItems: "center",
  },
  usersList: {
    gap: 16,
  },
  userCard: {
    padding: 20,
    gap: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: "700",
    marginBottom: 2,
  },
  userId: {
    fontSize: 10,
    opacity: 0.3,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#10b981",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  primaryAction: {
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  customMonthsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
  },
  expandButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
