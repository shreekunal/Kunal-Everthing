import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export const NOTIFICATION_IDS = {
  MORNING_BRIEFING: 1001,
  STREAK_DEFENDER: 1002,
  WATER_REMINDER_BASE: 2000,
  TEST_NOTIFICATION: 9999,
};

/**
 * Smart Local Notification Manager for Everything
 * Schedules recurring native Android alarms without server daemon dependencies.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;

    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
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
          smallIcon: "ic_launcher",
          iconColor: "#EF4444",
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
          smallIcon: "ic_launcher",
          iconColor: "#EF4444",
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
          schedule: { at: triggerAt },
          smallIcon: "ic_launcher",
          iconColor: "#EF4444",
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
export async function scheduleWaterReminders(intervalHours = 2, startHour = 9, endHour = 21): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Browser Notification fallback if supported
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
        smallIcon: "ic_launcher",
        iconColor: "#06B6D4",
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

