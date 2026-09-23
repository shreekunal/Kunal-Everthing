import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Channel } from "@capacitor/local-notifications";

export const NOTIFICATION_IDS = {
  MORNING_BRIEFING: 1001,
  STREAK_DEFENDER: 1002,
  MIDDAY_HABIT_CHECK: 1003,
  WATER_REMINDER_BASE: 2000,
  TEST_WATER_NOTIFICATION: 9998,
  TEST_NOTIFICATION: 9999,
};

export const NOTIFICATION_CHANNELS = {
  DAILY_BRIEFING: "daily-briefing",
  TASK_REMINDERS: "task-reminders",
  HYDRATION: "hydration-reminders",
} as const;

/**
 * Deterministically hash a string ID (e.g. task CUID / UUID) to a positive 32-bit int
 * in the range [10000, 2000000] to avoid collision with core IDs.
 */
export function getTaskNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash << 5) - hash + taskId.charCodeAt(i);
    hash |= 0;
  }
  return 10000 + (Math.abs(hash) % 1990000);
}

/**
 * Configure dedicated Android Notification Channels with appropriate importance and sound
 */
export async function setupNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const channels: Channel[] = [
      {
        id: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
        name: "Daily Routines & Streaks",
        description: "Morning priorities, midday checks, and evening streak defender alarms",
        importance: 4, // High importance (heads-up notification & sound)
        visibility: 1, // Public on lockscreen
        vibration: true,
        lights: true,
        lightColor: "#EF4444",
      },
      {
        id: NOTIFICATION_CHANNELS.TASK_REMINDERS,
        name: "Task & Deadline Alarms",
        description: "Time-sensitive alerts for scheduled priority tasks",
        importance: 4, // High importance
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: "#F59E0B",
      },
      {
        id: NOTIFICATION_CHANNELS.HYDRATION,
        name: "Hydration & Health",
        description: "Periodic hydration and health check reminders",
        importance: 4, // Upgraded to High importance (heads-up notification banner & sound)
        visibility: 1, // Public on lockscreen
        vibration: true,
        lights: true,
        lightColor: "#06B6D4",
      },
    ];

    for (const channel of channels) {
      await LocalNotifications.createChannel(channel);
    }
  } catch (err) {
    console.warn("Failed to create notification channels:", err);
  }
}

/**
 * Check whether Exact Alarms (Android 12+ / API 31+) are granted
 */
export async function checkExactAlarmPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const status = await LocalNotifications.checkExactNotificationSetting();
    return status.exact_alarm === "granted";
  } catch (err) {
    console.warn("Check exact alarm error:", err);
    return true;
  }
}

/**
 * Direct user to Android system settings to grant exact alarms if denied
 */
export async function requestExactAlarmPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const status = await LocalNotifications.changeExactNotificationSetting();
    return status.exact_alarm === "granted";
  } catch (err) {
    console.warn("Request exact alarm error:", err);
    return false;
  }
}

/**
 * Request notification permissions and initialize channels
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return true;
      const res = await Notification.requestPermission();
      return res === "granted";
    }
    return false;
  }

  try {
    let granted = false;
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") {
      granted = true;
    } else {
      const req = await LocalNotifications.requestPermissions();
      granted = req.display === "granted";
    }

    if (granted) {
      await setupNotificationChannels();
    }
    return granted;
  } catch (err) {
    console.warn("Notification permission error:", err);
    return false;
  }
}

/**
 * Schedule recurring Morning (8:00 AM), Midday (2:00 PM), and Evening (9:00 PM) alarms
 */
