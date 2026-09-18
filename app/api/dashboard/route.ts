import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, startOfWeek, endOfWeek, isPast, parseISO } from "date-fns";
import { getNextCardDueDate } from "@/lib/formatters";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // 1. Fetch Today's Tasks + Overdue Tasks
    const allTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        isArchived: false,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    const todayTasks = allTasks.filter((t) => {
      if (t.status === "DONE") return t.dueDate === todayStr;
      if (!t.dueDate) return true;
      return t.dueDate <= todayStr;
    });

    const completedTasksCount = allTasks.filter((t) => t.status === "DONE").length;
    const totalTasksCount = allTasks.length;

    // 2. Fetch Routines & Today's Completions
    const routines = await prisma.routine.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        completions: {
          where: { date: todayStr },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const routinesWithStatus = routines.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      targetDays: r.targetDays,
      currentStreak: r.currentStreak,
      completedToday: r.completions.length > 0 && r.completions[0].completed,
    }));

    const completedRoutinesToday = routinesWithStatus.filter((r) => r.completedToday).length;

    // 3. Credit Cards & Next Payment Dues
    const creditCards = await prisma.creditCard.findMany({
      where: { userId: user.id, isArchived: false },
    });

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

    // 4. Accounts & Net Worth
    const accounts = await prisma.financialAccount.findMany({
      where: { userId: user.id, isArchived: false },
    });

    const totalAssets = accounts
      .filter((a) => a.type === "ASSET")
      .reduce((acc, a) => acc + a.balance, 0);

    const otherLiabilities = accounts
      .filter((a) => a.type === "LIABILITY")
      .reduce((acc, a) => acc + a.balance, 0);

    const totalLiabilities = totalCardOutstanding + otherLiabilities;
    const netWorth = totalAssets - totalLiabilities;

    // 5. Work & Study Progress This Week
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

    const weekSessions = await prisma.workSession.findMany({
      where: {
        userId: user.id,
        date: { gte: weekStart, lte: weekEnd },
      },
    });

    const workMinutesWeek = weekSessions
      .filter((s) => s.type === "WORK")
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    const studyMinutesWeek = weekSessions
      .filter((s) => s.type === "STUDY")
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    // 6. Important Upcoming Dates (Birthdays, Anniversaries)
    const importantDates = await prisma.importantDate.findMany({
      where: { userId: user.id },
      take: 3,
      orderBy: { date: "asc" },
    });

    const partner = await prisma.partner.findFirst({
      where: { userId: user.id },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
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
