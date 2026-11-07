import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  graceUsed: boolean;
  graceDate: string | null;
}

/**
 * Calculates accurate current streak and best streak from an array or Set of completed date strings (YYYY-MM-DD).
 * 
 * Rules:
 * 1. Consecutively completed days increment currentStreak.
 * 2. If today is NOT completed, but yesterday was completed -> streak stays alive from yesterday backwards.
 * 3. Grace Day: 1 missed day per rolling 7 days does NOT break currentStreak (graceUsed = true).
 * 4. Two consecutive missed days break currentStreak (cannot double grace).
 * 5. A second missed day within 7 days of an already used grace day breaks the streak.
 * 6. Historical bestStreak is strictly preserved (never rewritten lower).
 */
export function calculateRoutineStreak(
  completedDates: Set<string> | string[],
  todayStr: string = format(new Date(), "yyyy-MM-dd")
): StreakResult {
  const dateSet = completedDates instanceof Set ? completedDates : new Set(completedDates);

  if (dateSet.size === 0) {
    return { currentStreak: 0, bestStreak: 0, graceUsed: false, graceDate: null };
  }

  const today = parseISO(todayStr);
  const isDoneToday = dateSet.has(todayStr);
  const yesterday = subDays(today, 1);
  const yesterdayStr = format(yesterday, "yyyy-MM-dd");
  const isDoneYesterday = dateSet.has(yesterdayStr);

  let currentStreak = 0;
  let graceUsed = false;
  let graceDate: string | null = null;
  let lastGraceDate: Date | null = null;

  // Determine traversal start
  let checkDate: Date;

  if (isDoneToday) {
    currentStreak = 1;
    checkDate = yesterday;
  } else if (isDoneYesterday) {
    // Today not logged yet, but yesterday was logged
    currentStreak = 1;
    checkDate = subDays(today, 2);
  } else {
    // Both today and yesterday are NOT completed.
    // Check if yesterday can qualify for the 1 rolling grace day.
    const twoDaysAgo = subDays(today, 2);
    const twoDaysAgoStr = format(twoDaysAgo, "yyyy-MM-dd");
    if (dateSet.has(twoDaysAgoStr)) {
      graceUsed = true;
      graceDate = yesterdayStr;
      lastGraceDate = yesterday;
      currentStreak = 1; // Start streak from 2 days ago
      checkDate = subDays(today, 3);
    } else {
      // Missed both yesterday and 2 days ago -> broken streak
      return {
        currentStreak: 0,
        bestStreak: calculateHistoricalBest(dateSet),
        graceUsed: false,
        graceDate: null,
      };
    }
  }

  // Traverse backwards consecutively
  while (true) {
    const checkStr = format(checkDate, "yyyy-MM-dd");
    if (dateSet.has(checkStr)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      // A missed day encountered while walking backwards
      const canUseGrace =
        !lastGraceDate ||
        Math.abs(differenceInCalendarDays(lastGraceDate, checkDate)) >= 7;

      const dayBefore = subDays(checkDate, 1);
      const dayBeforeStr = format(dayBefore, "yyyy-MM-dd");
      const hasPriorCompletedDay = dateSet.has(dayBeforeStr);

      if (canUseGrace && hasPriorCompletedDay) {
        graceUsed = true;
        if (!graceDate) graceDate = checkStr;
        lastGraceDate = checkDate;
        // Skip over the single forgiven day and continue checking backwards
        checkDate = dayBefore;
      } else {
        // Cannot use grace (either 2 consecutive missed days, or grace already used within 7 rolling days)
        break;
      }
    }
  }

  const historicalBest = calculateHistoricalBest(dateSet);
  const bestStreak = Math.max(historicalBest, currentStreak);

  return {
    currentStreak,
    bestStreak,
    graceUsed,
    graceDate,
  };
}

function calculateHistoricalBest(dateSet: Set<string>): number {
  const sortedDates = Array.from(dateSet).sort();
  let maxStreak = 0;
  let runningStreak = 0;
  let prevDate: Date | null = null;

  for (const dStr of sortedDates) {
    const currDate = parseISO(dStr);
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const diff = differenceInCalendarDays(currDate, prevDate);
      if (diff === 1) {
        runningStreak++;
      } else if (diff > 1) {
        runningStreak = 1;
      }
    }
    prevDate = currDate;
    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }
  }
  return maxStreak;
}
