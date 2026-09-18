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
    throw new Error("WebAuthn is not supported on this browser/device.");
  }

  // Fetch challenge from server
  const challengeRes = await fetch("/api/auth/biometrics");
  const { challenge } = await challengeRes.json();

  const challengeBuffer = challenge
    ? base64urlToBuffer(challenge)
    : crypto.getRandomValues(new Uint8Array(32));

  const userIdBuffer = new TextEncoder().encode(username + "_" + Date.now());

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer as unknown as BufferSource,
    rp: {
      name: "KunalOS",
      id: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
    },
    user: {
      id: userIdBuffer as unknown as BufferSource,
      name: `${username.toLowerCase()}@local.os`,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },  // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
    attestation: "none",
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Biometric enrollment failed or cancelled.");
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
    throw new Error("WebAuthn is not supported on this browser.");
  }

  // Fetch status and challenge from backend
  const statusRes = await fetch("/api/auth/biometrics");
  const { challenge, credentialId: serverCredId } = await statusRes.json();

  const targetCredId = credentialId || serverCredId;
  const challengeBuffer = challenge
    ? base64urlToBuffer(challenge)
    : crypto.getRandomValues(new Uint8Array(32));

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challengeBuffer as unknown as BufferSource,
    timeout: 60000,
    userVerification: "required",
    rpId: window.location.hostname === "localhost" ? "localhost" : window.location.hostname,
  };

  if (targetCredId) {
    try {
      publicKeyCredentialRequestOptions.allowCredentials = [
        {
          id: base64urlToBuffer(targetCredId) as unknown as BufferSource,
          type: "public-key",
          transports: ["internal"],
        },
      ];
    } catch {
      // If parsing fails, allow credential selection automatically
    }
  }


  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  })) as PublicKeyCredential;

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
