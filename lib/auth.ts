import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "kunal-os-ultra-secure-jwt-secret-key-2026"
);

const TOKEN_COOKIE_NAME = "kunal_os_token";

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

export async function createSessionToken(userId: string, email: string, authMethod: string = "pin"): Promise<string> {
  return await new SignJWT({ userId, email, authMethod })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<{ userId: string; email: string; authMethod?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      authMethod: payload.authMethod as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get or create the default user for KunalOS (ensures frictionless personal usage)
 */
export async function getOrCreateDefaultUser() {
  let user = await prisma.user.findFirst({
    include: { settings: true },
  });

  if (!user) {
    const defaultPasswordHash = await hashPassword("kunal123");
    const defaultPinHash = await hashPin("1234");
    user = await prisma.user.create({
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
  } else if (!user.pinHash) {
    // Ensure default PIN is set to 1234 if user existed prior to PIN column
    const defaultPinHash = await hashPin("1234");
    user = await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: defaultPinHash },
      include: { settings: true },
    });
  }

  return user;
}

/**
 * Verify user PIN
 */
export async function verifyUserPin(pin: string): Promise<{ success: boolean; user?: any }> {
  const user = await getOrCreateDefaultUser();
  if (!user.pinHash) {
    return { success: pin === "1234", user };
  }
  const isMatch = await verifyPin(pin, user.pinHash);
  return { success: isMatch, user: isMatch ? user : undefined };
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
 * Get current authenticated user from cookie, or fallback to default single user
 */
export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.userId) {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { settings: true },
        });
        if (user) return user;
      }
    }

    return await getOrCreateDefaultUser();
  } catch {
    return await getOrCreateDefaultUser();
  }
}

