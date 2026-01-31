export type Section = "Math" | "Reading" | "Writing";

export interface DayPlan {
  day: number;
  date?: string;
  topic: string;
  difficulty: "Foundation" | "Medium" | "Hard" | "Challenge";
  specific_goal: string;
  section: Section;
  type?: "Learning" | "Practice" | "Mock" | "Review";
  start_time?: string;
  end_time?: string;
  tasks_text?: string;
  status?: "todo" | "completed" | "skipped";
}

export interface StudyPlan {
  days: DayPlan[];
  meta: {
    generatedAt: string;
    focusAreas: string[];
    summary: string;
  };
}

export interface UserOnboardingData {
  testDate: string; // e.g. "March 2026"
  scores: {
    math: number;
    ebrw: number;
  };
  studyGoal: number; // 30, 60, etc
  timeOfDay: "Morning" | "Afternoon" | "Evening";
  preferredStartTime: string; // e.g. "09:00"
  mathStruggles: string[];
  readingStruggles: string[];
  daysPerWeek: number;
  daysOff: string[];
}
