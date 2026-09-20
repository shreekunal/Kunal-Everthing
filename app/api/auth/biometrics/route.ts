import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  saveBiometricCredential,
  removeBiometricCredential,
  createSessionToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rate limiting map: clientIdentifier -> { attempts: number, lockedUntil?: number }
const biometricRateLimit = new Map<string, { attempts: number; lockedUntil?: number }>();

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    let targetUser: any = user;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    } else if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { biometricCredential: { not: null } },
      });
    }

    let credentialData = null;

    if (targetUser?.biometricCredential) {
      try {
        credentialData = JSON.parse(targetUser.biometricCredential);
      } catch {
        credentialData = { id: targetUser.biometricCredential };
      }
    }

    // Generate random 32-byte challenge for WebAuthn
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");

    return NextResponse.json({
      hasBiometrics: !!targetUser?.biometricCredential,
      credentialId: credentialData?.id || null,
      challenge,
      user: targetUser
        ? {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Biometrics GET error:", error);
    return NextResponse.json({ error: "Failed to retrieve biometric status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "client-ip";

    const now = Date.now();
    const record = biometricRateLimit.get(ip);

    // Check active lockout
    if (record?.lockedUntil && record.lockedUntil > now) {
      const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          error: `Too many failed biometric attempts. Security lockout active for ${waitMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action, credential, userId } = body;

    if (action === "register") {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required to enroll biometrics. Please log in first." },
          { status: 401 }
        );
      }

      if (!credential || !credential.id) {
        return NextResponse.json({ error: "Valid biometric credential is required" }, { status: 400 });
      }

      await saveBiometricCredential(user.id, JSON.stringify(credential));

      return NextResponse.json({
        success: true,
        message: "Biometric Fingerprint registered successfully.",
      });
    }

    if (action === "verify") {
      let targetUser = null;

      if (userId) {
        targetUser = await prisma.user.findUnique({ where: { id: userId } });
      } else {
        // Look up registered biometric across profiles
        const usersWithBio = await prisma.user.findMany({
          where: { biometricCredential: { not: null } },
        });

        if (usersWithBio.length === 1) {
          targetUser = usersWithBio[0];
        } else if (usersWithBio.length > 1) {
          // Disambiguate by matching credential id or deviceId
          const matched = usersWithBio.filter((u) => {
            try {
              const parsed = JSON.parse(u.biometricCredential!);
              return (
                parsed.id === credential?.id ||
                (parsed.deviceId && parsed.deviceId === credential?.deviceId)
              );
            } catch {
              return u.biometricCredential === credential?.id;
            }
          });

          if (matched.length === 1) {
            targetUser = matched[0];
          } else {
            return NextResponse.json(
              { error: "Multiple profiles available. Please select your profile before unlocking with fingerprint." },
              { status: 400 }
            );
          }
        }
      }

      if (!targetUser || !targetUser.biometricCredential) {
        return NextResponse.json(
          { error: "No biometric credential registered for this profile." },
          { status: 400 }
        );
      }

      let storedCred: any;
      try {
        storedCred = JSON.parse(targetUser.biometricCredential);
      } catch {
        storedCred = { id: targetUser.biometricCredential };
      }

      // Validate credential matches
      const isNativeBiometric = credential?.type === "native_biometric";
      const isIdMatch = storedCred.id && credential?.id === storedCred.id;
      const isDeviceMatch = storedCred.deviceId && credential?.deviceId && storedCred.deviceId === credential?.deviceId;
      const isValid = isIdMatch || isDeviceMatch || (isNativeBiometric && storedCred.type === "native_biometric");

      if (!credential || !credential.id || !isValid) {
        const currentAttempts = (record?.attempts || 0) + 1;
        let lockedUntil: number | undefined;

        if (currentAttempts >= 5) {
          lockedUntil = now + 10 * 60 * 1000;
        }

        biometricRateLimit.set(ip, { attempts: currentAttempts, lockedUntil });
        const remaining = Math.max(0, 5 - currentAttempts);

        return NextResponse.json(
          {
            error: lockedUntil
              ? "Too many failed biometric attempts. Security lockout active for 10 minutes."
              : `Biometric verification failed. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`,
          },
          { status: 401 }
        );
      }

      // Success: clear rate limit record
      biometricRateLimit.delete(ip);

      const token = await createSessionToken(targetUser.id, targetUser.email, "biometric");

      const response = NextResponse.json({
        success: true,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
        },
      });

      response.cookies.set({
        name: "kunal_os_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Biometrics POST error:", error);
    return NextResponse.json({ error: error.message || "Biometric authentication failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("kunal_os_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await removeBiometricCredential(user.id);

    return NextResponse.json({
      success: true,
      message: "Biometric fingerprint removed successfully.",
    });
  } catch (error: any) {
    console.error("Biometrics DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove biometrics" }, { status: 500 });
  }
}
