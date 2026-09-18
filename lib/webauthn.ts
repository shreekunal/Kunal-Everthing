/**
 * Client-Side WebAuthn Biometric Utilities (Touch ID, Face ID, Windows Hello, Android Fingerprint)
 */

export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function base64urlToBuffer(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }
  try {
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return isAvailable;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Register new Biometric Passkey / Fingerprint credential with WebAuthn
 */
export async function registerWebAuthnCredential(username: string = "Kunal"): Promise<any> {
  if (typeof window === "undefined" || !navigator.credentials) {
    throw new Error("Biometric authentication is not supported on this browser or device.");
  }

  // Fetch challenge from server
  const challengeRes = await fetch("/api/auth/biometrics");
  if (!challengeRes.ok) {
    throw new Error("Unable to contact authentication server. Please check your connection.");
  }
  const { challenge } = await challengeRes.json();

  const challengeBuffer = challenge
    ? base64urlToBuffer(challenge)
    : crypto.getRandomValues(new Uint8Array(32));

  const userIdBuffer = new TextEncoder().encode(username + "_" + Date.now());
  const currentHost = window.location.hostname || "";
  const rp: { name: string; id?: string } = { name: "Everything" };
  if (currentHost && currentHost !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(currentHost)) {
    rp.id = currentHost;
  }

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer as unknown as BufferSource,
    rp,
    user: {
      id: userIdBuffer as unknown as BufferSource,
      name: `${username.toLowerCase()}@local.os`,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" }, // RS256
      { alg: -8, type: "public-key" },   // Ed25519
      { alg: -37, type: "public-key" },  // PS256
    ],
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "discouraged",
    },
    timeout: 60000,
    attestation: "none",
  };

  let credential: PublicKeyCredential | null = null;
  try {
    credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential;
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric registration was cancelled or timed out.");
    }
    if (err.message && err.message.includes("Web Authentication Service")) {
      throw new Error("Error connecting to Web Authentication Service. Ensure your phone has a screen lock (Fingerprint / PIN) enabled and Google Play Services is up to date.");
    }
    throw new Error(err.message || "Failed to create biometric credential.");
  }

  if (!credential) {
    throw new Error("Biometric enrollment cancelled.");
  }

  const rawIdBase64 = bufferToBase64url(credential.rawId);

  const credentialData = {
    id: credential.id || rawIdBase64,
    rawId: rawIdBase64,
    type: credential.type,
  };

  // Register with backend
  const res = await fetch("/api/auth/biometrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "register",
      credential: credentialData,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to register biometrics");
  }

  return credentialData;
}

/**
 * Authenticate via Biometric WebAuthn (Touch ID, Windows Hello, Fingerprint)
 */
export async function authenticateWithBiometrics(credentialId?: string): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.credentials) {
    throw new Error("Biometric authentication is not supported on this browser.");
  }

  // Fetch status and challenge from backend
  const statusRes = await fetch("/api/auth/biometrics");
  if (!statusRes.ok) {
    throw new Error("Unable to connect to authentication server.");
  }
  const { challenge, credentialId: serverCredId } = await statusRes.json();

  const targetCredId = credentialId || serverCredId;
  if (!targetCredId) {
    throw new Error("No fingerprint enrolled yet. Log in with Master PIN and enroll in Settings.");
  }

  const challengeBuffer = challenge
    ? base64urlToBuffer(challenge)
    : crypto.getRandomValues(new Uint8Array(32));

  const currentHost = window.location.hostname || "";

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challengeBuffer as unknown as BufferSource,
    timeout: 60000,
    userVerification: "preferred",
  };
  if (currentHost && currentHost !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(currentHost)) {
    publicKeyCredentialRequestOptions.rpId = currentHost;
  }

  try {
    publicKeyCredentialRequestOptions.allowCredentials = [
      {
        id: base64urlToBuffer(targetCredId) as unknown as BufferSource,
        type: "public-key",
        transports: ["internal"],
      },
    ];
  } catch {
    // Fallback if parsing fails
  }

  let assertion: PublicKeyCredential | null = null;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    })) as PublicKeyCredential;
  } catch (err: any) {
    if (err.name === "NotAllowedError") {
      throw new Error("Fingerprint verification cancelled or timed out.");
    }
    if (err.message && err.message.includes("Web Authentication Service")) {
      throw new Error("Error connecting to Web Authentication Service. Ensure your phone has a screen lock enabled.");
    }
    throw new Error(err.message || "Biometric authentication failed.");
  }

  if (!assertion) {
    throw new Error("Biometric authentication was cancelled.");
  }

  const assertionData = {
    id: assertion.id,
    rawId: bufferToBase64url(assertion.rawId),
    type: assertion.type,
  };

  const verifyRes = await fetch("/api/auth/biometrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "verify",
      credential: assertionData,
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok) {
    throw new Error(verifyData.error || "Biometric authentication failed.");
  }

  return true;
}
