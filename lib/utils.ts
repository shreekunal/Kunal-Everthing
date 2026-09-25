import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates accurate current streak and best streak from an array or Set of completed date strings (YYYY-MM-DD).
 * 
 * Rules:
 * 1. If today is completed -> currentStreak counts from today backwards consecutively.
 * 2. If today is NOT completed -> check if yesterday was completed.
 *    - If yesterday was completed -> currentStreak counts from yesterday backwards consecutively (the streak is alive today!).
 *    - If yesterday was NOT completed -> currentStreak is 0 (broken streak).
 * 3. bestStreak is the longest consecutive sequence across all completed dates in history.
 */
export function calculateRoutineStreak(
  completedDates: Set<string> | string[],
  todayStr: string = format(new Date(), "yyyy-MM-dd")
): { currentStreak: number; bestStreak: number } {
  const dateSet = completedDates instanceof Set ? completedDates : new Set(completedDates);

  if (dateSet.size === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const today = parseISO(todayStr);
  const isDoneToday = dateSet.has(todayStr);
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
  const isDoneYesterday = dateSet.has(yesterdayStr);

  let currentStreak = 0;
  if (isDoneToday) {
    currentStreak = 1;
    let checkDate = subDays(today, 1);
    while (dateSet.has(format(checkDate, "yyyy-MM-dd"))) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }
  } else if (isDoneYesterday) {
    currentStreak = 1;
    let checkDate = subDays(today, 2);
    while (dateSet.has(format(checkDate, "yyyy-MM-dd"))) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }
  } else {
    currentStreak = 0;
  }

  // Calculate best streak historically across all records
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

  return {
    currentStreak,
    bestStreak: Math.max(maxStreak, currentStreak),
  };
}
