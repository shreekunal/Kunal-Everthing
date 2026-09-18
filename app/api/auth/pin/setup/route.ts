import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, verifyPin, updateUserPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPin, newPin } = await req.json();

    if (!newPin || typeof newPin !== "string" || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { error: "New PIN must be exactly 4 numeric digits." },
        { status: 400 }
      );
    }

    // Verify current PIN if user already has one configured
    if (user.pinHash) {
      if (!currentPin) {
        return NextResponse.json(
          { error: "Current PIN is required to change PIN." },
          { status: 400 }
        );
      }
      const isMatch = await verifyPin(currentPin, user.pinHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Current PIN is incorrect." },
          { status: 401 }
        );
      }
    }

    await updateUserPin(user.id, newPin);

    return NextResponse.json({
      success: true,
      message: "4-Digit Master PIN updated successfully.",
    });
  } catch (error: any) {
    console.error("PIN setup error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update PIN" },
      { status: 500 }
    );
  }
}