export async function scheduleCoreDailyNotifications(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    // Clear any existing core alarms before re-registering
    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIFICATION_IDS.MORNING_BRIEFING },
        { id: NOTIFICATION_IDS.MIDDAY_HABIT_CHECK },
        { id: NOTIFICATION_IDS.STREAK_DEFENDER },
      ],
    });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.MORNING_BRIEFING,
          title: "Everything • Morning Priorities",
          body: "Rise and execute. Review your daily habits, deep work targets, and priorities.",
          schedule: {
            on: { hour: 8, minute: 0 },
            repeats: true,
            allowWhileIdle: true,
          },
          channelId: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
          smallIcon: "ic_stat_notification",
          iconColor: "#EF4444",
          extra: {
            route: "/routines",
            type: "MORNING_BRIEFING",
          },
        },
        {
          id: NOTIFICATION_IDS.MIDDAY_HABIT_CHECK,
          title: "Everything • Midday Habits Check",
          body: "Keep the momentum going! Check in on your afternoon habits and focus targets.",
          schedule: {
            on: { hour: 14, minute: 0 },
            repeats: true,
            allowWhileIdle: true,
          },
          channelId: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
          smallIcon: "ic_stat_notification",
          iconColor: "#F59E0B",
          extra: {
            route: "/routines",
            type: "MIDDAY_HABIT_CHECK",
          },
        },
        {
          id: NOTIFICATION_IDS.STREAK_DEFENDER,
          title: "Monk Protocol • Streak Defender",
          body: "Protect your streak! Complete your daily routines and lock in your evening karma.",
          schedule: {
            on: { hour: 21, minute: 0 },
            repeats: true,
            allowWhileIdle: true,
          },
          channelId: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
          smallIcon: "ic_stat_notification",
          iconColor: "#EF4444",
          extra: {
            route: "/routines",
            type: "STREAK_DEFENDER",
          },
        },
      ],
    });

    if (typeof window !== "undefined") {
      localStorage.setItem("everything_notifications_enabled", "true");
    }
    return true;
  } catch (err) {
    console.error("Failed to schedule local notifications:", err);
    return false;
  }
}

/**
 * Synchronize daily habit notifications dynamically.
 * Adjusts tonight's Streak Defender notification based on whether habits are completed or pending.
 */
export async function syncHabitNotifications(params: {
  incompleteCount: number;
  totalCount: number;
  atRiskStreakNames?: string[];
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    const isAllDone = params.totalCount > 0 && params.incompleteCount === 0;
    const atRiskTitle =
      params.atRiskStreakNames && params.atRiskStreakNames.length > 0
        ? `⚡ Streak at Risk: ${params.atRiskStreakNames[0]}`
        : `⚡ ${params.incompleteCount} Habit${params.incompleteCount > 1 ? "s" : ""} Pending`;

    const body = isAllDone
      ? "All daily habits completed! Your streak is defended. Rest well."
      : "Complete your remaining daily habits before midnight to protect your streaks!";

    // Reschedule tonight's Streak Defender with real context
    await LocalNotifications.cancel({
      notifications: [{ id: NOTIFICATION_IDS.STREAK_DEFENDER }],
    });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.STREAK_DEFENDER,
          title: isAllDone ? "Everything • Streaks Defended! 🔥" : atRiskTitle,
          body,
          schedule: {
            on: { hour: 21, minute: 0 },
            repeats: true,
            allowWhileIdle: true,
          },
          channelId: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
          smallIcon: "ic_stat_notification",
          iconColor: isAllDone ? "#10B981" : "#EF4444",
          extra: {
            route: "/routines",
            type: "STREAK_DEFENDER",
            incompleteCount: params.incompleteCount,
          },
        },
      ],
    });

    return true;
  } catch (err) {
    console.error("Failed to sync habit notifications:", err);
    return false;
  }
}

/**
 * Cancel all core notifications
 */
export async function cancelCoreNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIFICATION_IDS.MORNING_BRIEFING },
        { id: NOTIFICATION_IDS.MIDDAY_HABIT_CHECK },
        { id: NOTIFICATION_IDS.STREAK_DEFENDER },
      ],
    });
    if (typeof window !== "undefined") {
      localStorage.setItem("everything_notifications_enabled", "false");
    }
  } catch (err) {
    console.error("Cancel notifications error:", err);
  }
}

/**
 * Verify whether core daily notifications are actually scheduled in native AlarmManager
 */
export async function areCoreNotificationsActive(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined") {
      return localStorage.getItem("everything_notifications_enabled") === "true";
    }
    return false;
  }

  try {
    const pending = await LocalNotifications.getPending();
    const hasBriefing = pending.notifications.some(
      (n) =>
        n.id === NOTIFICATION_IDS.MORNING_BRIEFING ||
        n.id === NOTIFICATION_IDS.MIDDAY_HABIT_CHECK ||
        n.id === NOTIFICATION_IDS.STREAK_DEFENDER
    );
    return hasBriefing;
  } catch (err) {
    console.warn("Failed to check pending notifications:", err);
    if (typeof window !== "undefined") {
      return localStorage.getItem("everything_notifications_enabled") === "true";
    }
    return false;
  }
}

