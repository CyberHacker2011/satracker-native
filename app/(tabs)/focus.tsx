import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import storage from "../../lib/storage";
import { playBeep, playSound } from "../../lib/audio";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import {
  Play,
  Pause,
  RefreshCw,
  Minus,
  Plus,
  Settings2,
  Clock,
  Coffee,
  ArrowRight,
} from "lucide-react-native";
import { ConfirmModal } from "../../components/ConfirmModal";

export default function FocusScreen() {
  const { theme, themeName } = useTheme();
  const { t } = useLanguage();
  const [focusMin, setFocusMin] = useState("25");
  const [breakMin, setBreakMin] = useState("5");
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const {
    timeLeft,
    isRunning,
    mode,
    start,
    toggle,
    reset,
    formatTime,
    setTimeLeft,
    setMode,
    setIsRunning,
  } = useStudyTimer({
    initialFocusMinutes: parseInt(focusMin) || 25,
    initialBreakMinutes: parseInt(breakMin) || 5,
    totalSessions: 99,
    onSessionComplete: () => {
      playBeep();
    },
    onAllSessionsComplete: () => {
      playSound();
    },
  });

  const [loading, setLoading] = useState(true);

  // Code removed: Widget Sync & Float Handler

  useEffect(() => {
    storage.getItem("classic_focus_state").then((saved) => {
      if (saved) {
        const state = JSON.parse(saved);
        setTimeLeft(state.timeLeft);
        setMode(state.mode || "idle");
        setFocusMin(state.focusMin || "25");
        setBreakMin(state.breakMin || "5");
        setIsRunning(state.isRunning || false);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    const save = async () => {
      const state = { timeLeft, mode, focusMin, breakMin, isRunning };
      await storage.setItem("classic_focus_state", JSON.stringify(state));
    };
    save();
  }, [timeLeft, mode, focusMin, breakMin, loading, isRunning]);

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRunning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1);
    }
  }, [isRunning]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.05], [1, 0.8]),
    borderColor: mode === "break" ? "#10b981" : theme.primary,
  }));

  const handleAdjust = (type: "focus" | "break", amount: number) => {
    if (isRunning) return;
    if (type === "focus") {
      const current = parseInt(focusMin) || 0;
      const next = Math.max(1, Math.min(720, current + amount));
      setFocusMin(next.toString());
      if (mode === "focus" || mode === "idle") setTimeLeft(next * 60);
    } else {
      const current = parseInt(breakMin) || 0;
      const next = Math.max(1, Math.min(120, current + amount));
      setBreakMin(next.toString());
      if (mode === "break") setTimeLeft(next * 60);
    }
  };

  const handleTextChange = (type: "focus" | "break", value: string) => {
    const val = value.replace(/[^0-9]/g, "");
    if (type === "focus") {
      setFocusMin(val);
      if ((mode === "focus" || mode === "idle") && val)
        setTimeLeft(parseInt(val) * 60);
    } else {
      setBreakMin(val);
      if (mode === "break" && val) setTimeLeft(parseInt(val) * 60);
    }
  };

  if (loading) return null;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.header,
              {
                flexDirection: "row",
                justifyContent: "center",
                gap: 12,
                marginBottom: 40,
              },
            ]}
          >
            <Heading style={{ fontSize: 24 }}>Focus Timer</Heading>
          </View>

          <View style={styles.mainLayout}>
            <View style={styles.timerSide}>
              <Animated.View style={[styles.timerCircle, animatedCircleStyle]}>
                <ThemedText
                  style={[
                    styles.modeLabel,
                    {
                      color:
                        mode === "focus"
                          ? theme.primary
                          : mode === "break"
                            ? "#10b981"
                            : theme.textSecondary,
                    },
                  ]}
                >
                  {mode === "idle"
                    ? "READY"
                    : mode === "focus"
                      ? "FOCUSING"
                      : "BREAK TIME"}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.timerValue,
                    {
                      fontSize:
                        (timeLeft || parseInt(focusMin) * 60) >= 3600 ? 54 : 72,
                    },
                  ]}
                >
                  {formatTime(timeLeft || parseInt(focusMin) * 60)}
                </ThemedText>
              </Animated.View>

              <View style={styles.controls}>
                <TouchableOpacity
                  style={[
                    styles.smallControlButton,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => setResetModalVisible(true)}
                >
                  <RefreshCw color={theme.textSecondary} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    {
                      backgroundColor: isRunning
                        ? theme.textPrimary
                        : theme.primary,
                    },
                  ]}
                  onPress={() => {
                    if (mode === "idle") {
                      start({
                        focus: parseInt(focusMin) || 25,
                        breakMin: parseInt(breakMin) || 5,
                        sessions: 99,
                      });
                    } else {
                      toggle();
                    }
                  }}
                >
                  {isRunning ? (
                    <Pause color={theme.textInverse} size={32} />
                  ) : (
                    <Play color="#fff" size={32} fill="#fff" />
                  )}
                </TouchableOpacity>

                <View style={[styles.smallControlButton, { opacity: 0 }]} />
              </View>
            </View>

            <View style={styles.configContainer}>
              <View
                style={[
                  styles.configCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.configRow}>
                  <View style={styles.configLabelCol}>
                    <ThemedText style={styles.configLabel}>
                      Focus Duration
                    </ThemedText>
                    <ThemedText style={styles.configSub}>
                      Minutes per session
                    </ThemedText>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { backgroundColor: theme.background },
                      ]}
                      onPress={() => handleAdjust("focus", -1)}
                      disabled={isRunning}
                    >
                      <Minus size={16} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.stepInput, { color: theme.textPrimary }]}
                      value={focusMin}
                      onChangeText={(v) => handleTextChange("focus", v)}
                      keyboardType="number-pad"
                      editable={!isRunning}
                    />
                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { backgroundColor: theme.background },
                      ]}
                      onPress={() => handleAdjust("focus", 1)}
                      disabled={isRunning}
                    >
                      <Plus size={16} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />

                <View style={styles.configRow}>
                  <View style={styles.configLabelCol}>
                    <ThemedText style={styles.configLabel}>
                      Break Duration
                    </ThemedText>
                    <ThemedText style={styles.configSub}>
                      Minutes between sets
                    </ThemedText>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { backgroundColor: theme.background },
                      ]}
                      onPress={() => handleAdjust("break", -1)}
                      disabled={isRunning}
                    >
                      <Minus size={16} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.stepInput, { color: theme.textPrimary }]}
                      value={breakMin}
                      onChangeText={(v) => handleTextChange("break", v)}
                      keyboardType="number-pad"
                      editable={!isRunning}
                    />
                    <TouchableOpacity
                      style={[
                        styles.stepBtn,
                        { backgroundColor: theme.background },
                      ]}
                      onPress={() => handleAdjust("break", 1)}
                      disabled={isRunning}
                    >
                      <Plus size={16} color={theme.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <ConfirmModal
        visible={resetModalVisible}
        title={t("resetTimer")}
        message={t("confirmReset")}
        onCancel={() => setResetModalVisible(false)}
        onConfirm={() => {
          reset();
          setResetModalVisible(false);
        }}
        confirmLabel={t("resetTimer")}
        isDestructive
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  mainLayout: {
    width: "100%",
    maxWidth: 500,
    alignItems: "center",
    gap: 40,
  },
  timerSide: {
    alignItems: "center",
    width: "100%",
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  iconBadge: {
    marginBottom: 16,
    opacity: 0.8,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 64,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 240,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  smallControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  configContainer: {
    width: "100%",
  },
  configCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  configRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  configLabelCol: {
    flex: 1,
  },
  configLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  configSub: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  stepInput: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 40,
  },
  divider: {
    height: 1,
    width: "100%",
  },
});
