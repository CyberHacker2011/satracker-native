import React from "react";
import { TouchableOpacity, StyleSheet, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ShoppingCart, Star } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { usePremium } from "../hooks/usePremium";
import { ThemedText } from "./ThemedText";

export function HeaderPremiumBtn() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { isPremium, loading } = usePremium();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      onPress={() => router.push("/premium")}
      style={styles.container}
    >
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: isPremium ? '#FFD700' : theme.primaryLight, 
          borderColor: isPremium ? '#FFD700' : theme.primary 
        }
      ]}>
        {isPremium ? (
          <Star size={18} color="#fff" fill="#fff" />
        ) : (
          <ShoppingCart size={18} color={theme.primary} />
        )}
      </View>
      {!isPremium && (
        <ThemedText style={[styles.text, { color: theme.primary }]}>
          {t('getPremium')}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '900',
  },
});