/**
 * Send an immediate test notification 3 seconds from now
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    const triggerAt = new Date(Date.now() + 3000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.TEST_NOTIFICATION,
          title: "Everything • Portal Test Ping",
          body: "Tactile alarms and notifications are active on your device! ⚡",
          schedule: { at: triggerAt, allowWhileIdle: true },
          channelId: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
          smallIcon: "ic_stat_notification",
          iconColor: "#EF4444",
          extra: {
            route: "/settings",
            type: "TEST_NOTIFICATION",
          },
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("Test notification failed:", err);
    return false;
  }
}

/**
 * Send an immediate test hydration reminder (fires in 2 seconds) on the HYDRATION channel
 */
export async function sendTestWaterNotification(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
        new Notification("💧 Hydration Check • Drink Water (Test)", {
          body: "Stay sharp and energized! Take a sip or log a fresh glass of water.",
          icon: "/favicon.ico",
        });
        return true;
      }
    }
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    const triggerAt = new Date(Date.now() + 2000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.TEST_WATER_NOTIFICATION,
          title: "💧 Hydration Check • Drink Water (Test)",
          body: "Stay sharp and energized! Take a sip or log a fresh glass of water.",
          schedule: { at: triggerAt, allowWhileIdle: true },
          channelId: NOTIFICATION_CHANNELS.HYDRATION,
          smallIcon: "ic_stat_notification",
          iconColor: "#06B6D4",
          extra: {
            route: "/",
            type: "WATER_REMINDER",
          },
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("Test water notification failed:", err);
    return false;
  }
}

/**
 * Check whether hydration notifications are currently active
 */
export async function areWaterNotificationsActive(): Promise<boolean> {
  if (typeof window !== "undefined") {
    const isEnabled = localStorage.getItem("kunal_os_water_notifications_enabled") === "true";
    if (!Capacitor.isNativePlatform()) return isEnabled;
  }

  try {
    const pending = await LocalNotifications.getPending();
    return (pending.notifications || []).some(
      (n) => n.id >= NOTIFICATION_IDS.WATER_REMINDER_BASE && n.id <= NOTIFICATION_IDS.WATER_REMINDER_BASE + 20
    );
  } catch (err) {
    return false;
  }
}

export interface LiveNotificationDiagnostic {
  totalPending: number;
  coreAlarmsActive: boolean;
  waterAlarmsCount: number;
  taskAlarmsCount: number;
  hasExactAlarms: boolean;
  isNative: boolean;
  notifications: {
    id: number;
    title?: string;
    body?: string;
    scheduleDesc?: string;
  }[];
}

/**
 * Inspect live pending alarms in Android AlarmManager
 */
