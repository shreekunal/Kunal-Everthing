import { NextRequest, NextResponse } from "next/server";
import { verifyUserPin, createSessionToken } from "@/lib/auth";

// Rate limiting map: clientIdentifier -> { attempts: number, lockedUntil?: number }
const loginRateLimit = new Map<string, { attempts: number; lockedUntil?: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "client-ip";

    const now = Date.now();
    const record = loginRateLimit.get(ip);

    // Check active lockout
    if (record?.lockedUntil && record.lockedUntil > now) {
      const waitMinutes = Math.ceil((record.lockedUntil - now) / 60000);
      return NextResponse.json(
        {
          error: `Too many failed attempts. Security lockout active for ${waitMinutes} minute(s).`,
        },
        { status: 429 }
      );
    }

    const { pin } = await req.json();

    if (!pin || typeof pin !== "string" || pin.length !== 4) {
      return NextResponse.json(
        { error: "A valid 4-digit PIN is required" },
        { status: 400 }
      );
    }

    const { success, user } = await verifyUserPin(pin);

    if (!success || !user) {
      const currentAttempts = (record?.attempts || 0) + 1;
      let lockedUntil: number | undefined;

      // Lock out for 10 minutes after 5 consecutive failures
      if (currentAttempts >= 5) {
        lockedUntil = now + 10 * 60 * 1000;
      }

      loginRateLimit.set(ip, { attempts: currentAttempts, lockedUntil });

      const remaining = Math.max(0, 5 - currentAttempts);
      return NextResponse.json(
        {
          error: lockedUntil
            ? "Too many failed attempts. Security lockout active for 10 minutes."
            : `Incorrect PIN. Access denied. (${remaining} attempt${remaining === 1 ? "" : "s"} remaining)`,
        },
        { status: 401 }
      );
    }

    // On successful login, clear the failure record for this client
    loginRateLimit.delete(ip);

    const token = await createSessionToken(user.id, user.email, "pin");

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
  } catch (error: any) {
    console.error("PIN verification error:", error);
    return NextResponse.json(
      { error: "Internal authentication error" },
      { status: 500 }
    );
  }
}
