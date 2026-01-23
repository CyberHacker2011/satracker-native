import React, { useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, TextInput, ScrollView, Alert } from "react-native";
import { Platform } from "react-native";
import storage from "../../lib/storage";
import { playBeep, playSound } from "../../lib/audio";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, Easing } from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { ThemedText, Heading } from "../../components/ThemedText";
import { ThemedView, Card } from "../../components/ThemedView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudyTimer } from "../../hooks/useStudyTimer";
import { Play, Pause, RefreshCw, Minus, Plus, Settings2 } from "lucide-react-native";
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
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getItem("classic_focus_state").then(saved => {
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
                withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
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

  const handleAdjust = (type: 'focus' | 'break', amount: number) => {
    if (isRunning) return;
    if (type === 'focus') {
        const current = parseInt(focusMin) || 0;
        const next = Math.max(1, Math.min(720, current + amount));
        setFocusMin(next.toString());
        if (mode === 'focus' || mode === 'idle') setTimeLeft(next * 60);
    } else {
        const current = parseInt(breakMin) || 0;
        const next = Math.max(1, Math.min(120, current + amount));
        setBreakMin(next.toString());
        if (mode === 'break') setTimeLeft(next * 60);
    }
  };

  const handleTextChange = (type: 'focus' | 'break', value: string) => {
      const val = value.replace(/[^0-9]/g, '');
      if (type === 'focus') {
          setFocusMin(val);
          if ((mode === 'focus' || mode === 'idle') && val) setTimeLeft(parseInt(val) * 60);
      } else {
          setBreakMin(val);
          if (mode === 'break' && val) setTimeLeft(parseInt(val) * 60);
      }
  };

  const getProgress = () => {
    if (mode === 'idle') return 0;
    const fMin = parseInt(focusMin) || 1;
    const bMin = parseInt(breakMin) || 1;
    let ratio = 0;
    if (mode === 'focus') {
        ratio = (fMin * 60 - timeLeft) / (fMin * 60);
    } else {
        ratio = (bMin * 60 - timeLeft) / (bMin * 60);
    }
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  };

  if (loading) return null;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
              <Heading>{t('classicPomodoro')}</Heading>
              <ThemedText style={styles.subtitle}>{t('focusSub')}</ThemedText>
          </View>

          <View style={styles.globalProgressBox}>
              <View style={styles.progressLabelRow}>
                  <ThemedText style={styles.progressNote}>{t('focusProgress')}</ThemedText>
                  <ThemedText style={[styles.progressPct, { color: mode === 'break' ? '#10b981' : theme.primary }]}>
                    {getProgress()}%
                  </ThemedText>
              </View>
              <View style={[styles.barContainer, { backgroundColor: theme.card }]}>
                  <View style={[styles.barFill, { 
                    width: `${getProgress()}%`, 
                    backgroundColor: mode === 'break' ? '#10b981' : theme.primary 
                  }]} />
              </View>
          </View>

          <View style={styles.mainLayout}>
              <View style={styles.timerSide}>
                  <Animated.View style={[styles.timerCircle, animatedCircleStyle]}>
                      <ThemedText style={[styles.modeLabel, { color: mode === "focus" ? theme.primary : mode === "break" ? "#10b981" : theme.textSecondary }]}>
                          {mode === "idle" ? t('ready') : mode === "focus" ? t('focusing') : t('breaking')}
                      </ThemedText>
                      <ThemedText style={[styles.timerValue, { fontSize: (timeLeft || parseInt(focusMin) * 60) >= 3600 ? 54 : 72 }]}>
                          {formatTime(timeLeft || (parseInt(focusMin) * 60))}
                      </ThemedText>
                  </Animated.View>

                  <View style={styles.controls}>
                    <TouchableOpacity 
                        style={[styles.controlButton, { backgroundColor: isRunning ? theme.textPrimary : theme.primary }]}
                        onPress={() => {
                            if (mode === "idle") {
                                start({ focus: parseInt(focusMin) || 25, breakMin: parseInt(breakMin) || 5, sessions: 99 });
                            } else {
                                toggle();
                            }
                        }}
                    >
                        {isRunning ? <Pause color={theme.textInverse} size={32} /> : <Play color={theme.textInverse} size={32} />}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.smallControlButton, { backgroundColor: theme.card }]}
                        onPress={() => setResetModalVisible(true)}
                    >
                        <RefreshCw color={theme.textPrimary} size={24} />
                    </TouchableOpacity>
                  </View>
              </View>


                  <Card style={[styles.configCard, { marginTop: 24 }]}>
                      <View style={styles.configHeader}>
                          <Settings2 size={18} color={theme.primary} />
                          <ThemedText style={styles.configTitle}>{t('adjustSessions')}</ThemedText>
                      </View>

                      <View style={styles.adjustRow}>
                          <View style={styles.adjustItem}>
                              <ThemedText style={styles.adjustLabel}>{t('focusDuration')}</ThemedText>
                              <View style={styles.stepper}>
                                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjust('focus', -1)} disabled={isRunning}>
                                      <Minus size={20} color={theme.textPrimary} />
                                  </TouchableOpacity>
                                  <TextInput 
                                    style={[styles.stepInput, { color: theme.textPrimary }]} 
                                    value={focusMin}
                                    onChangeText={(v) => handleTextChange('focus', v)}
                                    keyboardType="number-pad"
                                    editable={!isRunning}
                                  />
                                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjust('focus', 1)} disabled={isRunning}>
                                      <Plus size={20} color={theme.textPrimary} />
                                  </TouchableOpacity>
                              </View>
                          </View>

                          <View style={styles.adjustItem}>
                              <ThemedText style={styles.adjustLabel}>{t('breakDuration')}</ThemedText>
                              <View style={styles.stepper}>
                                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjust('break', -1)} disabled={isRunning}>
                                      <Minus size={20} color={theme.textPrimary} />
                                  </TouchableOpacity>
                                  <TextInput 
                                    style={[styles.stepInput, { color: theme.textPrimary }]} 
                                    value={breakMin}
                                    onChangeText={(v) => handleTextChange('break', v)}
                                    keyboardType="number-pad"
                                    editable={!isRunning}
                                  />
                                  <TouchableOpacity style={styles.stepBtn} onPress={() => handleAdjust('break', 1)} disabled={isRunning}>
                                      <Plus size={20} color={theme.textPrimary} />
                                  </TouchableOpacity>
                              </View>
                          </View>
                      </View>

                      <ThemedText style={styles.configTip}>
                          You can type numbers or use +/- while paused.
                      </ThemedText>
                  </Card>
              </View>
        </ScrollView>
      </SafeAreaView>
      
      <ConfirmModal 
        visible={resetModalVisible}
        title={t('resetTimer')}
        message={t('confirmReset')}
        onCancel={() => setResetModalVisible(false)}
        onConfirm={() => {
            reset();
            setResetModalVisible(false);
        }}
        confirmLabel={t('resetTimer')}
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
  subtitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4,
    opacity: 0.4,
    marginTop: 8,
    textTransform: "uppercase",
  },
  mainLayout: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 40,
      width: '100%',
  },
  timerSide: {
      alignItems: 'center',
  },
  timerCircle: {
      width: 320,
      height: 320,
      borderRadius: 160,
      borderWidth: 8,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 30,
      backgroundColor: 'rgba(0,0,0,0.02)',
  },
  modeLabel: {
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 3,
      marginBottom: 10,
  },
  timerValue: {
      fontSize: 82,
      fontWeight: "900",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  smallControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  configSide: {
      flex: 1,
      minWidth: 320,
      maxWidth: 400,
  },
  configCard: {
      padding: 24,
  },
  configHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 24,
  },
  configTitle: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1,
      opacity: 0.5,
  },
  adjustItem: {
      marginBottom: 24,
  },
  adjustLabel: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 12,
      opacity: 0.6,
  },
  stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(0,0,0,0.03)',
      borderRadius: 16,
      padding: 6,
  },
  stepBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
  },
  stepInput: {
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'center',
      minWidth: 60,
  },
  configTip: {
      fontSize: 12,
      opacity: 0.4,
      fontStyle: 'italic',
      marginTop: 10,
      textAlign: 'center',
  },
  adjustRow: {
      marginBottom: 10,
  },
  globalProgressBox: {
      width: '100%',
      marginBottom: 30,
      maxWidth: 600,
  },
  progressLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
  },
  progressNote: {
      fontSize: 10,
      fontWeight: '900',
      opacity: 0.3,
  },
  progressPct: {
      fontSize: 12,
      fontWeight: '900',
  },
  barContainer: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
  },
  barFill: {
      height: '100%',
      borderRadius: 4,
  }
});
