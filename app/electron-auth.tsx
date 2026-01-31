import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "../lib/supabase";
import { ThemedText } from "../components/ThemedText";

export default function ElectronAuth() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [status, setStatus] = useState("Checking login status...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("No handshake ID provided.");
      return;
    }

    const processLogin = async () => {
      // 1. Check if user is already logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setStatus("Logged in! Syncing to desktop app...");

        // 2. User is logged in, update the handshake
        const { error: updateError } = await supabase
          .from("auth_handshakes")
          .update({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
          .eq("id", id);

        if (updateError) {
          setError("Failed to sync: " + updateError.message);
        } else {
          setStatus("Success! You can close this window now.");
          // Optional: window.close()
        }
      } else {
        setStatus("Redirecting to Google...");
        // 3. User not logged in, trigger OAuth
        // The redirectTo URL must bring them back here with the ID
        // Supabase preserves query params on redirect usually, but let's be explicit
        const redirectUrl = window.location.href; // Includes ?id=...

        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });

        if (signInError) {
          setError("Sign in failed: " + signInError.message);
        }
      }
    };

    processLogin();
  }, [id]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      {error ? (
        <Text style={{ color: "red", fontSize: 16, textAlign: "center" }}>
          {error}
        </Text>
      ) : (
        <>
          <ActivityIndicator
            size="large"
            color="#0000ff"
            style={{ marginBottom: 20 }}
          />
          <ThemedText style={{ fontSize: 18, textAlign: "center" }}>
            {status}
          </ThemedText>
          <ThemedText style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
            ID: {id}
          </ThemedText>
        </>
      )}
    </View>
  );
}
