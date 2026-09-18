/**
 * Zero-Knowledge Client-Side Vault Cryptography Module
 * Utilizes standard Web Crypto API (AES-256-GCM + PBKDF2-SHA256)
 *
 * Security Guarantees:
 * 1. Plaintext secrets are NEVER transmitted to or stored on the server.
 * 2. Encryption and Decryption execute exclusively in memory inside the client browser.
 * 3. AES-GCM provides authenticated encryption (prevents tampering or ciphertext manipulation).
 */

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-256-GCM key from master password and salt using PBKDF2
 */
async function deriveCryptoKey(
  password: string,
  salt: Uint8Array,
  usage: KeyUsage[] = ["encrypt", "decrypt"]
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations: 200000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    usage
  );
}

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string;         // Base64
  salt: string;       // Base64
}

/**
 * Encrypt any JSON object or string using the master password
 */
export async function encryptVaultData(
  data: any,
  masterPassword: string
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveCryptoKey(masterPassword, salt, ["encrypt"]);

  const plaintext = typeof data === "string" ? data : JSON.stringify(data);
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    encoded as any
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
    salt: arrayBufferToBase64(salt),
  };
}

/**
 * Decrypt ciphertext payload using the master password
 */
export async function decryptVaultData<T = any>(
  payload: EncryptedPayload,
  masterPassword: string
): Promise<T> {
  const salt = base64ToArrayBuffer(payload.salt);
  const iv = base64ToArrayBuffer(payload.iv);
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);

  const key = await deriveCryptoKey(masterPassword, salt, ["decrypt"]);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    ciphertext as any
  );

  const dec = new TextDecoder();
  const decoded = dec.decode(decryptedBuffer);

  try {
    return JSON.parse(decoded) as T;
  } catch {
    return decoded as unknown as T;
  }
}

/**
 * Generate a high-entropy Emergency Vault Recovery Key (e.g. KOS-7F89-A1B2-C3D4-E5F6)
 */
export function generateEmergencyRecoveryKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
    .join("");

  return `KOS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 24)}`;
}

/**
 * Safe copy to clipboard with auto-clear countdown timer
 */
export async function copyToClipboardWithAutoClear(
  text: string,
  clearSeconds: number = 30,
  onCleared?: () => void
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (clearSeconds > 0) {
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText("");
            if (onCleared) onCleared();
          }
        } catch {
          // Clipboard read permission might be restricted
        }
      }, clearSeconds * 1000);
    }
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}
