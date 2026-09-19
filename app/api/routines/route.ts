import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, subDays } from "date-fns";

export async function GET() {
  try {
    const user = await getCurrentUser();
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
          where: {
            date: { in: past30Days },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const formattedRoutines = routines.map((r) => {
      const completionMap = new Map(r.completions.map((c) => [c.date, c.completed]));
      const pastHistory = past30Days.map((date) => ({
        date,
        completed: completionMap.get(date) || false,
      }));

      return {
        id: r.id,
        name: r.name,
        category: r.category,
        targetDays: r.targetDays,
        targetDurationMinutes: r.targetDurationMinutes,
        currentStreak: r.currentStreak,
        bestStreak: r.bestStreak,
        completedToday: completionMap.get(todayStr) || false,
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
