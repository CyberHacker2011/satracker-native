import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Dimensions, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
  visible: boolean;
  children: React.ReactNode;
  onDismiss: () => void;
  type?: 'error' | 'success' | 'info';
  duration?: number;
}

export function Toast({ 
  visible, 
  children, 
  onDismiss, 
  type = 'error', 
  duration = 7000 
}: ToastProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={18} color="#22c55e" />;
      case 'info': return <Info size={18} color={theme.primary} />;
      default: return <AlertCircle size={18} color="#ef4444" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success': return '#22c55e40';
      case 'info': return `${theme.primary}40`;
      default: return '#ef444440';
    }
  };

  const getBgColor = () => {
    // Semi-transparent background for glassmorphism effect
    return theme.card + 'F0'; 
  };

  return (
    <Animated.View 
      entering={FadeInUp.springify().damping(15)}
      exiting={FadeOutUp}
      style={[
        styles.container, 
        { 
          top: insets.top + 10,
          backgroundColor: getBgColor(),
          borderColor: getBorderColor(),
          shadowColor: '#000',
        }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        <View style={styles.textContainer}>
          {typeof children === 'string' ? (
            <ThemedText style={styles.message}>{children}</ThemedText>
          ) : (
            children
          )}
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
          <X size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    width: width * 0.85,
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    zIndex: 1000,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
  }
});
