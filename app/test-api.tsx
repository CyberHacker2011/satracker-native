import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import { ThemedText, Heading } from "../components/ThemedText";
import { ThemedView, Card } from "../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Play, Check, X } from "lucide-react-native";

export default function TestAPIScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const testAPI = async (endpoint: string, requiresAuth: boolean = true) => {
    setLoading(endpoint);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (requiresAuth) {
        const cronSecret =
          "4f18426e26ac997e625ffe51f196474a5d36ee2507f02c821d7c4fbe878303f9cda4045cae606000c84d2bbdd5cc05ae0e067c20f2d2efa2d84c1b645dsf82fc97cb255ce32284c58ecb3efc3a7a5102";
        headers["Authorization"] = `Bearer ${cronSecret}`;
      }

      // Detect if we are running on localhost
      const isLocalhost =
        typeof window !== "undefined" &&
        window.location.hostname === "localhost";
      const baseUrl = isLocalhost
        ? "http://localhost:3000"
        : "https://app.satracker.uz";

      const targetUrl = `${baseUrl}/api/${endpoint}`;
      console.log(`Testing API: ${targetUrl}`);

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = {
          error: "Non-JSON response received",
          status: response.status,
          statusText: response.statusText,
          url: targetUrl,
          raw: text.substring(0, 500),
        };
      }

      setResults((prev) => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          success: response.ok,
          data,
        },
      }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [endpoint]: {
          status: 0,
          success: false,
          error: error.message,
        },
      }));
    } finally {
      setLoading(null);
    }
  };

  const apis = [
    {
      name: "Dispatch Notifications",
      endpoint: "dispatch_notifications",
      auth: true,
      description: "Send study plan notifications and emails",
    },
    {
      name: "Check Premium Expiry",
      endpoint: "check_premium_expiry",
      auth: true,
      description: "Expire and warn premium users",
    },
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <ChevronLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>API Tester (Web Only)</Heading>
          <ThemedText style={styles.subtitle}>Test cron job APIs</ThemedText>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {apis.map((api) => {
            const result = results[api.endpoint];
            const isLoading = loading === api.endpoint;

            return (
              <Card key={api.endpoint} style={styles.apiCard}>
                <View style={styles.apiHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.apiName}>{api.name}</ThemedText>
                    <ThemedText style={styles.apiDescription}>
                      {api.description}
                    </ThemedText>
                    <ThemedText style={styles.apiEndpoint}>
                      POST /api/{api.endpoint}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.testButton,
                      { backgroundColor: theme.primary },
                      isLoading && { opacity: 0.6 },
                    ]}
                    onPress={() => testAPI(api.endpoint, api.auth)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Play size={20} color="#fff" fill="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {result && (
                  <View
                    style={[
                      styles.resultBox,
                      {
                        backgroundColor: result.success
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                        borderColor: result.success ? "#10b981" : "#ef4444",
                      },
                    ]}
                  >
                    <View style={styles.resultHeader}>
                      {result.success ? (
                        <Check size={20} color="#10b981" />
                      ) : (
                        <X size={20} color="#ef4444" />
                      )}
                      <ThemedText
                        style={[
                          styles.resultStatus,
                          { color: result.success ? "#10b981" : "#ef4444" },
                        ]}
                      >
                        {result.status} {result.success ? "Success" : "Failed"}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.resultData}>
                      {JSON.stringify(result.data || result.error, null, 2)}
                    </ThemedText>
                  </View>
                )}
              </Card>
            );
          })}

          <Card
            style={[styles.infoBox, { backgroundColor: theme.primaryLight }]}
          >
            <ThemedText style={styles.infoText}>
              ⚠️ These APIs only work on **web builds**, not in dev mode.
              {"\n\n"}
              To test properly:
              {"\n"}1. Run `pnpm build:web`
              {"\n"}2. Run `pnpm desktop` or deploy to production
            </ThemedText>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  apiCard: {
    padding: 16,
    gap: 12,
  },
  apiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  apiName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  apiDescription: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 4,
  },
  apiEndpoint: {
    fontSize: 11,
    fontFamily: "monospace",
    opacity: 0.5,
  },
  testButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resultBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: "700",
  },
  resultData: {
    fontSize: 11,
    fontFamily: "monospace",
    opacity: 0.8,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
