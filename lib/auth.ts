import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  createSessionToken,
  verifySessionToken,
  TOKEN_COOKIE_NAME,
  getJwtSecretKey,
} from "./jwt";

export {
  createSessionToken,
  verifySessionToken,
  TOKEN_COOKIE_NAME,
  getJwtSecretKey,
};

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function hashPin(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(pin, hash);
}

/**
 * Ensure both Kunal (Male) and Mradul (Female) profiles exist in the system
 */
export async function ensureDualProfiles() {
  // 1. Primary User: Kunal
  let kunal = await prisma.user.findFirst({
    where: { email: "kunal@local.os" },
    include: { settings: true },
  });

  if (!kunal) {
    // If an existing user exists without email kunal@local.os, treat that user as Kunal
    kunal = await prisma.user.findFirst({
      include: { settings: true },
    });
  }

  if (!kunal) {
    const defaultPasswordHash = await hashPassword("kunal123");
    const defaultPinHash = await hashPin("1234");
    kunal = await prisma.user.create({
      data: {
        email: "kunal@local.os",
        name: "Kunal",
        passwordHash: defaultPasswordHash,
        pinHash: defaultPinHash,
        settings: {
          create: {
            currency: "INR",
            timezone: "Asia/Kolkata",
            theme: "pitch-black",
            vaultAutoLockMinutes: 5,
            clipboardClearSecs: 30,
            notificationsEnabled: true,
          },
        },
      },
      include: { settings: true },
    });
  } else {
    // Ensure kunal has pinHash and email set
    if (!kunal.pinHash) {
      const defaultPinHash = await hashPin("1234");
      kunal = await prisma.user.update({
        where: { id: kunal.id },
        data: { pinHash: defaultPinHash },
        include: { settings: true },
      });
    }
  }

  // 2. Partner User: Mradul (Female)
  let mradul = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "mradul@local.os" },
        { name: "Mradul" },
      ],
    },
    include: { settings: true },
  });

  if (!mradul) {
    const defaultPasswordHash = await hashPassword("mradul123");
    const defaultPinHash = await hashPin("1234");
    mradul = await prisma.user.create({
      data: {
        email: "mradul@local.os",
        name: "Mradul",
        passwordHash: defaultPasswordHash,
        pinHash: defaultPinHash,
        settings: {
          create: {
            currency: "INR",
            timezone: "Asia/Kolkata",
            theme: "pitch-black",
            vaultAutoLockMinutes: 5,
            clipboardClearSecs: 30,
            notificationsEnabled: true,
          },
        },
      },
      include: { settings: true },
    });
  }

  // 3. Ensure reciprocal relationship records between Kunal and Mradul
  try {
    const kunalPartner = await prisma.partner.findFirst({
      where: { userId: kunal.id },
    });
    if (!kunalPartner) {
      await prisma.partner.create({
        data: {
          userId: kunal.id,
          name: "Mradul",
          nickname: "Golu",
          phone: "+919520675476",
          birthday: "2008-06-08",
          anniversary: "2025-01-07",
          preferredChannel: "WHATSAPP",
        },
      });
    }

    const mradulPartner = await prisma.partner.findFirst({
      where: { userId: mradul.id },
    });
    if (!mradulPartner) {
      await prisma.partner.create({
        data: {
          userId: mradul.id,
          name: "Kunal",
          nickname: "My Love",
          birthday: kunalPartner?.birthday || null,
          anniversary: kunalPartner?.anniversary || "2025-01-07",
          preferredChannel: "WHATSAPP",
        },
      });
    }
  } catch (err) {
    // Non-fatal if partner tables already populated
  }

  return { kunal, mradul };
}

/**
 * Get available profiles metadata for Prime Video lock screen
 */
export async function getAvailableProfiles() {
  const { kunal, mradul } = await ensureDualProfiles();

  return [
    {
      id: mradul.id,
      name: "Mradul",
      gender: "FEMALE" as const,
      role: "PARTNER" as const,
      email: mradul.email,
      hasPin: !!mradul.pinHash,
      hasBiometrics: !!mradul.biometricCredential,
      accentColor: "#f43f5e", // Rose-500
      glowColor: "rgba(244, 63, 94, 0.4)",
    },
    {
      id: kunal.id,
      name: "Kunal",
      gender: "MALE" as const,
      role: "PRIMARY" as const,
      email: kunal.email,
      hasPin: !!kunal.pinHash,
      hasBiometrics: !!kunal.biometricCredential,
      accentColor: "#ef4444", // Brand Red
      glowColor: "rgba(239, 68, 68, 0.4)",
    },
  ];
}

/**
 * Get or create the default primary user for KunalOS
 */
export async function getOrCreateDefaultUser() {
  const { kunal } = await ensureDualProfiles();
  return kunal;
}

/**
 * Verify user PIN for either a specific user or across available profiles
 */
export async function verifyUserPin(
  pin: string,
  targetUserId?: string
): Promise<{ success: boolean; user?: any }> {
  const { kunal, mradul } = await ensureDualProfiles();

  if (targetUserId) {
    const user = targetUserId === kunal.id ? kunal : targetUserId === mradul.id ? mradul : null;
    if (!user) return { success: false };
    if (!user.pinHash) {
      return { success: pin === "1234", user };
    }
    const isMatch = await verifyPin(pin, user.pinHash);
    return { success: isMatch, user: isMatch ? user : undefined };
  }

  // If no target specified, check against both profiles
  for (const user of [mradul, kunal]) {
    if (!user.pinHash) {
      if (pin === "1234") return { success: true, user };
    } else {
      const isMatch = await verifyPin(pin, user.pinHash);
      if (isMatch) return { success: true, user };
    }
  }

  return { success: false };
}

/**
 * Update user 4-digit PIN
 */
export async function updateUserPin(userId: string, newPin: string): Promise<boolean> {
  if (!/^\d{4}$/.test(newPin)) {
    throw new Error("PIN must be exactly 4 digits");
  }
  const pinHash = await hashPin(newPin);
  await prisma.user.update({
    where: { id: userId },
    data: { pinHash },
  });
  return true;
}

/**
 * Save Biometric WebAuthn Credential
 */
export async function saveBiometricCredential(userId: string, credentialJson: string): Promise<boolean> {
  await prisma.user.update({
    where: { id: userId },
    data: { biometricCredential: credentialJson },
  });
  return true;
}

/**
 * Remove Biometric WebAuthn Credential
 */
export async function removeBiometricCredential(userId: string): Promise<boolean> {
  await prisma.user.update({
    where: { id: userId },
    data: { biometricCredential: null },
  });
  return true;
}

/**
 * Get current authenticated user from session cookie.
 * In production, NO FALLBACK is permitted. Returns null if unauthenticated or invalid session.
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = await verifySessionToken(token);
    if (!payload?.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { settings: true },
    });

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * Ensures an authenticated user exists, throwing an error if unauthenticated.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized: Valid session required");
  }
  return user;
}

