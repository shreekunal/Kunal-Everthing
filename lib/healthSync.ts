import { Capacitor } from "@capacitor/core";

export interface HealthSyncResult {
  success: boolean;
  stepCount?: number;
  source: "HEALTH_CONNECT" | "MANUAL";
  message?: string;
}

/**
 * Checks whether native Health Connect is supported and accessible
 */
export async function isHealthConnectSupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  return Capacitor.getPlatform() === "android";
}

/**
 * Opens Google Health Connect settings on Android, or web portal as fallback
 */
export function openHealthConnect(): void {
  if (typeof window === "undefined") return;
  
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    // 1. Try launching modern Health Connect system settings intent (Android 14+)
    try {
      window.location.href = "intent:#Intent;action=androidx.health.ACTION_HEALTH_CONNECT_SETTINGS;end";
      return;
    } catch {
      // Intent scheme fallback
    }

    // 2. Try launching fallback Android settings
    try {
      window.location.href = "intent:#Intent;action=android.settings.HEALTH_CONNECT_SETTINGS;end";
      return;
    } catch {
      // Fallback
    }
  }
  
  // Web documentation / info portal fallback
  window.open("https://health.google/health-connect-android/", "_blank");
}

/**
 * Attempt to read today's steps from Health Connect or return fallback
 */
export async function fetchHealthConnectSteps(): Promise<HealthSyncResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      source: "MANUAL",
      message: "Health Connect auto-sync is available on the Android app.",
    };
  }

  try {
    // Check if dynamic health plugin is installed in native bundle
    const plugins = (window as any).Capacitor?.Plugins;
    const Health = plugins?.Health || plugins?.HealthConnect;

    if (Health && typeof Health.queryAggregated === "function") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const res = await Health.queryAggregated({
        dataType: "steps",
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
      });

      const steps = Math.round(Number(res?.value || res?.steps || 0));
      return {
        success: true,
        stepCount: steps,
        source: "HEALTH_CONNECT",
      };
    }

    return {
      success: false,
      source: "MANUAL",
      message: "Health Connect plugin not ready. Using manual tracking.",
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
