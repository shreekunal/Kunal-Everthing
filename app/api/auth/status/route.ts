import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, getOrCreateDefaultUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {

  try {
    const cookieStore = cookies();
    const token = cookieStore.get("kunal_os_token")?.value;
    const defaultUser = await getOrCreateDefaultUser();

    let authenticated = false;
    let authMethod = null;

    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.userId) {
        authenticated = true;
        authMethod = payload.authMethod || "pin";
      }
    }

    return NextResponse.json({
      authenticated,
      authMethod,
      hasBiometrics: !!defaultUser.biometricCredential,
      userName: defaultUser.name || "Kunal",
    });
  } catch (error: any) {
    console.error("Auth status error:", error);
    return NextResponse.json(
      { authenticated: false, hasBiometrics: false, error: "Failed to verify auth status" },
      { status: 500 }
    );
  }
}
