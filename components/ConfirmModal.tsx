import React from "react";
import { Modal, View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemedText, Heading } from "./ThemedText";
import { Button } from "./Button";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  isDestructive?: boolean;
  // For 3-button checks (like Quit logic in Study Room)
  onAlternative?: () => void;
  alternativeLabel?: string;
}

export function ConfirmModal({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  isDestructive = false,
  onAlternative,
  alternativeLabel
}: ConfirmModalProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Heading style={styles.title}>{title}</Heading>
          <ThemedText style={styles.message}>{message}</ThemedText>

          <View style={styles.actions}>
            {onAlternative && alternativeLabel && (
              <Button
                title={alternativeLabel}
                variant="primary"
                onPress={onAlternative}
                style={[styles.btn, { flex: 1, backgroundColor: theme.primary }]}
              />
            )}
            
            {onConfirm && (
                <Button
                    title={confirmLabel}
                    variant={isDestructive ? "danger" : "primary"}
                    onPress={onConfirm}
                    style={[styles.btn, { flex: 1 }]}
                />
            )}
          </View>
          
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
             <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    flexDirection: "column",
    gap: 12,
  },
  btn: {
     height: 50,
     paddingVertical: 0,
  },
  cancelBtn: {
      marginTop: 16,
      padding: 8,
  },
  cancelText: {
      fontWeight: '700',
      opacity: 0.5,
  }
});
