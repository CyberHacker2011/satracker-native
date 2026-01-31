import { UserOnboardingData, StudyPlan } from "../types/plan";

// Backend AI configuration
const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";
if (!API_KEY) {
  console.warn(
    "EXPO_PUBLIC_OPENROUTER_API_KEY is missing! AI features will fail.",
  );
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_NAME = "deepseek/deepseek-r1-0528:free";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const openRouterFetch = async (messages: any[], model = MODEL_NAME) => {
  try {
    console.log("Starting OpenRouter Fetch...");
    console.log("Model:", model);
    // Mask key for safety log
    console.log("API Key present:", !!API_KEY);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 20s timeout

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://app.satracker.uz", // Required by OpenRouter free tier
        "X-Title": "SATracker", // Required by OpenRouter free tier
      },
      body: JSON.stringify({
        model,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter Error Response:", errText);
      throw new Error(`OpenRouter API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log("OpenRouter Success");
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    console.error("OpenRouter Fetch Final Error:", error);
    throw error;
  }
};

export const getAssistantResponse = async (
  currentPlanContext: string,
  userMessage: string,
  history: { role: "user" | "model"; parts: { text: string }[] }[] = [],
): Promise<string> => {
  const systemPrompt = `You are an elite SAT Study Assistant. Your goal is to maximize the student's score with zero wasted time. Answer with short sentences and no fluff 
    Context: ${currentPlanContext}. 

    CORE PRINCIPLES:
    1. **SAT AUTHORITY**: You are the ultimate SAT expert. Every word you say must be effective and high-impact. Do not waste the student's time with fluff, pleasantries ("Hello", "Sure", "I hope you are well"), or generic advice.
    2. **EXTREME DIRECTNESS**: Answer immediately. If asked a question, give the answer. Do not use filler phrases like "Here is the answer" or "Let me explain".
    3. **SAT FOCUS ONLY**: You only answer questions related to SAT prep, math, reading, writing, and study planning. If a user asks about anything else, refuse politely but briefly (e.g., "I focus only on SAT prep.").

    INSTRUCTIONS FOR SAT QUESTIONS (Math/Reading/Writing):
    When the user asks a specific SAT question, you must:
    "Comprehensively analyze this question based on the logical reasoning and test-taking strategies used in the SAT. Break down the question structure, explain the reasoning behind the correct answer, and evaluate why each incorrect answer is wrong. Additionally, highlight any common test traps and patterns the SAT uses in similar questions."

    GENERAL CHAT:
    *   For general questions ("How do I study?"), give ONE direct, high-impact answer/strategy. Do not give a list unless asked.
    *   Be authoritative. You are not a chatbot; you are a tutor.
    *   MATH RULE: Use plain text/unicode (e.g. 1/2, sin(x), x^2, √x). No LaTeX.

    Important: Do not output thinking process or XML tags. Just the response.
    `;

  // Convert Gemini history format to OpenRouter format
  const formattedHistory = history.map((h) => ({
    role: h.role === "model" ? "assistant" : "user",
    content: h.parts[0].text,
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    ...formattedHistory,
    { role: "user", content: userMessage },
  ];

  try {
    return await openRouterFetch(messages);
  } catch (error: any) {
    return "Connection busy. Try again in 5s.";
  }
};
