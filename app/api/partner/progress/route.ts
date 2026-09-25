import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ensureDualProfiles } from "@/lib/auth";
import { getDisciplineSummary } from "@/lib/rewards";
import { format, startOfWeek, endOfWeek, startOfDay, subDays } from "date-fns";
import { calculateRoutineStreak } from "@/lib/utils";

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

    // Fetch last 7 days keys for water tracking
    const past7DaysKeys = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
    );

    // Fetch all partner dimensions in parallel
    const [
      discipline,
      pendingTasks,
      completedTasksToday,
      routines,
      workSessionsToday,
      workSessionsWeek,
      waterLogRecordsWeek,
      latestDiary,
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

      // 3. Habits / Routines (with all completed completions for dynamic streak)
      prisma.routine.findMany({
        where: {
          userId: partnerUser.id,
          isArchived: false,
        },
        include: {
          completions: {
            where: { completed: true },
            select: { date: true, completed: true },
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

      // 5. Water Hydration Logs for the past 7 days
      prisma.rewardLog.findMany({
        where: {
          userId: partnerUser.id,
          category: { in: ["HEALTH", "GENERAL"] },
          OR: [
            { referenceId: { in: past7DaysKeys.map((d) => `water_count_${d}`) } },
            { referenceId: { in: past7DaysKeys.map((d) => `water_${d}`) } },
            { type: "WATER_LOG" },
            { type: "REWARD_WATER" },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),

      // 6. Latest Daily Diary Entry (from Kunal or Partner)
      prisma.dailyDiary.findFirst({
        where: {
          userId: { in: [user.id, partnerUser.id] },
        },
        orderBy: { date: "desc" },
      }),
    ]);

    // Parse Today & Weekly Water
    const waterByDate = new Map<string, { count: number; target: number }>();
    for (const log of waterLogRecordsWeek) {
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

    const todayWater = waterByDate.get(todayStr) || { count: 0, target: 8 };
    const weeklyWaterDays = past7DaysKeys.map((dStr) => {
      const data = waterByDate.get(dStr) || { count: 0, target: 8 };
      const dayDate = new Date(dStr);
      return {
        date: dStr,
        dayLabel: format(dayDate, "EEE"),
        dayNumber: format(dayDate, "d"),
        count: data.count,
        target: data.target,
        goalMet: data.count >= data.target,
        percent: Math.min(100, Math.round((data.count / Math.max(1, data.target)) * 100)),
      };
    });

    const totalWeeklyGlasses = weeklyWaterDays.reduce((acc, d) => acc + d.count, 0);
    const weeklyDaysMetGoal = weeklyWaterDays.filter((d) => d.goalMet).length;
    const avgDailyGlasses = Number((totalWeeklyGlasses / 7).toFixed(1));

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

    // Process Habits with live dynamic streak calculation
    const routinesWithStatus = routines.map((r) => {
      const completedDatesSet = new Set(r.completions.map((c) => c.date));
      const { currentStreak, bestStreak } = calculateRoutineStreak(completedDatesSet, todayStr);

      return {
        id: r.id,
        name: r.name,
        category: r.category,
        currentStreak,
        bestStreak: Math.max(bestStreak, r.bestStreak || 0),
        completedToday: completedDatesSet.has(todayStr),
      };
    });

    const completedRoutinesToday = routinesWithStatus.filter((r) => r.completedToday).length;
    const routineCompletionRate =
      routines.length > 0
        ? Math.round((completedRoutinesToday / routines.length) * 100)
        : 0;

    return NextResponse.json({
      partner: {
        id: partnerUser.id,
        name: partnerRelation?.name || partnerUser.name,
        nickname: partnerRelation?.nickname || (isCurrentKunal ? "Golu" : "My Love"),
        gender: isCurrentKunal ? "FEMALE" : "MALE",
        birthday: partnerRelation?.birthday || null,
        anniversary: partnerRelation?.anniversary || null,
        phone: partnerRelation?.phone || null,
        callLink: partnerRelation?.callLink || null,
        preferences: partnerRelation?.preferences || null,
        notes: partnerRelation?.notes || null,
      },
      water: {
        glasses: todayWater.count,
        target: todayWater.target,
        ml: todayWater.count * 250,
        targetMl: todayWater.target * 250,
        percent: Math.min(100, Math.round((todayWater.count / Math.max(1, todayWater.target)) * 100)),
        goalMet: todayWater.count >= todayWater.target,
        week: {
          totalGlasses: totalWeeklyGlasses,
          avgGlasses: avgDailyGlasses,
          daysMetGoal: weeklyDaysMetGoal,
          days: weeklyWaterDays,
        },
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
      latestDiary,
    });
  } catch (error: any) {
    console.error("Partner progress API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load partner progress" },
      { status: 500 }
    );
  }
}
