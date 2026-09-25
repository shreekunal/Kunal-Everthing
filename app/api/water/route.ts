import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, subDays, parseISO } from "date-fns";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch today's water count & target, along with 7-day rolling weekly hydration track
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

    // Last 7 days keys
    const past7DaysKeys = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
    );

    const logs = await prisma.rewardLog.findMany({
      where: {
        userId: targetUserId,
        category: { in: ["HEALTH", "GENERAL"] },
        OR: [
          { referenceId: { in: past7DaysKeys.map((d) => `water_count_${d}`) } },
          { referenceId: { in: past7DaysKeys.map((d) => `water_${d}`) } },
          { type: "WATER_LOG" },
          { type: "REWARD_WATER" },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const waterByDate = new Map<string, { count: number; target: number }>();
    for (const log of logs) {
      let dKey = "";
      if (log.referenceId?.startsWith("water_count_")) {
        dKey = log.referenceId.replace("water_count_", "");
      } else if (log.referenceId?.startsWith("water_")) {
        dKey = log.referenceId.replace("water_", "");
      } else {
        dKey = format(log.createdAt, "yyyy-MM-dd");
      }

      if (!waterByDate.has(dKey)) {
        let count = 0;
        let target = 8;
        if (log.reason) {
          try {
            const parsed = JSON.parse(log.reason);
            if (typeof parsed.count === "number") count = parsed.count;
            if (typeof parsed.target === "number") target = parsed.target;
          } catch {
            count = log.points || 0;
          }
        } else if (log.type === "REWARD_WATER") {
          count = 8;
        }
        waterByDate.set(dKey, { count, target });
      }
    }

    const todayData = waterByDate.get(todayKey) || { count: 0, target: 8 };

    const weeklyDays = past7DaysKeys.map((dStr) => {
      const data = waterByDate.get(dStr) || { count: 0, target: 8 };
      const dDate = parseISO(dStr);
      return {
        date: dStr,
        dayLabel: format(dDate, "EEE"),
        dayNumber: format(dDate, "d"),
        count: data.count,
        target: data.target,
        goalMet: data.count >= data.target,
        percent: Math.min(100, Math.round((data.count / Math.max(1, data.target)) * 100)),
      };
    });

    const totalWeeklyGlasses = weeklyDays.reduce((acc, d) => acc + d.count, 0);
    const weeklyDaysMetGoal = weeklyDays.filter((d) => d.goalMet).length;
    const avgDailyGlasses = Number((totalWeeklyGlasses / 7).toFixed(1));

    return NextResponse.json({
      userId: targetUserId,
      date: todayKey,
      count: todayData.count,
      target: todayData.target,
      ml: todayData.count * 250,
      targetMl: todayData.target * 250,
      percent: Math.min(100, Math.round((todayData.count / Math.max(1, todayData.target)) * 100)),
      goalMet: todayData.count >= todayData.target,
      week: {
        totalGlasses: totalWeeklyGlasses,
        avgGlasses: avgDailyGlasses,
        daysMetGoal: weeklyDaysMetGoal,
        days: weeklyDays,
      },
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
    const targetDate = body.date || format(new Date(), "yyyy-MM-dd");

    const referenceId = `water_count_${targetDate}`;

    // Upsert or record today's hydration log
    const existing = await prisma.rewardLog.findFirst({
      where: {
        userId: user.id,
        referenceId,
      },
    });

    const payload = {
      userId: user.id,
      points: 0,
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
          points: 0,
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
      date: targetDate,
      count,
      target,
    });
  } catch (error: any) {
    console.error("Water POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
