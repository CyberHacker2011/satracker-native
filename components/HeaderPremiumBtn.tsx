import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { ShoppingCart, Star } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { usePremium } from "../hooks/usePremium";

export function HeaderPremiumBtn() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isPremium } = usePremium();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={() => router.push("/premium")}
    >
      {isPremium ? (
        <Star size={22} color="#f59e0b" fill="#f59e0b" />
      ) : (
        <ShoppingCart size={22} color={theme.textPrimary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
