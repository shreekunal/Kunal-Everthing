import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, subDays } from "date-fns";
import { calculateRoutineStreak } from "@/lib/utils";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Fetch last 30 days for monthly matrix & heatmap
    const past30Days = Array.from({ length: 30 }, (_, i) =>
      format(subDays(new Date(), 29 - i), "yyyy-MM-dd")
    );
    const past14Days = past30Days.slice(-14);

    const routines = await prisma.routine.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        completions: {
          where: { completed: true },
          select: { date: true, completed: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedRoutines = routines.map((r) => {
      const completedDatesSet = new Set(
        r.completions.filter((c) => c.completed).map((c) => c.date)
      );

      const pastHistory = past30Days.map((date) => ({
        date,
        completed: completedDatesSet.has(date),
      }));

      // Dynamically calculate accurate live streak
      const { currentStreak, bestStreak } = calculateRoutineStreak(
        completedDatesSet,
        todayStr
      );

      return {
        id: r.id,
        name: r.name,
        category: r.category,
        targetDays: r.targetDays,
        targetDurationMinutes: r.targetDurationMinutes,
        currentStreak,
        bestStreak: Math.max(bestStreak, r.bestStreak || 0),
        completedToday: completedDatesSet.has(todayStr),
        pastHistory,
      };
    });

    return NextResponse.json({ routines: formattedRoutines, past30Days, past14Days });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, category, targetDays, targetDurationMinutes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const routine = await prisma.routine.create({
      data: {
        userId: user.id,
        name,
        category: category || "Health",
        targetDays: targetDays || "DAILY",
        targetDurationMinutes: targetDurationMinutes || 30,
        currentStreak: 0,
        bestStreak: 0,
      },
    });

    return NextResponse.json({ routine }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
