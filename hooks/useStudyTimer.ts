import { useState, useEffect, useRef, useCallback } from "react";

export type TimerMode = "idle" | "focus" | "break";

interface StudyTimerProps {
  initialFocusMinutes: number;
  initialBreakMinutes: number;
  totalSessions: number;
  onSessionComplete?: () => void;
  onAllSessionsComplete?: () => void;
}

export function useStudyTimer({
  initialFocusMinutes: focus,
  initialBreakMinutes: breakMin,
  totalSessions: sessions,
  onSessionComplete,
  onAllSessionsComplete,
}: StudyTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>("idle");
  const [currentSession, setCurrentSession] = useState(1);
  
  // Dynamic settings that can be updated from parent
  const [settings, setSettings] = useState({ focus, breakMin, sessions });

  const lastTimeRef = useRef<number | null>(null);

  const handleTransition = useCallback(() => {
    if (mode === "focus") {
      if (currentSession < settings.sessions) {
        setMode("break");
        setTimeLeft(settings.breakMin * 60);
        onSessionComplete?.();
      } else {
        setMode("idle");
        setIsRunning(false);
        onAllSessionsComplete?.();
      }
    } else if (mode === "break") {
      setMode("focus");
      setCurrentSession((prev) => prev + 1);
      setTimeLeft(settings.focus * 60);
    }
  }, [mode, currentSession, settings, onSessionComplete, onAllSessionsComplete]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      lastTimeRef.current = Date.now();
      interval = setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - (lastTimeRef.current || now)) / 1000);
        
        if (delta >= 1) {
          setTimeLeft((prev) => Math.max(0, prev - delta));
          lastTimeRef.current = now;
        }
      }, 500);
    } else if (timeLeft === 0 && isRunning) {
      handleTransition();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleTransition]);

  const start = (newSettings?: { focus: number; breakMin: number; sessions: number }) => {
    const s = newSettings || settings;
    if (newSettings) setSettings(newSettings);
    setMode("focus");
    setTimeLeft(s.focus * 60);
    setIsRunning(true);
    setCurrentSession(1);
  };

  const toggle = () => setIsRunning(!isRunning);
  
  const reset = (toMode: TimerMode = "idle") => {
    setIsRunning(false);
    setTimeLeft(settings.focus * 60);
    setMode(toMode);
    setCurrentSession(1);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${sec < 10 ? "0" : ""}${sec}`;
    }
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return {
    timeLeft,
    isRunning,
    mode,
    currentSession,
    settings,
    setSettings,
    start,
    toggle,
    reset,
    setTimeLeft,
    setCurrentSession,
    setMode,
    setIsRunning,
    formatTime
  };
}
