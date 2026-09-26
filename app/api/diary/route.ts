import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateQuery = searchParams.get("date");
    const limitQuery = searchParams.get("limit");

    if (dateQuery) {
      const entry = await prisma.dailyDiary.findFirst({
        where: {
          userId: user.id,
          date: dateQuery,
        },
      });

      return NextResponse.json({ entry });
    }

    // Fetch entries list
    const limit = limitQuery ? parseInt(limitQuery, 10) : 30;
    const entries = await prisma.dailyDiary.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: Math.min(limit, 100),
    });

    // Also fetch today's telemetry snapshot
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayStart = startOfDay(new Date());

    const [studySessions, waterLogs, completedTasks, completedHabits] = await Promise.all([
      prisma.workSession.findMany({
        where: { userId: user.id, date: todayStr },
      }),
      prisma.rewardLog.findFirst({
        where: {
          userId: user.id,
          referenceId: `water_count_${todayStr}`,
        },
      }),
      prisma.task.count({
        where: { userId: user.id, status: "DONE", updatedAt: { gte: todayStart } },
      }),
      prisma.routineCompletion.count({
        where: {
          completed: true,
          date: todayStr,
          routine: { userId: user.id },
        },
      }),
    ]);

    const studyMinutes = studySessions
      .filter((s) => s.type === "STUDY")
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    const workMinutes = studySessions
      .filter((s) => s.type === "WORK")
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    let waterGlasses = 0;
    if (waterLogs?.reason) {
      try {
        const parsed = JSON.parse(waterLogs.reason);
        if (typeof parsed.count === "number") waterGlasses = parsed.count;
      } catch {
        waterGlasses = waterLogs.points || 0;
      }
    }

    const todayTelemetry = {
      studyMinutes,
      workMinutes,
      waterGlasses,
      tasksCompleted: completedTasks,
      habitsDone: completedHabits,
    };

    return NextResponse.json({ entries, todayTelemetry });
  } catch (error: any) {
    console.error("Diary GET API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load diary" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const date = body.date || format(new Date(), "yyyy-MM-dd");
    const {
      mood,
      rating,
      content,
      highlight,
      gratitude,
      partnerNote,
      telemetry,
    } = body;

    const rawContent = (content || "").trim();
    const words = rawContent ? rawContent.split(/\s+/).filter(Boolean) : [];
    const cleanContent = words.slice(0, 250).join(" ");

    const entry = await prisma.dailyDiary.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date,
        },
      },
      update: {
        mood: mood || "Grateful",
        rating: typeof rating === "number" ? Math.max(1, Math.min(5, rating)) : 5,
        content: cleanContent,
        highlights: highlight || null,
        gratitude: gratitude || null,
        partnerNote: partnerNote || null,
      },
      create: {
        userId: user.id,
        date,
        mood: mood || "Grateful",
        rating: typeof rating === "number" ? Math.max(1, Math.min(5, rating)) : 5,
        content: cleanContent,
        highlights: highlight || null,
        gratitude: gratitude || null,
        partnerNote: partnerNote || null,
      },
    });

    // Award reflection XP if not already logged today
    const existingXp = await prisma.rewardLog.findFirst({
      where: {
        userId: user.id,
        referenceId: `diary_entry_${date}`,
      },
    });

    if (!existingXp) {
      await prisma.rewardLog.create({
        data: {
          userId: user.id,
          title: "Daily Diary Reflection",
          points: 25,
          type: "DIARY_ENTRY",
          reason: `Daily Diary reflection written for ${date}`,
          category: "DISCIPLINE",
          referenceId: `diary_entry_${date}`,
        },
      });
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error("Diary POST API error:", error);
    return NextResponse.json({ error: error.message || "Failed to save diary" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.dailyDiary.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Diary DELETE API error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete diary" }, { status: 500 });
  }
}
