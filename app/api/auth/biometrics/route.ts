import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  saveBiometricCredential,
  removeBiometricCredential,
  createSessionToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    let credentialData = null;

    if (user?.biometricCredential) {
      try {
        credentialData = JSON.parse(user.biometricCredential);
      } catch {
        credentialData = { id: user.biometricCredential };
      }
    }

    // Generate random 32-byte challenge for WebAuthn
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");

    return NextResponse.json({
      hasBiometrics: !!user?.biometricCredential,
      credentialId: credentialData?.id || null,
      challenge,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
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

        targetUser =
          usersWithBio.find((u) => {
            try {
              const parsed = JSON.parse(u.biometricCredential!);
              return parsed.id === credential?.id;
            } catch {
              return u.biometricCredential === credential?.id;
            }
          }) || usersWithBio[0] || null;
      }

      if (!targetUser || !targetUser.biometricCredential) {
        return NextResponse.json(
          { error: "No biometric credential registered for this profile." },
          { status: 400 }
        );
      }

      let storedCred;
      try {
        storedCred = JSON.parse(targetUser.biometricCredential);
      } catch {
        storedCred = { id: targetUser.biometricCredential };
      }

      // If credential ID matches or is an authenticated native biometric hardware confirmation
      const isNativeBiometric = credential?.type === "native_biometric";
      const isMatchingCred = storedCred.id ? credential?.id === storedCred.id : true;

      if (!credential || !credential.id || (!isMatchingCred && !isNativeBiometric)) {
        return NextResponse.json(
          { error: "Biometric identification failed. Credential mismatch." },
          { status: 401 }
        );
      }

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
