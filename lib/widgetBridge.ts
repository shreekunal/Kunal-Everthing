import { Capacitor, registerPlugin } from "@capacitor/core";

export interface WidgetTaskItem {
  id?: string;
  title: string;
  priority: string;
}

export interface WidgetPartnerInfo {
  name: string;
  focusingNow: boolean;
  focusProject?: string | null;
  pendingTasksCount: number;
}

export interface WidgetNextDate {
  name: string;
  daysLeft: number;
}

export interface WidgetSnapshotData {
  updatedAt: number; // epoch milliseconds
  userName: string;
  tasksDueToday: WidgetTaskItem[];
  routinesLeftCount: number;
  waterMl: number;
  waterGoal: number;
  steps: number;
  stepsGoal: number;
  nextDate?: WidgetNextDate | null;
  daysTogether: number;
  nextAnniversary?: {
    name: string;
    daysLeft: number;
  } | null;
  disciplineStreak: number;
  petStage: string;
  partner?: WidgetPartnerInfo | null;
}

export interface NativeWidgetBridgePlugin {
  updateSnapshot(options: { json: string }): Promise<void>;
  saveToken(options: { token: string }): Promise<{ success: boolean }>;
  clearToken(): Promise<{ success: boolean }>;
  getTokenStatus(): Promise<{ hasToken: boolean }>;
}

export const WidgetBridge = registerPlugin<NativeWidgetBridgePlugin>("WidgetBridge");

/**
 * Pushes the offline snapshot JSON to native storage and updates all widgets.
 * Safe no-op on web / non-Android platforms.
 */
export async function pushWidgetSnapshot(snapshot: WidgetSnapshotData): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return false;
  }

  try {
    const json = JSON.stringify(snapshot);
    await WidgetBridge.updateSnapshot({ json });
    return true;
  } catch (err) {
    console.warn("Failed to push widget snapshot:", err);
    return false;
  }
}

/**
 * Persists the revocable widget token into Android Keystore EncryptedSharedPreferences.
 */
export async function saveNativeWidgetToken(token: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return false;
  }
  try {
    const res = await WidgetBridge.saveToken({ token });
    return !!res.success;
  } catch (err) {
    console.warn("Failed to save native widget token:", err);
    return false;
  }
}

/**
 * Revokes and deletes the widget token from native EncryptedSharedPreferences.
 */
export async function clearNativeWidgetToken(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return false;
  }
  try {
    const res = await WidgetBridge.clearToken();
    return !!res.success;
  } catch (err) {
    console.warn("Failed to clear native widget token:", err);
    return false;
  }
}

/**
 * Checks whether native EncryptedSharedPreferences contains an active token.
 */
export async function getNativeWidgetTokenStatus(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return false;
  }
  try {
    const res = await WidgetBridge.getTokenStatus();
    return !!res.hasToken;
  } catch {
    return false;
  }
}
