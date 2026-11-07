import { Capacitor } from "@capacitor/core";
import { format, parseISO, differenceInDays } from "date-fns";
import { pushWidgetSnapshot, WidgetSnapshotData } from "./widgetBridge";

interface BuildSnapshotParams {
  dashboardData?: any;
  partnerData?: any;
  broadcastData?: any;
  waterGlasses?: number;
  waterTarget?: number;
}

/**
 * Calculates how many days until the next annual occurrence of a date string (YYYY-MM-DD).
 */
function calculateNextAnniversary(dateStr?: string | null): { name: string; daysLeft: number; formattedDate?: string; isToday?: boolean } | null {
  if (!dateStr) return null;
  try {
    const targetDate = parseISO(dateStr);
    if (isNaN(targetDate.getTime())) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    let nextDate = new Date(currentYear, targetDate.getMonth(), targetDate.getDate());
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (nextDate < todayZero) {
      nextDate = new Date(currentYear + 1, targetDate.getMonth(), targetDate.getDate());
    }

    const diffTime = nextDate.getTime() - todayZero.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return {
      name: "Anniversary",
      daysLeft,
      formattedDate: format(nextDate, "d MMM"),
      isToday: daysLeft === 0,
    };
  } catch {
    return null;
  }
}

/**
 * Calculates days elapsed between an anniversary date and today.
 */
function calculateDaysTogether(dateStr?: string | null): number {
  if (!dateStr) return 0;
  try {
    const start = parseISO(dateStr);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    return Math.max(0, differenceInDays(now, start));
  } catch {
    return 0;
  }
}

/**
 * Finds the nearest upcoming important date from the list.
 */
function findNextImportantDate(dates?: Array<{ name: string; date: string }>): { name: string; daysLeft: number } | null {
  if (!dates || !Array.isArray(dates) || dates.length === 0) return null;
  try {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const upcoming = dates
      .filter((d) => d && d.date && d.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length === 0) return null;
    const first = upcoming[0];
    const target = parseISO(first.date);
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffTime = target.getTime() - todayZero.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return {
      name: first.name || "Event",
      daysLeft,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a clean, typed snapshot without ANY financial or sensitive vault data.
 */
export function buildWidgetSnapshot(params: BuildSnapshotParams): WidgetSnapshotData {
  const { dashboardData, partnerData, broadcastData, waterGlasses = 0, waterTarget = 8 } = params;

  // 1. Tasks due today (top 4 uncompleted, sorted by priority)
  const allTodayTasks = dashboardData?.todayTasks || [];
  const priorityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const pendingTasks = allTodayTasks
    .filter((t: any) => t.status !== "DONE")
    .sort((a: any, b: any) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))
    .slice(0, 4)
    .map((t: any) => ({
      id: t.id,
      title: String(t.title || "Task").trim().slice(0, 50),
      priority: String(t.priority || "MEDIUM").toUpperCase(),
    }));

  // 2. Routines left
  const routinesLeftCount = typeof dashboardData?.routinesLeftCount === "number"
    ? dashboardData.routinesLeftCount
    : 0;

  // 3. Hydration
  const waterMl = Math.max(0, waterGlasses * 250);
  const waterGoal = Math.max(250, waterTarget * 250);

  // 4. Physical Steps
  const steps = typeof dashboardData?.steps?.todayCount === "number"
    ? dashboardData.steps.todayCount
    : 0;
  const stepsGoal = typeof dashboardData?.steps?.targetSteps === "number" && dashboardData.steps.targetSteps > 0
    ? dashboardData.steps.targetSteps
    : 10000;

  // 5. Next Important Date
  const nextDate = findNextImportantDate(dashboardData?.importantDates);

  // 6. Relationship & Anniversary
  const anniversaryStr = dashboardData?.partner?.anniversary || partnerData?.partner?.anniversary || null;
  const daysTogether = calculateDaysTogether(anniversaryStr);
  const nextAnniversary = calculateNextAnniversary(anniversaryStr);

  // 7. Discipline & Pet Stage
  const purityStreak = dashboardData?.discipline?.streaks?.purity?.currentStreak || 0;
  const dietStreak = dashboardData?.discipline?.streaks?.diet?.currentStreak || 0;
  const disciplineStreak = Math.max(purityStreak, dietStreak, dashboardData?.discipline?.currentStreak || 0);

  const isPetDead = Boolean(dashboardData?.discipline?.isPetDead);
  let petStage = "Novice Disciple";
  if (isPetDead) {
    petStage = "R.I.P.";
  } else if (dashboardData?.discipline?.title) {
    petStage = dashboardData.discipline.title;
  } else if (dashboardData?.discipline?.level) {
    petStage = `LVL ${dashboardData.discipline.level}`;
  }

  // 8. Partner Status
  const partnerName = partnerData?.partner?.name || dashboardData?.partner?.name || "Partner";
  const partnerBroadcast = broadcastData?.partnerBroadcast;
  const isFocusing = Boolean(
    partnerBroadcast &&
    partnerBroadcast.status === "RUNNING" &&
    Date.now() - (partnerBroadcast.updatedAt || 0) < 3 * 60 * 60 * 1000
  );
  const focusProject = isFocusing && partnerBroadcast?.project ? partnerBroadcast.project : null;
  const pendingTasksCount = typeof partnerData?.tasks?.pendingCount === "number"
    ? partnerData.tasks.pendingCount
    : 0;

  return {
    updatedAt: Date.now(),
    userName: dashboardData?.user?.name || "Kunal",
    tasksDueToday: pendingTasks,
    routinesLeftCount,
    waterMl,
    waterGoal,
    steps,
    stepsGoal,
    nextDate,
    daysTogether,
    nextAnniversary,
    disciplineStreak,
    petStage,
    partner: {
      name: partnerName,
      focusingNow: isFocusing,
      focusProject,
      pendingTasksCount,
    },
  };
}

let lastDispatchedFingerprint = "";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced and change-detected sync handler.
 * Only triggers on native Android and when content meaningfully changes.
 */
export function syncWidgetsIfChanged(params: BuildSnapshotParams, debounceMs: number = 800) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    try {
      const snapshot = buildWidgetSnapshot(params);

      // Create fingerprint without updatedAt to compare content changes
      const { updatedAt, ...contentOnly } = snapshot;
      const currentFingerprint = JSON.stringify(contentOnly);

      if (currentFingerprint === lastDispatchedFingerprint) {
        return; // Content hasn't changed, skip unnecessary native dispatch
      }

      lastDispatchedFingerprint = currentFingerprint;
      pushWidgetSnapshot(snapshot).catch((err) => {
        console.warn("Widget sync dispatch error:", err);
      });
    } catch (err) {
      console.warn("Failed to build and dispatch widget snapshot:", err);
    }
  }, debounceMs);
}
