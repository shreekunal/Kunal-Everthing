import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { awardPoints } from "@/lib/rewards";

function calculateElapsedMinutes(startStr?: string | null, endStr?: string | null): number | null {
  if (!startStr || !endStr) return null;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;
  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;
  if (endTotal < startTotal) {
    // Crosses midnight, add 24 hours
    endTotal += 24 * 60;
  }
  return Math.max(1, endTotal - startTotal);
}

function getWindowFromTime(timeStr?: string | null, fallbackDate?: Date): string {
  let hour = 10;
  if (timeStr && timeStr.includes(":")) {
    const parsedH = parseInt(timeStr.split(":")[0], 10);
    if (!isNaN(parsedH)) hour = parsedH;
  } else if (fallbackDate) {
    hour = new Date(fallbackDate).getHours();
  }

  if (hour >= 5 && hour < 9) return "EARLY_MORNING";
  if (hour >= 9 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 17) return "AFTERNOON";
  if (hour >= 17 && hour < 21) return "EVENING";
  if (hour >= 21 || hour < 1) return "NIGHT";
  return "LATE_NIGHT";
}

export async function GET(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");

    // All sessions this month + last 30 days for cognitive window intelligence
    const past30DaysStart = format(subDays(today, 30), "yyyy-MM-dd");
    const allRecentSessions = await prisma.workSession.findMany({
      where: {
        userId: user.id,
        date: { gte: past30DaysStart },
      },
      include: {
        topic: {
          include: {
            milestone: {
              include: {
                aim: {
                  select: { id: true, title: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const monthSessions = allRecentSessions.filter((s) => s.date >= monthStart && s.date <= monthEnd);
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
      const dSessions = allRecentSessions.filter((s) => s.date === dStr);
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

    // Peak Cognitive Window Discovery Calculation (ranked by study hours and focus efficiency)
    const studySessionsForCognitive = allRecentSessions.filter((s) => s.type === "STUDY");
    const windowDefinitions = [
      { id: "EARLY_MORNING", label: "Early Morning", range: "05:00 - 09:00", icon: "Sunrise", peakTag: "High Energy Zone" },
      { id: "MORNING", label: "Morning", range: "09:00 - 12:00", icon: "Sun", peakTag: "Prime Focus Zone" },
      { id: "AFTERNOON", label: "Afternoon", range: "12:00 - 17:00", icon: "Coffee", peakTag: "Analytical Sprint" },
      { id: "EVENING", label: "Evening", range: "17:00 - 21:00", icon: "Sunset", peakTag: "Problem Solving" },
      { id: "NIGHT", label: "Night", range: "21:00 - 01:00", icon: "Moon", peakTag: "Quiet Consolidation" },
      { id: "LATE_NIGHT", label: "Late Night", range: "01:00 - 05:00", icon: "Sparkles", peakTag: "Silent Grinding" },
    ];

    const windowStats = windowDefinitions.map((win) => {
      const matching = studySessionsForCognitive.filter((s) => {
        const wId = getWindowFromTime(s.startTime, s.createdAt);
        return wId === win.id;
      });

      const totalMins = matching.reduce((acc, s) => acc + s.durationMinutes, 0);
      const efficiencySessions = matching.filter((s) => s.efficiencyPercent && s.efficiencyPercent > 0);
      const avgEfficiency = efficiencySessions.length > 0
        ? Math.round(efficiencySessions.reduce((acc, s) => acc + (s.efficiencyPercent || 0), 0) / efficiencySessions.length)
        : null;

      // Composite score based on consistency and efficiency
      const compositeRank = matching.length > 0
        ? totalMins + (avgEfficiency || 80) * 2
        : 0;

      return {
        ...win,
        sessionCount: matching.length,
        totalStudyMins: totalMins,
        studyHours: Number((totalMins / 60).toFixed(1)),
        avgEfficiencyPercent: avgEfficiency,
        compositeRank,
      };
    });

    // Identify Biological Prime Time window
    const activeWindows = windowStats.filter((w) => w.sessionCount > 0);
    activeWindows.sort((a, b) => b.compositeRank - a.compositeRank);
    const primeWindow = activeWindows.length > 0 ? activeWindows[0] : null;

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
      cognitiveWindows: {
        windows: windowStats,
        primeWindow,
        totalSessionsAnalyzed: studySessionsForCognitive.length,
      },
      recentSessions: allRecentSessions.filter((s) => s.type === "STUDY").slice(0, 25),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const {
      project,
      durationMinutes,
      startTime,
      endTime,
      topicId,
      type,
      date,
    } = body;

    if (!project || !durationMinutes) {
      return NextResponse.json(
        { error: "Project and duration are required" },
        { status: 400 }
      );
    }

    const rawMins = parseInt(durationMinutes, 10);
    const elapsedMins = calculateElapsedMinutes(startTime, endTime);
    // Rule: Pure focus mins cannot be larger than elapsed time
    const mins = elapsedMins && elapsedMins > 0 ? Math.min(rawMins, elapsedMins) : rawMins;
    let efficiencyPct: number | null = null;
    if (elapsedMins && elapsedMins > 0) {
      efficiencyPct = Number(Math.min(100, Math.max(10, (mins / elapsedMins) * 100)).toFixed(1));
    }

    let validTopicId: string | null = null;
    if (topicId) {
      const existingTopic = await prisma.studyTopic.findFirst({
        where: { id: topicId },
      });
      if (existingTopic) {
        validTopicId = existingTopic.id;
      }
    }

    const session = await prisma.workSession.create({
      data: {
        userId: user.id,
        project: project.trim(),
        durationMinutes: mins,
        startTime: startTime || null,
        endTime: endTime || null,
        elapsedMinutes: elapsedMins || null,
        efficiencyPercent: efficiencyPct || null,
        topicId: validTopicId || null,
        type: type || "STUDY",
        date: date || format(new Date(), "yyyy-MM-dd"),
      },
      include: {
        topic: {
          include: {
            milestone: {
              include: {
                aim: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    // Base XP: 1 XP per 5 minutes
    const earnedXP = Math.max(2, Math.floor(mins / 5));

    await awardPoints({
      userId: user.id,
      points: earnedXP,
      type: "WORK_SESSION_LOGGED",
      title: `Study Session: ${project} (${mins}m)`,
      reason: `Completed ${mins} minutes of ${type || "STUDY"} focus session`,
      category: "PRODUCTIVITY",
      referenceId: session.id,
    });

    return NextResponse.json({ session, earnedXP, elapsedMinutes: elapsedMins, efficiencyPercent: efficiencyPct }, { status: 201 });
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
