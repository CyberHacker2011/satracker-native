import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../context/ThemeContext';

export function BrandHeader() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/favicon.png')} 
        style={styles.logo}
        resizeMode="contain"
        borderRadius={50}
      />
      <ThemedText style={[styles.brandText, { color: theme.textPrimary }]}>SATracker</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    gap: 8,
  },
  logo: {
    width: 24,
    height: 24,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
