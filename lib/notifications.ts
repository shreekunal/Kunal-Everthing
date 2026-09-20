import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Channel } from "@capacitor/local-notifications";

export const NOTIFICATION_IDS = {
  MORNING_BRIEFING: 1001,
  STREAK_DEFENDER: 1002,
  WATER_REMINDER_BASE: 2000,
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
        description: "Morning priorities and evening streak defender alarms",
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
        importance: 3, // Default importance
        visibility: 1,
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
 * Schedule recurring Morning (8:00 AM) and Evening (9:00 PM) alarms
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
 * Cancel all core notifications
 */
export async function cancelCoreNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIFICATION_IDS.MORNING_BRIEFING },
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
      (n) => n.id === NOTIFICATION_IDS.MORNING_BRIEFING || n.id === NOTIFICATION_IDS.STREAK_DEFENDER
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
