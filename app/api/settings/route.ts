import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        vaultAutoLockMinutes: 5,
        theme: "pitch-black",
        currency: "INR",
        timezone: "Asia/Kolkata",
        notificationsEnabled: true,
      },
      update: {},
    });

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      vaultAutoLockMinutes,
      theme,
      currency,
      timezone,
      notificationsEnabled,
      clipboardClearSecs,
    } = body;

    const data: any = {};
    if (vaultAutoLockMinutes !== undefined) {
      data.vaultAutoLockMinutes = parseInt(vaultAutoLockMinutes, 10);
    }
    if (theme !== undefined) data.theme = String(theme);
    if (currency !== undefined) data.currency = String(currency);
    if (timezone !== undefined) data.timezone = String(timezone);
    if (notificationsEnabled !== undefined) {
      data.notificationsEnabled = Boolean(notificationsEnabled);
    }
    if (clipboardClearSecs !== undefined) {
      data.clipboardClearSecs = parseInt(clipboardClearSecs, 10);
    }

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
