import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch today's water count and target for a user (or current user)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || user.id;
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const referenceId = `water_count_${todayKey}`;

    const log = await prisma.rewardLog.findFirst({
      where: {
        userId: targetUserId,
        referenceId,
      },
      orderBy: { createdAt: "desc" },
    });

    let count = 0;
    let target = 8;

    if (log && log.reason) {
      try {
        const parsed = JSON.parse(log.reason);
        if (typeof parsed.count === "number") count = parsed.count;
        if (typeof parsed.target === "number") target = parsed.target;
      } catch {
        count = log.points || 0;
      }
    }

    return NextResponse.json({
      userId: targetUserId,
      date: todayKey,
      count,
      target,
    });
  } catch (error: any) {
    console.error("Water GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Sync water count and target for the current user
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const count = typeof body.count === "number" ? Math.max(0, body.count) : 0;
    const target = typeof body.target === "number" ? Math.max(1, body.target) : 8;

    const todayKey = format(new Date(), "yyyy-MM-dd");
    const referenceId = `water_count_${todayKey}`;

    // Upsert or record today's hydration log
    const existing = await prisma.rewardLog.findFirst({
      where: {
        userId: user.id,
        referenceId,
      },
    });

    const payload = {
      userId: user.id,
      points: count,
      type: "WATER_LOG",
      title: `Hydration: ${count}/${target} glasses`,
      reason: JSON.stringify({ count, target }),
      category: "HEALTH",
      referenceId,
    };

    if (existing) {
      await prisma.rewardLog.update({
        where: { id: existing.id },
        data: {
          points: count,
          title: `Hydration: ${count}/${target} glasses`,
          reason: JSON.stringify({ count, target }),
        },
      });
    } else {
      await prisma.rewardLog.create({
        data: payload,
      });
    }

    return NextResponse.json({
      success: true,
      count,
      target,
    });
  } catch (error: any) {
    console.error("Water POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
