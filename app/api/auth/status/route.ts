import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, getAvailableProfiles, ensureDualProfiles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("kunal_os_token")?.value;
    const { kunal, mradul } = await ensureDualProfiles();
    const profiles = await getAvailableProfiles();

    let authenticated = false;
    let authMethod = null;
    let currentUser = kunal;

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
      userId: currentUser.id,
      userName: currentUser.name || "Kunal",
      userEmail: currentUser.email,
      hasBiometrics: !!currentUser.biometricCredential,
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