export async function getLiveNotificationDiagnostics(): Promise<LiveNotificationDiagnostic> {
  const isNative = Capacitor.isNativePlatform();
  const hasExact = await checkExactAlarmPermission();
  const coreActive = await areCoreNotificationsActive();

  if (!isNative) {
    const waterActive = typeof window !== "undefined" && localStorage.getItem("kunal_os_water_notifications_enabled") === "true";
    return {
      totalPending: (coreActive ? 2 : 0) + (waterActive ? 7 : 0),
      coreAlarmsActive: coreActive,
      waterAlarmsCount: waterActive ? 7 : 0,
      taskAlarmsCount: 0,
      hasExactAlarms: true,
      isNative: false,
      notifications: [
        ...(coreActive
          ? [
              { id: 1001, title: "Morning Priorities (8:00 AM)", scheduleDesc: "Daily at 8:00 AM" },
              { id: 1002, title: "Streak Defender (9:00 PM)", scheduleDesc: "Daily at 9:00 PM" },
            ]
          : []),
        ...(waterActive
          ? [
              { id: 2000, title: "💧 Hydration Check", scheduleDesc: "Recurring every 2 hours (9 AM - 9 PM)" },
            ]
          : []),
      ],
    };
  }

  try {
    const pending = await LocalNotifications.getPending();
    const list = pending.notifications || [];
    const waterList = list.filter(
      (n) => n.id >= NOTIFICATION_IDS.WATER_REMINDER_BASE && n.id <= NOTIFICATION_IDS.WATER_REMINDER_BASE + 20
    );
    const taskList = list.filter((n) => n.id >= 10000);

    return {
      totalPending: list.length,
      coreAlarmsActive: coreActive,
      waterAlarmsCount: waterList.length,
      taskAlarmsCount: taskList.length,
      hasExactAlarms: hasExact,
      isNative: true,
      notifications: list.map((n) => {
        let title = (n as any).title;
        let scheduleDesc = "Registered in Android AlarmManager";
        if (n.id === NOTIFICATION_IDS.MORNING_BRIEFING) {
          title = "Morning Priorities (8:00 AM)";
          scheduleDesc = "Daily at 8:00 AM (daily-briefing channel)";
        } else if (n.id === NOTIFICATION_IDS.STREAK_DEFENDER) {
          title = "Streak Defender (9:00 PM)";
          scheduleDesc = "Daily at 9:00 PM (daily-briefing channel)";
        } else if (n.id >= NOTIFICATION_IDS.WATER_REMINDER_BASE && n.id <= NOTIFICATION_IDS.WATER_REMINDER_BASE + 20) {
          const offset = n.id - NOTIFICATION_IDS.WATER_REMINDER_BASE;
          const hour = 9 + offset * 2;
          const hourFormatted = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? "12:00 PM" : `${hour}:00 AM`;
          title = `💧 Hydration Check (${hourFormatted})`;
          scheduleDesc = `Recurring at ${hourFormatted} (hydration-reminders channel)`;
        } else if (n.id >= 10000) {
          title = (n as any).title || "Task Reminder Alarm";
          scheduleDesc = "Exact task deadline alarm (task-reminders channel)";
        }
        return {
          id: n.id,
          title,
          body: (n as any).body,
          scheduleDesc,
        };
      }),
    };
  } catch (err) {
    console.error("Failed to get pending diagnostics:", err);
    return {
      totalPending: 0,
      coreAlarmsActive: coreActive,
      waterAlarmsCount: 0,
      taskAlarmsCount: 0,
      hasExactAlarms: hasExact,
      isNative: true,
      notifications: [],
    };
  }
}

/**
 * Schedule recurring Water / Hydration Reminders between 9 AM and 9 PM
 */
export async function scheduleWaterReminders(
  intervalHours = 2,
  startHour = 9,
  endHour = 21
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
    }
    localStorage.setItem("kunal_os_water_notifications_enabled", "true");
    return true;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    // 1. Clear any prior water alarms (IDs 2000 to 2015)
    const existingIds = [];
    for (let i = 0; i <= 15; i++) {
      existingIds.push({ id: NOTIFICATION_IDS.WATER_REMINDER_BASE + i });
    }
    await LocalNotifications.cancel({ notifications: existingIds });

    // 2. Schedule recurring alarms at intervalHours
    const waterNotifications = [];
    let idOffset = 0;

    for (let h = startHour; h <= endHour; h += intervalHours) {
      waterNotifications.push({
        id: NOTIFICATION_IDS.WATER_REMINDER_BASE + idOffset,
        title: "💧 Hydration Check • Drink Water",
        body: "Stay sharp and energized! Take a sip or log a fresh glass of water.",
        schedule: {
          on: { hour: h, minute: 0 },
          repeats: true,
          allowWhileIdle: true,
        },
        channelId: NOTIFICATION_CHANNELS.HYDRATION,
        smallIcon: "ic_stat_notification",
        iconColor: "#06B6D4",
        extra: {
          route: "/",
          type: "WATER_REMINDER",
        },
      });
      idOffset++;
    }

    if (waterNotifications.length > 0) {
      await LocalNotifications.schedule({ notifications: waterNotifications });
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("kunal_os_water_notifications_enabled", "true");
    }
    return true;
  } catch (err) {
    console.error("Failed to schedule water notifications:", err);
    return false;
  }
}

/**
 * Cancel recurring Water Reminders
 */
export async function cancelWaterReminders(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem("kunal_os_water_notifications_enabled", "false");
  }
  if (!Capacitor.isNativePlatform()) return;

  try {
    const existingIds = [];
    for (let i = 0; i <= 15; i++) {
      existingIds.push({ id: NOTIFICATION_IDS.WATER_REMINDER_BASE + i });
    }
    await LocalNotifications.cancel({ notifications: existingIds });
  } catch (err) {
    console.error("Cancel water notifications error:", err);
  }
}

/**
 * Schedule a native alarm for a specific task
 */
