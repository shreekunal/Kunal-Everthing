import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  registerWebAuthnCredential,
  authenticateWithBiometrics as authenticateWebAuthn,
  isBiometricsAvailable as isWebAuthnAvailable,
} from "./webauthn";

interface NativeBiometricPlugin {
  isAvailable(): Promise<{ isAvailable: boolean; biometryType?: string; error?: string }>;
  authenticate(options?: { title?: string; subtitle?: string; reason?: string }): Promise<{ success: boolean }>;
  cancelAuthentication(): Promise<{ cancelled: boolean }>;
}

const NativeBiometric = registerPlugin<NativeBiometricPlugin>("NativeBiometric");

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server_device";
  let deviceId = localStorage.getItem("kunal_os_device_id");
  if (!deviceId) {
    deviceId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "dev_" + Math.random().toString(36).substring(2, 12);
    localStorage.setItem("kunal_os_device_id", deviceId);
  }
  return deviceId;
}

/**
 * Check if biometrics (fingerprint / face / Touch ID) are available on this device
 */
export async function checkDeviceBiometrics(): Promise<{ isAvailable: boolean; isNative: boolean; error?: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await NativeBiometric.isAvailable();
      return { isAvailable: !!res.isAvailable, isNative: true, error: res.error };
    } catch (err: any) {
      return { isAvailable: false, isNative: true, error: err.message };
    }
  }

  // Web Browser fallback
  const available = await isWebAuthnAvailable();
  return { isAvailable: available, isNative: false };
}

/**
 * Cancel any ongoing native biometric prompt
 */
export async function cancelDeviceBiometrics(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await NativeBiometric.cancelAuthentication();
    } catch {
      // Ignored
    }
  }
}

/**
 * Enroll / Register biometrics on the current device for the active user
 */
export async function enrollDeviceBiometrics(userName?: string): Promise<{ success: boolean; isNative: boolean; credentialId?: string }> {
  if (Capacitor.isNativePlatform()) {
    const deviceId = getOrCreateDeviceId();
    const credId = `native_bio_${deviceId}`;

    // 1. Trigger native Android BiometricPrompt to confirm fingerprint works
    await NativeBiometric.authenticate({
      title: "Everything Security",
      subtitle: "Enroll Device Fingerprint",
      reason: "Touch your fingerprint sensor to register biometric unlock on this phone",
    });

    // 2. Register native device credential with server
    const res = await fetch("/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register",
        credential: {
          id: credId,
          type: "native_biometric",
          deviceId,
          enrolledAt: new Date().toISOString(),
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save biometric enrollment on server.");
    }

    return { success: true, isNative: true, credentialId: credId };
  }

  // Web fallback: WebAuthn passkey
  const cred = await registerWebAuthnCredential(userName || "Kunal");
  return { success: true, isNative: false, credentialId: cred.id };
}

/**
 * Authenticate and unlock using device biometrics (Fingerprint / Face ID)
 */
export async function authenticateDeviceBiometrics(userId?: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("Device is offline. Server connection is required for biometric session renewal. Please unlock with 4-digit PIN.");
    }

    const deviceId = getOrCreateDeviceId();

    // 1. Trigger native Android system BiometricPrompt
    await NativeBiometric.authenticate({
      title: "Everything Security",
      subtitle: "Fingerprint Unlock",
      reason: "Touch the fingerprint sensor to unlock your workspace",
    });

    // 2. Notify backend to issue verified session token & cookie for selected profile
    const res = await fetch("/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        userId: userId || undefined,
        credential: {
          id: `native_bio_${deviceId}`,
          type: "native_biometric",
          deviceId,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Biometric authentication failed on server.");
    }

    return true;
  }

  // Web fallback: Browser WebAuthn assertion
  return await authenticateWebAuthn(userId);
}
