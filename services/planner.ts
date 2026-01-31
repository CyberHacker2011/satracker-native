import combinationsData from "../combinations.json";
import { UserOnboardingData, StudyPlan, DayPlan, Section } from "../types/plan";

interface CombinationItem {
  id: string;
  type: string;
  mode: string;
  title: string;
}

const CATEGORY_MAP: Record<string, string> = {
  algebra: "algebra",
  "advanced math": "advanced_math",
  "problem solving data": "problem_solving_data",
  trigonometry: "geometry_trig",
  "craft and structure": "craft_and_structure",
  "information and ideas": "information_and_ideas",
  "standard english conventions": "standard_english_conventions",
  "expression of ideas": "expression_of_ideas",
};

export const generateStaticStudyPlan = (
  data: UserOnboardingData,
): StudyPlan => {
  const isMathLower = data.scores.math <= data.scores.ebrw;
  const lowerSec: "math" | "ebrw" = isMathLower ? "math" : "ebrw";
  const higherSec: "math" | "ebrw" = isMathLower ? "ebrw" : "math";

  const lowerScore = isMathLower ? data.scores.math : data.scores.ebrw;
  const higherScore = isMathLower ? data.scores.ebrw : data.scores.math;

  const lowerTier = lowerScore < 650 ? "foundation_tier" : "mastery_tier";
  const higherTier = higherScore < 650 ? "foundation_tier" : "mastery_tier";

  const getItemsForSection = (
    section: "math" | "ebrw",
    tier: "foundation_tier" | "mastery_tier",
    score: number,
    count: number,
    struggles: string[],
  ) => {
    const catKeys = section === "math" ? "math_categories" : "ebrw_categories";
    const secData = (combinationsData as any)[tier][catKeys];

    // Prioritize struggle categories
    let preferredCats = struggles
      .map((s) => CATEGORY_MAP[s.toLowerCase()])
      .filter(Boolean);
    if (preferredCats.length === 0) {
      preferredCats = Object.keys(secData);
    }

    const items: any[] = [];
    const learningItems: any[] = [];
    const practiceItems: any[] = [];
    const reviewItems: any[] = [];

    preferredCats.forEach((cat) => {
      const catItems = secData[cat] || [];
      catItems.forEach((it: any) => {
        const enriched = {
          ...it,
          category: cat,
          section: section === "math" ? "Math" : "Reading",
        };
        if (it.type === "Learning") learningItems.push(enriched);
        else if (it.type === "Practice") practiceItems.push(enriched);
        else reviewItems.push(enriched);
      });
    });

    // Ratio logic
    if (score < 650) {
      // More learning, less practice (3:1 or similar)
      const Pool = [
        ...learningItems,
        ...learningItems,
        ...practiceItems,
        ...reviewItems,
      ];
      for (let i = 0; i < count; i++) items.push(Pool[i % Pool.length]);
    } else {
      // More practice, about one learning
      const Pool = [
        ...practiceItems,
        ...practiceItems,
        ...learningItems,
        ...reviewItems,
      ];
      for (let i = 0; i < count; i++) items.push(Pool[i % Pool.length]);
    }
    return items;
  };

  const lowerItems = getItemsForSection(
    lowerSec,
    lowerTier,
    lowerScore,
    4,
    lowerSec === "math" ? data.mathStruggles : data.readingStruggles,
  );
  const higherItems = getItemsForSection(
    higherSec,
    higherTier,
    higherScore,
    3,
    higherSec === "math" ? data.mathStruggles : data.readingStruggles,
  );

  // Cycle: L1, H1, L2, H2, L3, H3, L4, Mock
  const cycle = [
    lowerItems[0],
    higherItems[0],
    lowerItems[1],
    higherItems[1],
    lowerItems[2],
    higherItems[2],
    lowerItems[3],
    {
      id: "MOCK",
      type: "Mock",
      mode: "Full",
      title: "Full-Length Practice SAT",
      section: "Both",
      category: "Full Test",
    },
  ];

  const planDays: DayPlan[] = [];

  // Date calculation logic
  let dayOffset = 0;
  const preferredStart = data.preferredStartTime || "09:00";
  const [startH, startM] = preferredStart.split(":").map(Number);
  const duration = data.studyGoal || 60;

  const calculateEndTime = (sh: number, sm: number, d: number) => {
    let totalMins = sh * 60 + sm + d;
    const eh = Math.floor(totalMins / 60) % 24;
    const em = totalMins % 60;
    return `${eh.toString().padStart(2, "0")}:${em.toString().padStart(2, "0")}`;
  };

  const startTimeStr = preferredStart;
  const endTimeStr = calculateEndTime(startH, startM, duration);

  const formatLabel = (s: string) => {
    return s
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getNextAvailableDate = () => {
    while (true) {
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
      if (!data.daysOff.includes(dayName)) {
        const dateStr = d.toISOString().split("T")[0];
        dayOffset++;
        return dateStr;
      }
      dayOffset++;
    }
  };

  // 1. Initial Foundational/Advanced cycle (30 days)
  for (let i = 0; i < 30; i++) {
    const item = cycle[i % 8];
    const isHighScorer = higherScore > 650;

    planDays.push({
      day: i + 1,
      date: getNextAvailableDate(),
      topic: formatLabel(item.category || "Full Mock"),
      difficulty: isHighScorer
        ? "Hard"
        : item.type === "Practice" && lowerScore > 600
          ? "Medium"
          : "Foundation",
      specific_goal: `${item.type}: ${item.title}`,
      type: item.type as any,
      section: (item.section === "Both" ? "Math" : item.section) as Section,
      start_time: startTimeStr,
      end_time: endTimeStr,
      tasks_text: `${startTimeStr} - ${endTimeStr} (${duration}m)`,
    });
  }

  // 2. Until Exam (Intensive Practice)
  // Calculate actual study days until exam
  const examDate = new Date(data.testDate + " 15"); // Mid-month approximation
  const now = new Date();

  // Calculate total days between now and exam
  const diffTime = Math.abs(examDate.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // We want to fill plans until the exam, respecting days off.
  // We already filled 30 days. We need to fill the rest.

  // Create a pool of practice items
  const allPractice: any[] = [];
  ["foundation_tier", "mastery_tier"].forEach((t) => {
    ["math_categories", "ebrw_categories"].forEach((ck) => {
      const cats = (combinationsData as any)[t]?.[ck];
      if (cats) {
        Object.keys(cats).forEach((cK) => {
          cats[cK]?.forEach((it: any) => {
            if (it.type === "Practice")
              allPractice.push({
                ...it,
                category: cK,
                section: ck === "math_categories" ? "Math" : "Reading",
              });
          });
        });
      }
    });
  });

  // Calculate remaining study slots needed (approximate cap to avoid infinite loops)
  const SAFETY_CAP = 120;
  let currentDayIndex = 30; // Starting after the first 30 days

  // Loop until we reach the exam date or hit a safety limit
  while (currentDayIndex < SAFETY_CAP) {
    const dStr = getNextAvailableDate();

    // Stop if the next available date goes past the exam
    if (new Date(dStr) > examDate) break;

    const isHighScorer = higherScore > 650;

    // Every 8th session is a Mock
    if ((currentDayIndex + 1) % 8 === 0) {
      planDays.push({
        day: currentDayIndex + 1,
        date: dStr,
        topic: "Mock Exam",
        difficulty: "Hard",
        specific_goal: "Full-Length Practice SAT",
        type: "Mock",
        section: "Math", // Technically 'Both'
        start_time: startTimeStr,
        end_time: endTimeStr,
        tasks_text: `${startTimeStr} - ${endTimeStr} (${duration}m)`,
      });
    } else {
      // Pick a practice item
      const it =
        allPractice.length > 0
          ? allPractice[(currentDayIndex - 30) % allPractice.length]
          : { category: "General", title: "Review", section: "Math" }; // Fallback

      planDays.push({
        day: currentDayIndex + 1,
        date: dStr,
        topic: formatLabel(it.category),
        difficulty: isHighScorer ? "Hard" : "Medium",
        specific_goal: `Practice: ${it.title}`,
        type: "Practice",
        section: it.section as Section,
        start_time: startTimeStr,
        end_time: endTimeStr,
        tasks_text: `${startTimeStr} - ${endTimeStr} (${duration}m)`,
      });
    }
    currentDayIndex++;
  }

  return {
    days: planDays,
    meta: {
      generatedAt: new Date().toISOString(),
      focusAreas: data.mathStruggles.concat(data.readingStruggles),
      summary: `Customized static plan focusing on ${lowerSec === "math" ? "Math" : "Reading & Writing"}. Initial 30-day foundational cycle followed by intensive practice.`,
    },
  };
};
