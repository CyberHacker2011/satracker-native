import React from "react";
import { Modal, StyleSheet, View, TouchableOpacity, Linking, Platform } from "react-native";
import { ThemedText, Heading } from "./ThemedText";
import { Card } from "./ThemedView";
import { useTheme } from "../context/ThemeContext";
import { AlertTriangle, X, MessageSquare } from "lucide-react-native";

interface FeedbackErrorModalProps {
  visible: boolean;
  error: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function FeedbackErrorModal({ visible, error, onDismiss, onRetry }: FeedbackErrorModalProps) {
  const { theme } = useTheme();

  const handleFeedback = () => {
    const subject = encodeURIComponent("App Error Report");
    const body = encodeURIComponent(`I encountered the following error:\n\n${error}\n\nDevice: ${Platform.OS}`);
    Linking.openURL(`mailto:ibrohimshaymardanov011@gmail.com?subject=${subject}&body=${body}`);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Card style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.header}>
                <View style={[styles.iconBadge, { backgroundColor: '#fee2e2' }]}>
                    <AlertTriangle color="#ef4444" size={24} />
                </View>
                <TouchableOpacity onPress={onDismiss}>
                    <X color={theme.textSecondary} size={24} />
                </TouchableOpacity>
            </View>

            <Heading style={styles.title}>Something went wrong</Heading>
            <ThemedText style={styles.message}>
                {error || "An unexpected error occurred."}
            </ThemedText>

            <View style={styles.actions}>
                {onRetry ? (
                    <TouchableOpacity 
                        style={[styles.dismissBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                        onPress={() => {
                            onDismiss();
                            onRetry();
                        }}
                    >
                        <ThemedText style={{ fontWeight: '800', color: '#fff' }}>Try Again</ThemedText>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.dismissBtn, { borderColor: theme.border }]}
                        onPress={onDismiss}
                    >
                        <ThemedText style={{ fontWeight: '700', color: theme.textSecondary }}>Dismiss</ThemedText>
                    </TouchableOpacity>
                )}
                <TouchableOpacity 
                    style={[styles.feedbackBtn, { backgroundColor: onRetry ? theme.card : theme.primary, borderColor: theme.border, borderWidth: onRetry ? 1 : 0 }]}
                    onPress={handleFeedback}
                >
                    <MessageSquare color={onRetry ? theme.textPrimary : "#fff"} size={16} />
                    <ThemedText style={{ fontWeight: '800', color: onRetry ? theme.textPrimary : '#fff' }}>Report</ThemedText>
                </TouchableOpacity>
            </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
  },
  iconBadge: {
      width: 48,
      height: 48,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
  },
  title: {
      fontSize: 20,
      marginBottom: 8,
  },
  message: {
      fontSize: 14,
      opacity: 0.8,
      lineHeight: 20,
      marginBottom: 24,
  },
  actions: {
      flexDirection: 'row',
      gap: 12,
  },
  dismissBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  feedbackBtn: {
      flex: 2,
      height: 48,
      borderRadius: 14,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      alignItems: 'center',
  }
});
