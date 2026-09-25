import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { awardPoints } from "@/lib/rewards";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    // All sessions this month
    const monthSessions = await prisma.workSession.findMany({
      where: {
        userId: user.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { createdAt: "desc" },
    });

    const todaySessions = monthSessions.filter((s) => s.date === todayStr);
    const weekSessions = monthSessions.filter((s) => s.date >= weekStart && s.date <= weekEnd);

    // Grouping by type for Today
    const todayWorkMins = todaySessions
      .filter((s) => s.type === "WORK")
      .reduce((a, b) => a + b.durationMinutes, 0);
    const todayStudyMins = todaySessions
      .filter((s) => s.type === "STUDY")
      .reduce((a, b) => a + b.durationMinutes, 0);
    const todayPersonalMins = todaySessions
      .filter((s) => s.type === "PERSONAL")
      .reduce((a, b) => a + b.durationMinutes, 0);

    // Grouping for This Week
    const weekWorkMins = weekSessions
      .filter((s) => s.type === "WORK")
      .reduce((a, b) => a + b.durationMinutes, 0);
    const weekStudyMins = weekSessions
      .filter((s) => s.type === "STUDY")
      .reduce((a, b) => a + b.durationMinutes, 0);
    const weekPersonalMins = weekSessions
      .filter((s) => s.type === "PERSONAL")
      .reduce((a, b) => a + b.durationMinutes, 0);

    // Daily breakdown for last 7 days chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const dStr = format(subDays(today, 6 - i), "yyyy-MM-dd");
      const dayLabel = format(subDays(today, 6 - i), "EEE");
      const dSessions = monthSessions.filter((s) => s.date === dStr);
      const work = dSessions
        .filter((s) => s.type === "WORK")
        .reduce((a, b) => a + b.durationMinutes, 0);
      const study = dSessions
        .filter((s) => s.type === "STUDY")
        .reduce((a, b) => a + b.durationMinutes, 0);
      const personal = dSessions
        .filter((s) => s.type === "PERSONAL")
        .reduce((a, b) => a + b.durationMinutes, 0);

      return {
        date: dStr,
        day: dayLabel,
        workHours: Number((work / 60).toFixed(1)),
        studyHours: Number((study / 60).toFixed(1)),
        personalHours: Number((personal / 60).toFixed(1)),
        totalMinutes: work + study + personal,
      };
    });

    return NextResponse.json({
      today: {
        workMinutes: todayWorkMins,
        studyMinutes: todayStudyMins,
        personalMinutes: todayPersonalMins,
        sessions: todaySessions,
      },
      thisWeek: {
        workMinutes: weekWorkMins,
        studyMinutes: weekStudyMins,
        personalMinutes: weekPersonalMins,
        totalMinutes: weekWorkMins + weekStudyMins + weekPersonalMins,
      },
      last7Days,
      recentSessions: monthSessions.filter((s) => s.type === "STUDY").slice(0, 20),
    });
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
    const { project, durationMinutes, type, date, notes } = body;

    if (!project || !durationMinutes) {
      return NextResponse.json(
        { error: "Project and duration are required" },
        { status: 400 }
      );
    }

    const mins = parseInt(durationMinutes, 10);
    const session = await prisma.workSession.create({
      data: {
        userId: user.id,
        project,
        durationMinutes: mins,
        type: type || "STUDY",
        date: date || format(new Date(), "yyyy-MM-dd"),
        notes: notes || null,
      },
    });

    // Award 1 XP per minute of focused study (minimum 5 XP)
    const earnedXP = Math.max(5, mins);
    await awardPoints({
      userId: user.id,
      points: earnedXP,
      type: "WORK_SESSION_LOGGED",
      title: `Study Session: ${project} (${mins}m)`,
      reason: `Completed ${mins} minutes of ${type || "STUDY"} focus session`,
      category: "PRODUCTIVITY",
      referenceId: session.id,
    });

    return NextResponse.json({ session, earnedXP }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.workSession.delete({
      where: { id: sessionId },
    });

    // Clean up reward log
    await prisma.rewardLog.deleteMany({
      where: { userId: user.id, referenceId: sessionId },
    });

    return NextResponse.json({ success: true, deletedId: sessionId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
