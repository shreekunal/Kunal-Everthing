import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeHealthConnectPlugin {
  checkAvailability(): Promise<{
    available: boolean;
    status: "AVAILABLE" | "UPDATE_REQUIRED" | "UNAVAILABLE";
    error?: string;
  }>;
  checkHealthPermissions(): Promise<{
    granted: boolean;
    available: boolean;
    error?: string;
  }>;
  requestHealthPermissions(): Promise<{
    granted: boolean;
    error?: string;
  }>;
  getTodaySteps(): Promise<{
    success: boolean;
    status: "OK" | "PERMISSION_REQUIRED" | "UNAVAILABLE" | "ERROR";
    steps: number;
    error?: string;
  }>;
  openSettings(): Promise<{ success: boolean }>;
}

export const HealthConnect = registerPlugin<NativeHealthConnectPlugin>("HealthConnect");

export interface HealthSyncResult {
  success: boolean;
  stepCount?: number;
  source: "HEALTH_CONNECT" | "MANUAL";
  message?: string;
  status?: string;
}

/**
 * Checks whether Health Connect is supported on the current device
 */
export async function isHealthConnectSupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (Capacitor.getPlatform() !== "android") return false;
  try {
    const res = await HealthConnect.checkAvailability();
    return !!res.available;
  } catch {
    return false;
  }
}

/**
 * Checks if Health Connect step reading permission is granted
 */
export async function checkHealthConnectPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return false;
  try {
    const res = await HealthConnect.checkHealthPermissions();
    return !!res.granted;
  } catch {
    return false;
  }
}

/**
 * Requests Health Connect step reading permission
 */
export async function requestHealthConnectPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return false;
  try {
    const res = await HealthConnect.requestHealthPermissions();
    return !!res.granted;
  } catch (err: any) {
    console.error("Health Connect permission request failed:", err);
    return false;
  }
}

/**
 * Opens Health Connect settings on device
 */
export async function openHealthConnect(): Promise<void> {
  if (typeof window === "undefined") return;

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    try {
      await HealthConnect.openSettings();
      return;
    } catch {
      // Fallback
    }
  }

  // Web fallback
  window.open("https://health.google/health-connect-android/", "_blank");
}

/**
 * Fetches today's steps from native Health Connect and automatically saves to vitality
 */
export async function fetchHealthConnectSteps(): Promise<HealthSyncResult> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return {
      success: false,
      source: "MANUAL",
      message: "Health Connect is supported on the Android application.",
    };
  }

  try {
    const res = await HealthConnect.getTodaySteps();
    if (res.success && typeof res.steps === "number") {
      // Post to backend API
      try {
        await fetch("/api/vitality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "LOG_STEPS",
            stepCount: res.steps,
            syncSource: "HEALTH_CONNECT",
          }),
        });
      } catch (postErr) {
        console.warn("Failed to persist synced steps to server:", postErr);
      }

      return {
        success: true,
        stepCount: res.steps,
        source: "HEALTH_CONNECT",
        status: "OK",
      };
    }

    return {
      success: false,
      source: "MANUAL",
      status: res.status,
      message:
        res.error ||
        (res.status === "PERMISSION_REQUIRED"
          ? "Permission required in Health Connect"
          : "Health Connect unavailable"),
    };
  } catch (err: any) {
    console.warn("Health Connect sync error:", err);
    return {
      success: false,
      source: "MANUAL",
      message: err?.message || "Sync failed",
    };
  }
}
