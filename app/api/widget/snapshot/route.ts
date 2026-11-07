import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWidgetBearer } from "@/lib/widgetAuth";
import { ensureDualProfiles } from "@/lib/auth";
import { getDisciplineSummary } from "@/lib/rewards";
import { format, parseISO, differenceInDays } from "date-fns";

export const dynamic = "force-dynamic";

function calculateDaysTogether(dateStr?: string | null): number {
  if (!dateStr) return 0;
  try {
    const start = parseISO(dateStr);
    if (isNaN(start.getTime())) return 0;
    return Math.max(0, differenceInDays(new Date(), start));
  } catch {
    return 0;
  }
}

function calculateNextAnniversary(dateStr?: string | null): { name: string; daysLeft: number; formattedDate: string; isToday: boolean } | null {
  if (!dateStr) return null;
  try {
    const targetDate = parseISO(dateStr);
    if (isNaN(targetDate.getTime())) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    let nextDate = new Date(currentYear, targetDate.getMonth(), targetDate.getDate());
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (nextDate < todayZero) {
      nextDate = new Date(currentYear + 1, targetDate.getMonth(), targetDate.getDate());
    }

    const diffTime = nextDate.getTime() - todayZero.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return {
      name: "Anniversary",
      daysLeft,
      formattedDate: format(nextDate, "d MMM"),
      isToday: daysLeft === 0,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/widget/snapshot
 * Serves the offline snapshot payload for Android widgets.
 * Authenticated strictly via Authorization: Bearer <scoped_widget_token>
 * Completely free of financial, vault, diary, or sensitive records.
 */
export async function GET(request: Request) {
  const auth = await verifyWidgetBearer(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user } = auth.data;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  try {
    const { kunal, mradul } = await ensureDualProfiles();
    const isCurrentKunal = user.email === kunal.email || user.id === kunal.id;
    const partnerUser = isCurrentKunal ? mradul : kunal;

    const [
      discipline,
      allTasks,
      activeRoutines,
      todayStepLog,
      importantDates,
      partnerRelation,
      todayWaterLog,
      userSettings,
      partnerBroadcast,
      partnerPendingTasksCount,
    ] = await Promise.all([
      // 1. Discipline & Pet
      getDisciplineSummary(user.id, false),

      // 2. Tasks
      prisma.task.findMany({
        where: {
          userId: user.id,
          isArchived: false,
        },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),

      // 3. Routines & Completions today
      prisma.routine.findMany({
        where: { userId: user.id, isArchived: false },
        select: {
          id: true,
          completions: {
            where: { date: todayStr, completed: true },
            select: { id: true },
          },
        },
      }),

      // 4. Steps
      prisma.dailyStepLog.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayStr,
          },
        },
      }),

      // 5. Important Dates
      prisma.importantDate.findMany({
        where: { userId: user.id, date: { gte: todayStr } },
        take: 3,
        orderBy: { date: "asc" },
      }),

      // 6. Partner relationship
      prisma.partner.findFirst({
        where: { userId: user.id },
      }),

      // 7. Water Log today
      prisma.rewardLog.findFirst({
        where: {
          userId: user.id,
          referenceId: `water_count_${todayStr}`,
        },
      }),

      // 8. User Settings (for step target)
      prisma.userSettings.findUnique({
        where: { userId: user.id },
      }),

      // 9. Partner live focus broadcast
      prisma.focusBroadcast.findUnique({
        where: { userId: partnerUser.id },
      }),

      // 10. Partner pending task count
      prisma.task.count({
        where: {
          userId: partnerUser.id,
          isArchived: false,
          status: { not: "DONE" },
        },
      }),
    ]);

    // Tasks due today or pending
    const priorityRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const tasksDueToday = allTasks
      .filter((t) => {
        if (t.status === "DONE") return false;
        if (!t.dueDate) return true;
        return t.dueDate <= todayStr;
      })
      .sort((a, b) => (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0))
      .slice(0, 4)
      .map((t) => ({
        id: t.id,
        title: t.title.slice(0, 60),
        priority: t.priority,
      }));

    // Routines left
    const routinesLeftCount = activeRoutines.filter(
      (r) => !r.completions || r.completions.length === 0
    ).length;

    // Water computation
    let waterGlasses = 0;
    let waterTargetGlasses = 8;
    if (todayWaterLog?.reason) {
      try {
        const parsed = JSON.parse(todayWaterLog.reason);
        if (typeof parsed.count === "number") waterGlasses = parsed.count;
        if (typeof parsed.target === "number") waterTargetGlasses = parsed.target;
      } catch {
        waterGlasses = todayWaterLog.points || 0;
      }
    }
    const waterMl = waterGlasses * 250;
    const waterGoal = Math.max(250, waterTargetGlasses * 250);

    // Steps computation
    const steps = todayStepLog?.stepCount || 0;
    const stepsGoal = todayStepLog?.targetSteps || userSettings?.defaultStepGoal || 10000;

    // Next Date
    let nextDate: { name: string; daysLeft: number } | null = null;
    if (importantDates.length > 0) {
      const first = importantDates[0];
      const target = parseISO(first.date);
      const today = new Date();
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffTime = target.getTime() - todayZero.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      nextDate = {
        name: first.name,
        daysLeft,
      };
    }

    // Relationship & Anniversary
    const anniversaryStr = partnerRelation?.anniversary || null;
    const daysTogether = calculateDaysTogether(anniversaryStr);
    const nextAnniversary = calculateNextAnniversary(anniversaryStr);

    // Discipline & Pet
    const purityStreak = discipline?.streaks?.purity?.currentStreak || 0;
    const dietStreak = discipline?.streaks?.diet?.currentStreak || 0;
    const disciplineStreak = Math.max(purityStreak, dietStreak);

    const isPetDead = Boolean(discipline?.isPetDead);
    let petStage = "Novice Disciple";
    if (isPetDead) {
      petStage = "R.I.P.";
    } else if (discipline?.title) {
      petStage = discipline.title;
    } else if (discipline?.level) {
      petStage = `LVL ${discipline.level}`;
    }

    // Partner Status
    const partnerName = partnerRelation?.name || partnerUser.name || "Partner";
    const now = Date.now();
    const isFocusing = Boolean(
      partnerBroadcast &&
      partnerBroadcast.status === "RUNNING" &&
      now - partnerBroadcast.updatedAt.getTime() < 3 * 60 * 60 * 1000
    );
    const focusProject = isFocusing && partnerBroadcast?.project ? partnerBroadcast.project : null;

    const snapshot = {
      updatedAt: Date.now(),
      userName: user.name || "Kunal",
      tasksDueToday,
      routinesLeftCount,
      waterMl,
      waterGoal,
      steps,
      stepsGoal,
      nextDate,
      daysTogether,
      nextAnniversary,
      disciplineStreak,
      petStage,
      partner: {
        name: partnerName,
        focusingNow: isFocusing,
        focusProject,
        pendingTasksCount: partnerPendingTasksCount,
      },
    };

    return NextResponse.json(snapshot);
  } catch (error: any) {
    console.error("Widget snapshot generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate snapshot" }, { status: 500 });
  }
}
