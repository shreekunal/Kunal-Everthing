import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, getAvailableProfiles, ensureDualProfiles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("kunal_os_token")?.value;
    await ensureDualProfiles();
    const profiles = await getAvailableProfiles();

    let authenticated = false;
    let authMethod: string | null = null;
    let currentUser: any = null;

    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.userId) {
        const found = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: { settings: true },
        });
        if (found) {
          authenticated = true;
          authMethod = payload.authMethod || "pin";
          currentUser = found;
        }
      }
    }

    return NextResponse.json({
      authenticated,
      authMethod,
      userId: currentUser?.id || null,
      userName: currentUser?.name || null,
      userEmail: currentUser?.email || null,
      hasBiometrics: currentUser ? !!currentUser.biometricCredential : false,
      profiles,
    });
  } catch (error: any) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      { authenticated: false, hasBiometrics: false, error: "Failed to verify auth status" },
      { status: 500 }
    );
  }
}
