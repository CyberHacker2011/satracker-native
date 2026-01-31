import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemedText } from "./ThemedText";
import { getLocalDateString } from "../lib/dateUtils";
import * as Clipboard from "expo-clipboard";
import { getAssistantResponse } from "../services/ai";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Trash2, Bot, X, Send, Sparkles, ArrowDown } from "lucide-react-native";
import {
  Image,
  Alert,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const MarkdownText = ({ text, style }: { text: string; style: any }) => {
  if (!text) return null;

  // Basic markdown bold parsing
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={i} style={{ fontWeight: "bold" }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

interface StudyAssistantProps {
  variant?: "floating" | "fullscreen";
}

export const StudyAssistant = ({
  variant = "floating",
}: StudyAssistantProps) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(variant === "fullscreen");
  const CHAT_STORAGE_KEY = "sat_assistant_chat_v1";

  const [messages, setMessages] = useState<
    {
      role: "user" | "assistant";
      text: string;
      timestamp: number;
    }[]
  >([
    {
      role: "assistant",
      text:
        variant === "fullscreen"
          ? "Hello! I'm your SAT Study Assistant. How can I help you today? Ask about your plan or SAT topics."
          : "I'm here to help with your SAT prep. Ask me about today's tasks!",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const inputRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewHeight = useRef(0);
  const contentHeight = useRef(0);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory();
    }
    // Auto-scroll when messages change
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const json = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
      if (json) {
        const history = JSON.parse(json);
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        // Filter messages newer than 24h
        const activeMsgs = history.filter((m: any) => m.timestamp > cutoff);

        if (activeMsgs.length > 0) {
          setMessages(activeMsgs);
        }
      }
    } catch (e) {
      console.error("Failed to load chat history", e);
    }
  };

  const saveChatHistory = async () => {
    try {
      await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  };

  useEffect(() => {
    if (isOpen || variant === "fullscreen") {
      loadContext();
      // Scroll to bottom when opening
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [isOpen, variant]);

  const loadContext = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const today = getLocalDateString();

      const { data } = await supabase
        .from("study_plan")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (data && data.length > 0) {
        const planSummary = data
          .map((p: any) => `${p.start_time}: ${p.tasks_text} (${p.section})`)
          .join(". ");
        setContext(`Today's Plans: ${planSummary}`);
      } else {
        setContext("No sessions scheduled for today.");
      }
    } catch (e) {
      console.log("Assistant context load error", e);
    }
  };

  const handeSend = async () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userMsg,
        timestamp: Date.now(),
      },
    ]);

    setLoading(true);

    // Build simple chat history from messages (last 5 for context)
    const history = messages.slice(-5).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.text }],
    }));
    const response = await getAssistantResponse(context, userMsg, history);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: response, timestamp: Date.now() },
    ]);
    setLoading(false);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    setShowScrollDown(!isCloseToBottom);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setShowScrollDown(false);
  };

  if (variant === "floating" && !isOpen) {
    return (
      <TouchableOpacity
        style={[
          styles.floater,
          { backgroundColor: theme.primary, bottom: insets.bottom + 80 },
        ]}
        onPress={() => setIsOpen(true)}
      >
        <Bot color="#fff" size={28} />
      </TouchableOpacity>
    );
  }

  const containerStyle =
    variant === "floating"
      ? [
          styles.containerFloating,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            bottom: insets.bottom + 80,
          },
        ]
      : [styles.containerFull, { backgroundColor: theme.background }];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={containerStyle}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? (variant === "fullscreen" ? 100 : 0) : 0
      }
    >
      {variant === "floating" && (
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color={theme.primary} />
            <ThemedText style={{ fontWeight: "700" }}>SAT Assistant</ThemedText>
          </View>
          <TouchableOpacity onPress={() => setIsOpen(false)}>
            <X size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
      {variant === "fullscreen" && (
        <View
          style={[
            styles.header,
            {
              marginTop: insets.top,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Bot size={20} color={theme.primary} />
            <ThemedText style={{ fontSize: 18, fontWeight: "900" }}>
              Study Center
            </ThemedText>
          </View>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: theme.primary + "15",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
            onPress={async () => {
              const runDelete = async () => {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                const { data: plans } = await supabase
                  .from("study_plan")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("ai_generated", true);
                if (plans && plans.length > 0) {
                  const ids = plans.map((p) => p.id);
                  await supabase.from("daily_log").delete().in("plan_id", ids);
                  await supabase.from("study_plan").delete().in("id", ids);
                }
                const msg = "All AI plans deleted.";
                if (Platform.OS === "web") window.alert(msg);
                else Alert.alert("Success", msg);
              };

              if (Platform.OS === "web") {
                if (
                  window.confirm(
                    "Are you sure you want to delete all AI plans?",
                  )
                )
                  runDelete();
              } else {
                Alert.alert(
                  "Delete AI Plans?",
                  "This will remove all AI-generated tasks.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: runDelete,
                    },
                  ],
                );
              }
            }}
          >
            <Trash2 size={16} color={theme.primary} />
            <ThemedText
              style={{ fontSize: 12, color: theme.primary, fontWeight: "600" }}
            >
              Clear AI
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        ref={scrollRef}
        onContentSizeChange={() => {
          // If we want auto-scroll on new message
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              m.role === "user"
                ? { alignSelf: "flex-end", backgroundColor: theme.primary }
                : {
                    alignSelf: "flex-start",
                    backgroundColor:
                      variant === "floating" ? theme.background : theme.card,
                  },
            ]}
          >
            <MarkdownText
              style={{
                color: m.role === "user" ? "#fff" : theme.textPrimary,
                fontSize: 14,
                lineHeight: 20,
              }}
              text={m.text}
            />
          </View>
        ))}
        {loading && (
          <View
            style={{
              alignSelf: "flex-start",
              marginLeft: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                fontStyle: "italic",
              }}
            >
              AI is processing, it may take some time. Please be patient.
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {showScrollDown && (
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 140, // Above input area
            right: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.card,
            justifyContent: "center",
            alignItems: "center",
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            zIndex: 1000,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={scrollToBottom}
        >
          <ArrowDown size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      )}

      <View style={styles.hintsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
        >
          {[
            "Explain my plan",
            "Help with Math",
            "EBRW Tips",
            "Vocabulary Check",
          ].map((hint) => (
            <TouchableOpacity
              key={hint}
              style={[
                styles.hintChip,
                {
                  backgroundColor: theme.primary + "15",
                  borderColor: theme.primary + "30",
                },
              ]}
              onPress={() => setInput(hint)}
            >
              <ThemedText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.primary,
                }}
              >
                {hint}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          styles.inputArea,
          {
            borderTopColor: theme.border,
            backgroundColor: variant === "fullscreen" ? theme.card : undefined,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: theme.textPrimary,
              backgroundColor:
                variant === "floating" ? theme.background : theme.background,
            },
          ]}
          placeholder="Ask anything..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handeSend}
        />
        <TouchableOpacity
          onPress={handeSend}
          disabled={loading}
          style={styles.sendBtn}
        >
          <Send size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View
        style={{
          paddingBottom: 4,
          paddingTop: 2,
          alignItems: "center",
          backgroundColor:
            variant === "floating" ? theme.card : theme.background,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            color: theme.textSecondary,
            fontWeight: "300",
            opacity: 0.7,
          }}
        >
          Chats are saved locally for 24 hours.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  floater: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  containerFloating: {
    position: "absolute",
    right: 20,
    width: 320,
    height: 450,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    zIndex: 1000,
    overflow: "hidden",
  },
  containerFull: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  chatArea: {
    flex: 1,
  },
  bubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    padding: 8,
  },
  imageBtn: {
    padding: 8,
  },
  imagePreview: {
    position: "absolute",
    bottom: 70,
    left: 12,
    padding: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2000,
  },
  previewThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  removeImg: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  usageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  hintsRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  hintChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});