export async function scheduleTaskNotification(task: {
  id: string;
  title: string;
  remindAt: Date | string;
  description?: string;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  const triggerDate = new Date(task.remindAt);
  if (isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
    return false;
  }

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  const notifId = getTaskNotificationId(task.id);

  try {
    // Cancel any previous alarm for this task
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: `Task Reminder: ${task.title}`,
          body: task.description || "You scheduled a priority reminder for this task.",
          schedule: {
            at: triggerDate,
            allowWhileIdle: true,
          },
          channelId: NOTIFICATION_CHANNELS.TASK_REMINDERS,
          smallIcon: "ic_stat_notification",
          iconColor: "#F59E0B",
          extra: {
            route: "/tasks",
            taskId: task.id,
            type: "TASK_REMINDER",
          },
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("Failed to schedule task notification:", err);
    return false;
  }
}

/**
 * Cancel a scheduled native alarm for a specific task
 */
export async function cancelTaskNotification(taskId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const notifId = getTaskNotificationId(taskId);
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch (err) {
    console.error("Failed to cancel task notification:", err);
  }
}

/**
 * Deterministically hash a date ID and daysBefore offset to a 32-bit int in range [3000000, 3999999]
 */
export function getDateNotificationId(dateId: string, daysBefore: number): number {
  let hash = 0;
  for (let i = 0; i < dateId.length; i++) {
    hash = (hash << 5) - hash + dateId.charCodeAt(i);
    hash |= 0;
  }
  return 3000000 + (Math.abs(hash) % 90000) * 10 + (daysBefore % 10);
}

/**
 * Schedule native alarms for Important Dates (birthdays, anniversaries, bill renewals)
 * using the configured reminderDaysBefore window (e.g. 14, 7, 1, 0 days before at 9:00 AM)
 */
export async function scheduleImportantDateNotifications(dates: {
  id: string;
  name: string;
  date: string;
  category: string;
  repeatPattern?: string;
  reminderDaysBefore?: string;
}[]): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (!Array.isArray(dates) || dates.length === 0) return false;

  const granted = await requestNotificationPermission();
  if (!granted) return false;

  try {
    const notificationsToSchedule: any[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const d of dates) {
      if (!d.date) continue;
      const parts = d.date.split("-").map(Number);
      if (parts.length < 3) continue;
      const [_, month, day] = parts;

      let targetDate = new Date(now.getFullYear(), month - 1, day);
      if (d.repeatPattern === "YEARLY" && targetDate < todayStart) {
        targetDate = new Date(now.getFullYear() + 1, month - 1, day);
      }

      const offsets = (d.reminderDaysBefore || "14,7,1,0")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      for (const daysBefore of offsets) {
        const triggerTime = new Date(targetDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
        triggerTime.setHours(9, 0, 0, 0);

        if (triggerTime.getTime() > Date.now()) {
          const notifId = getDateNotificationId(d.id, daysBefore);
          const label = daysBefore === 0 ? "Today!" : daysBefore === 1 ? "Tomorrow" : `in ${daysBefore} days`;
          notificationsToSchedule.push({
            id: notifId,
            title: daysBefore === 0 ? `🎉 Today: ${d.name}` : `Upcoming: ${d.name} (${label})`,
            body: `${d.name} (${d.category}) is ${label}. Tap to open Dates.`,
            schedule: { at: triggerTime, allowWhileIdle: true },
            channelId: NOTIFICATION_CHANNELS.DAILY_BRIEFING,
            smallIcon: "ic_stat_notification",
            iconColor: "#EF4444",
            extra: {
              route: "/dates",
              dateId: d.id,
              type: "IMPORTANT_DATE",
            },
          });
        }
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: notificationsToSchedule.slice(0, 50) });
    }
    return true;
  } catch (err) {
    console.error("Failed to schedule important date notifications:", err);
    return false;
  }
}

/**
 * Listen for notification tap actions and trigger deep link routing
 */
export async function setupNotificationListeners(
  onNavigate: (route: string, extra?: any) => void
): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};

  try {
    const handle = await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      (action) => {
        const extra = action.notification.extra;
        if (extra && extra.route) {
          onNavigate(extra.route, extra);
        }
      }
    );

    return () => {
      handle.remove();
    };
  } catch (err) {
    console.warn("Failed to attach notification action listener:", err);
    return () => {};
  }
}
