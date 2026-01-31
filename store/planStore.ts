import { create } from "zustand";
import { StudyPlan, UserOnboardingData } from "../types/plan";
import { generateStaticStudyPlan } from "../services/planner";

interface PlanState {
  onboardingData: UserOnboardingData;
  setOnboardingData: (data: Partial<UserOnboardingData>) => void;
  draftPlan: StudyPlan | null;
  setDraftPlan: (plan: StudyPlan | null) => void;
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;
  generatePlan: () => Promise<void>;
  updateDraftPlan: (feedback: string) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  onboardingData: {
    testDate: "March 2026",
    scores: {
      math: 500,
      ebrw: 500,
    },
    studyGoal: 60,
    timeOfDay: "Afternoon",
    preferredStartTime: "09:00",
    mathStruggles: [],
    readingStruggles: [],
    daysPerWeek: 5,
    daysOff: [],
  },
  draftPlan: null,
  isGenerating: false,

  setOnboardingData: (data) =>
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    })),

  setDraftPlan: (plan) => set({ draftPlan: plan }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  generatePlan: async () => {
    const { onboardingData } = get();
    set({ isGenerating: true });
    // Removed simulated delay for performance
    // await new Promise((resolve) => setTimeout(resolve, 800));
    try {
      const plan = generateStaticStudyPlan(onboardingData);
      set({ draftPlan: plan, isGenerating: false });
    } catch (error) {
      console.error("Planning failed:", error);
      set({ draftPlan: null, isGenerating: false });
    }
  },

  updateDraftPlan: async (feedback) => {
    // Regenerate not supported for static algorithm in this way
    // But we can just call generatePlan again if needed
    await get().generatePlan();
  },
}));
