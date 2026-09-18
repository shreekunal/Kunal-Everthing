import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  registerWebAuthnCredential,
  authenticateWithBiometrics as authenticateWebAuthn,
  isBiometricsAvailable as isWebAuthnAvailable,
} from "./webauthn";

interface NativeBiometricPlugin {
  isAvailable(): Promise<{ isAvailable: boolean; biometryType?: string; error?: string }>;
  authenticate(options?: { title?: string; subtitle?: string; reason?: string }): Promise<{ success: boolean }>;
}

const NativeBiometric = registerPlugin<NativeBiometricPlugin>("NativeBiometric");

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
 * Enroll / Register biometrics on the current device
 */
export async function enrollDeviceBiometrics(): Promise<{ success: boolean; isNative: boolean; credentialId?: string }> {
  if (Capacitor.isNativePlatform()) {
    // 1. Trigger native Android BiometricPrompt to confirm fingerprint works
    await NativeBiometric.authenticate({
      title: "Everything",
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
          id: "native_android_device",
          type: "native_biometric",
          enrolledAt: new Date().toISOString(),
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to save biometric enrollment on server.");
    }

    return { success: true, isNative: true, credentialId: "native_android_device" };
  }

  // Web fallback: WebAuthn passkey
  const cred = await registerWebAuthnCredential("Kunal");
  return { success: true, isNative: false, credentialId: cred.id };
}

/**
 * Authenticate and unlock using device biometrics (Fingerprint / Face ID)
 */
export async function authenticateDeviceBiometrics(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    // 1. Trigger native Android system BiometricPrompt
    await NativeBiometric.authenticate({
      title: "Everything",
      subtitle: "Fingerprint Unlock",
      reason: "Touch the fingerprint sensor to unlock your portal",
    });

    // 2. Notify backend to issue verified session token & cookie
    const res = await fetch("/api/auth/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        credential: {
          id: "native_android_device",
          type: "native_biometric",
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
  return await authenticateWebAuthn();
}
