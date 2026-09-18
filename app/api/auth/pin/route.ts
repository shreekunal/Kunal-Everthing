import { NextRequest, NextResponse } from "next/server";
import { verifyUserPin, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== "string" || pin.length !== 4) {
      return NextResponse.json(
        { error: "A valid 4-digit PIN is required" },
        { status: 400 }
      );
    }

    const { success, user } = await verifyUserPin(pin);

    if (!success || !user) {
      return NextResponse.json(
        { error: "Incorrect PIN. Access denied." },
        { status: 401 }
      );
    }

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
