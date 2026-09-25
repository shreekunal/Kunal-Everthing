import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDisciplineSummary } from "@/lib/rewards";
import { format, startOfWeek, endOfWeek, isPast, parseISO } from "date-fns";
import { getNextCardDueDate } from "@/lib/formatters";
import { calculateRoutineStreak } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    // Execute all queries in parallel to drastically cut down network round trips
    const [
      discipline,
      allTasks,
      routines,
      creditCards,
      accounts,
      weekSessions,
      importantDates,
      partner,
    ] = await Promise.all([
      getDisciplineSummary(user.id, false),
      prisma.task.findMany({
        where: {
          userId: user.id,
          isArchived: false,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      prisma.routine.findMany({
        where: { userId: user.id, isArchived: false },
        include: {
          completions: {
            where: { completed: true },
            select: { date: true, completed: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.creditCard.findMany({
        where: { userId: user.id, isArchived: false },
      }),
      prisma.financialAccount.findMany({
        where: { userId: user.id, isArchived: false },
      }),
      prisma.workSession.findMany({
        where: {
          userId: user.id,
          date: { gte: weekStart, lte: weekEnd },
        },
      }),
      prisma.importantDate.findMany({
        where: { userId: user.id },
        take: 3,
        orderBy: { date: "asc" },
      }),
      prisma.partner.findFirst({
        where: { userId: user.id },
      }),
    ]);

    const todayTasks = allTasks.filter((t) => {
      if (t.status === "DONE") return t.dueDate === todayStr;
      if (!t.dueDate) return true;
      return t.dueDate <= todayStr;
    });

    const completedTasksCount = allTasks.filter((t) => t.status === "DONE").length;
    const totalTasksCount = allTasks.length;

    const routinesWithStatus = routines.map((r) => {
      const completedDatesSet = new Set(r.completions.map((c) => c.date));
      const { currentStreak, bestStreak } = calculateRoutineStreak(completedDatesSet, todayStr);

      return {
        id: r.id,
        name: r.name,
        category: r.category,
        targetDays: r.targetDays,
        currentStreak,
        bestStreak: Math.max(bestStreak, r.bestStreak || 0),
        completedToday: completedDatesSet.has(todayStr),
      };
    });

    const completedRoutinesToday = routinesWithStatus.filter((r) => r.completedToday).length;

    const totalCardOutstanding = creditCards.reduce((acc, c) => acc + c.currentOutstanding, 0);

    const upcomingCardDues = creditCards
      .map((c) => {
        const dueInfo = getNextCardDueDate(c.dueDate);
        return {
          id: c.id,
          name: c.name,
          bank: c.bank,
          last4: c.last4,
          outstanding: c.currentOutstanding,
          minDue: c.minDue,
          daysRemaining: dueInfo.daysRemaining,
          dueDateLabel: dueInfo.label,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    const nextPaymentDue = upcomingCardDues.length > 0 ? upcomingCardDues[0] : null;

    const totalAssets = accounts
      .filter((a) => a.type === "ASSET")
      .reduce((acc, a) => acc + a.balance, 0);

    const otherLiabilities = accounts
      .filter((a) => a.type === "LIABILITY")
      .reduce((acc, a) => acc + a.balance, 0);

    const totalLiabilities = totalCardOutstanding + otherLiabilities;
    const netWorth = totalAssets - totalLiabilities;

    const workMinutesWeek = weekSessions
      .filter((s) => s.type === "WORK")
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    const studyMinutesWeek = weekSessions
      .filter((s) => s.type === "STUDY")
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    const studyMinutesToday = weekSessions
      .filter((s) => s.type === "STUDY" && s.date === todayStr)
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
      discipline,
      todayTasks,
      routines: routinesWithStatus,
      financials: {
        netWorth,
        totalAssets,
        totalLiabilities,
        totalCardOutstanding,
        nextPaymentDue,
      },
      weeklySummary: {
        workMinutes: workMinutesWeek,
        studyMinutes: studyMinutesWeek,
        studyMinutesToday,
        tasksCompleted: completedTasksCount,
        tasksTotal: totalTasksCount,
        routineCompletionRate:
          routines.length > 0
            ? Math.round((completedRoutinesToday / routines.length) * 100)
            : 0,
      },
      upcomingDues: upcomingCardDues.slice(0, 3),
      importantDates,
      partner,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard" }, { status: 500 });
  }
}

