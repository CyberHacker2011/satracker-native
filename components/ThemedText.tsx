import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

export function ThemedText({ style, ...props }: TextProps) {
  const { theme } = useTheme();
  return (
    <Text
      style={[{ color: theme.textPrimary, fontFamily: "System" }, style]}
      {...props}
    />
  );
}

export function Heading({ style, ...props }: TextProps) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          color: theme.textPrimary,
          fontSize: 24,
          fontWeight: "900",
          letterSpacing: -0.5,
        },
        style,
      ]}
      {...props}
    />
  );
}
