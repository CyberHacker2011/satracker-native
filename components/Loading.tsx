import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemedText } from "./ThemedText";

export function Loading({ message = "Loading..." }: { message?: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={styles.text}>{message}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.5,
  },
});
