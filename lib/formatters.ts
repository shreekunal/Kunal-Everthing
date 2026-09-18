import { format, parseISO, differenceInDays, isToday, isTomorrow, isPast } from "date-fns";

/**
 * Format numbers into Indian Rupee format (e.g. ₹3,42,500.00 or ₹3,42,500)
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount)) return "₹0";
  const absAmount = Math.abs(amount);
  const formatted = showDecimals
    ? absAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : Math.round(absAmount).toLocaleString("en-IN");

  return `${amount < 0 ? "-" : ""}₹${formatted}`;
}

/**
 * Format minutes into human readable hours & minutes (e.g. "2h 15m")
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Format date into clean Indian display format (e.g. "18 Sep 2026")
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = typeof dateString === "string" ? parseISO(dateString) : dateString;
    return format(d, "dd MMM yyyy");
  } catch {
    return dateString;
  }
}

/**
 * Get human readable due badge info (e.g. "Due today", "In 3 days", "Overdue by 2 days")
 */
export function getDueStatus(dateString: string | null | undefined): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  daysDiff: number;
  badgeClass: string;
} {
  if (!dateString) {
    return {
      label: "No due date",
      isOverdue: false,
      isToday: false,
      daysDiff: 0,
      badgeClass: "bg-surface-elevated text-zinc-400",
    };
  }

  try {
    const dueDate = parseISO(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isToday(dueDate)) {
      return {
        label: "Due Today",
        isOverdue: false,
        isToday: true,
        daysDiff: 0,
        badgeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      };
    }

    if (isTomorrow(dueDate)) {
      return {
        label: "Due Tomorrow",
        isOverdue: false,
        isToday: false,
        daysDiff: 1,
        badgeClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      };
    }

    const diff = differenceInDays(dueDate, today);

    if (diff < 0) {
      const overdueDays = Math.abs(diff);
      return {
        label: `Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`,
        isOverdue: true,
        isToday: false,
        daysDiff: diff,
        badgeClass: "bg-red-500/20 text-red-400 border border-red-500/30",
      };
    }

    if (diff <= 3) {
      return {
        label: `Due in ${diff} days`,
        isOverdue: false,
        isToday: false,
        daysDiff: diff,
        badgeClass: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
      };
    }

    if (diff <= 7) {
      return {
        label: `Due in ${diff} days`,
        isOverdue: false,
        isToday: false,
        daysDiff: diff,
        badgeClass: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      };
    }

    return {
      label: format(dueDate, "dd MMM"),
      isOverdue: false,
      isToday: false,
      daysDiff: diff,
      badgeClass: "bg-surface-elevated text-zinc-400 border border-surface-border",
    };
  } catch {
    return {
      label: dateString,
      isOverdue: false,
      isToday: false,
      daysDiff: 0,
      badgeClass: "bg-surface-elevated text-zinc-400",
    };
  }
}

/**
 * Calculate next card payment due date based on statement & due day of month
 */
export function getNextCardDueDate(dueDay: number): {
  date: Date;
  daysRemaining: number;
  label: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let targetDate: Date;
  if (currentDay <= dueDay) {
    targetDate = new Date(currentYear, currentMonth, dueDay);
  } else {
    targetDate = new Date(currentYear, currentMonth + 1, dueDay);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = differenceInDays(targetDate, today);

  return {
    date: targetDate,
    daysRemaining: diff,
    label: diff === 0 ? "Due today" : diff === 1 ? "Due tomorrow" : `Due in ${diff} days`,
  };
}
