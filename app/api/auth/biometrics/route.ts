import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getOrCreateDefaultUser,
  saveBiometricCredential,
  removeBiometricCredential,
  createSessionToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {

  try {
    const user = await getOrCreateDefaultUser();
    let credentialData = null;

    if (user.biometricCredential) {
      try {
        credentialData = JSON.parse(user.biometricCredential);
      } catch {
        credentialData = { id: user.biometricCredential };
      }
    }

    // Generate random 32-byte challenge for WebAuthn
    const challenge = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");

    return NextResponse.json({
      hasBiometrics: !!user.biometricCredential,
      credentialId: credentialData?.id || null,
      challenge,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Biometrics GET error:", error);
    return NextResponse.json({ error: "Failed to retrieve biometric status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, credential } = body;

    const user = await getOrCreateDefaultUser();

    if (action === "register") {
      const token = req.cookies.get("kunal_os_token")?.value;
      if (!token) {
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
      if (!user.biometricCredential) {
        return NextResponse.json(
          { error: "No biometric credential registered on this device." },
          { status: 400 }
        );
      }

      let storedCred;
      try {
        storedCred = JSON.parse(user.biometricCredential);
      } catch {
        storedCred = { id: user.biometricCredential };
      }

      // If credential ID matches or credential passed verification
      if (!credential || !credential.id || (storedCred.id && credential.id !== storedCred.id)) {
        return NextResponse.json(
          { error: "Biometric identification failed. Credential mismatch." },
          { status: 401 }
        );
      }

      const token = await createSessionToken(user.id, user.email, "biometric");

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
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
