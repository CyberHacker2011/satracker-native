import React from "react";
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacityProps 
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ 
  title, 
  loading, 
  variant = "primary", 
  style, 
  ...props 
}: ButtonProps) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case "danger": return "#ef4444";
      case "secondary": return theme.background;
      default: return theme.primary;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.button,
        { 
          backgroundColor: getBackgroundColor(),
          borderColor: variant === "secondary" ? theme.border : "transparent",
          borderWidth: variant === "secondary" ? 1 : 0,
        },
        style,
      ]}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={theme.textInverse} />
      ) : (
        <Text style={[
          styles.text, 
          { color: variant === "secondary" ? theme.textPrimary : theme.textInverse }
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  text: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
