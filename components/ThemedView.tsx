import React from "react";
import { View, ViewProps, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";

export function ThemedView({ style, ...props }: ViewProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[{ backgroundColor: theme.background }, style]}
      {...props}
    />
  );
}

export function Card({ style, children, ...props }: ViewProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: theme.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
