import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ensureDualProfiles } from "@/lib/auth";
import { getDisciplineSummary } from "@/lib/rewards";
import { format, startOfWeek, endOfWeek, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Identify partner user from reciprocal dual profiles or relationship records
    const { kunal, mradul } = await ensureDualProfiles();
    const isCurrentKunal = user.email === kunal.email || user.id === kunal.id;
    const partnerUser = isCurrentKunal ? mradul : kunal;

    const partnerRelation = await prisma.partner.findFirst({
      where: { userId: user.id },
    });

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayStart = startOfDay(new Date());
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    // Fetch all partner dimensions in parallel
    const [
      discipline,
      pendingTasks,
      completedTasksToday,
      routines,
      workSessionsToday,
      workSessionsWeek,
      waterLogRecord,
    ] = await Promise.all([
      // 1. Companion & Karma
      getDisciplineSummary(partnerUser.id, false),

      // 2. Pending Tasks
      prisma.task.findMany({
        where: {
          userId: partnerUser.id,
          isArchived: false,
          status: { not: "DONE" },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),

      // Tasks Completed Today
      prisma.task.findMany({
        where: {
          userId: partnerUser.id,
          status: "DONE",
          updatedAt: { gte: todayStart },
        },
        orderBy: { updatedAt: "desc" },
      }),

      // 3. Habits / Routines
      prisma.routine.findMany({
        where: {
          userId: partnerUser.id,
          isArchived: false,
        },
        include: {
          completions: {
            where: { date: todayStr },
          },
        },
        orderBy: { createdAt: "asc" },
      }),

      // 4. Focus Time Sessions Today
      prisma.workSession.findMany({
        where: {
          userId: partnerUser.id,
          date: todayStr,
        },
        orderBy: { createdAt: "desc" },
      }),

      // Focus Time Sessions This Week
      prisma.workSession.findMany({
        where: {
          userId: partnerUser.id,
          date: { gte: weekStart, lte: weekEnd },
        },
      }),

      // 5. Water Hydration Log for Today
      prisma.rewardLog.findFirst({
        where: {
          userId: partnerUser.id,
          OR: [
            { referenceId: `water_count_${todayStr}` },
            { referenceId: `water_${todayStr}` },
            { type: "REWARD_WATER" },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Parse Water
    let waterGlasses = 0;
    let waterTarget = 8;
    if (waterLogRecord) {
      if (waterLogRecord.reason) {
        try {
          const parsed = JSON.parse(waterLogRecord.reason);
          if (typeof parsed.count === "number") waterGlasses = parsed.count;
          if (typeof parsed.target === "number") waterTarget = parsed.target;
        } catch {
          waterGlasses = waterLogRecord.points || 0;
        }
      } else if (waterLogRecord.type === "REWARD_WATER" || waterLogRecord.referenceId === `water_${todayStr}`) {
        // If reward claimed, at least 8 glasses
        waterGlasses = Math.max(8, waterGlasses);
      }
    }

    // Process Focus Time
    const todayWorkMins = workSessionsToday
      .filter((s) => s.type === "WORK")
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    const todayStudyMins = workSessionsToday
      .filter((s) => s.type === "STUDY")
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    const todayPersonalMins = workSessionsToday
      .filter((s) => s.type === "PERSONAL")
      .reduce((sum, s) => sum + s.durationMinutes, 0);

    const todayTotalFocusMins = todayWorkMins + todayStudyMins + todayPersonalMins;

    const weekTotalFocusMins = workSessionsWeek.reduce((sum, s) => sum + s.durationMinutes, 0);

    // Process Habits
    const routinesWithStatus = routines.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      currentStreak: r.currentStreak,
      bestStreak: r.bestStreak,
      completedToday: r.completions.length > 0,
    }));

    const completedRoutinesToday = routinesWithStatus.filter((r) => r.completedToday).length;
    const routineCompletionRate =
      routines.length > 0
        ? Math.round((completedRoutinesToday / routines.length) * 100)
        : 0;

    return NextResponse.json({
      partner: {
        id: partnerUser.id,
        name: partnerUser.name,
        nickname: partnerRelation?.nickname || (isCurrentKunal ? "Golu" : "My Love"),
        gender: isCurrentKunal ? "FEMALE" : "MALE",
        phone: partnerRelation?.phone || null,
        callLink: partnerRelation?.callLink || null,
      },
      water: {
        glasses: waterGlasses,
        target: waterTarget,
        ml: waterGlasses * 250,
        targetMl: waterTarget * 250,
        percent: Math.min(100, Math.round((waterGlasses / Math.max(1, waterTarget)) * 100)),
        goalMet: waterGlasses >= waterTarget,
      },
      focus: {
        todayTotalMinutes: todayTotalFocusMins,
        todayWorkMinutes: todayWorkMins,
        todayStudyMinutes: todayStudyMins,
        todayPersonalMinutes: todayPersonalMins,
        weekTotalMinutes: weekTotalFocusMins,
        sessionsCountToday: workSessionsToday.length,
        recentSessions: workSessionsToday.slice(0, 6).map((s) => ({
          id: s.id,
          project: s.project,
          durationMinutes: s.durationMinutes,
          type: s.type,
          notes: s.notes,
          createdAt: s.createdAt,
        })),
      },
      tasks: {
        pendingCount: pendingTasks.length,
        completedTodayCount: completedTasksToday.length,
        pending: pendingTasks.slice(0, 10).map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          category: t.category,
          dueDate: t.dueDate,
          dueTime: t.dueTime,
          recurrence: t.recurrence,
        })),
        completedToday: completedTasksToday.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
        })),
      },
      habits: {
        totalCount: routines.length,
        completedTodayCount: completedRoutinesToday,
        completionRate: routineCompletionRate,
        list: routinesWithStatus,
      },
      discipline,
    });
  } catch (error: any) {
    console.error("Partner progress API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load partner progress" },
      { status: 500 }
    );
  }
}
