import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDisciplineSummary } from "@/lib/rewards";
import { format, startOfWeek, endOfWeek, isPast, parseISO } from "date-fns";
import { getNextCardDueDate } from "@/lib/formatters";
import { decryptCardField } from "@/lib/crypto/cardEncryption";

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
      creditCards,
      accounts,
      weekSessions,
      importantDates,
      partner,
      todayStepLog,
      activeRoutines,
    ] = await Promise.all([
      getDisciplineSummary(user.id, false),
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
          dueTime: true,
          category: true,
          createdAt: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      prisma.creditCard.findMany({
        where: { userId: user.id, isArchived: false },
        select: {
          id: true,
          name: true,
          bank: true,
          cardNumber: true,
          creditLimit: true,
          dueDate: true,
        },
      }),
      prisma.financialAccount.findMany({
        where: { userId: user.id, isArchived: false },
        select: {
          type: true,
          balance: true,
        },
      }),
      prisma.workSession.findMany({
        where: {
          userId: user.id,
          date: { gte: weekStart, lte: weekEnd },
        },
        select: {
          type: true,
          durationMinutes: true,
          date: true,
        },
      }),
      prisma.importantDate.findMany({
        where: { userId: user.id, date: { gte: todayStr } },
        take: 3,
        orderBy: { date: "asc" },
      }),
      prisma.partner.findFirst({
        where: { userId: user.id },
      }),
      prisma.dailyStepLog.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayStr,
          },
        },
      }),
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
    ]);

    const routinesLeftCount = activeRoutines.filter(
      (r) => !r.completions || r.completions.length === 0
    ).length;

    const todayTasks = allTasks.filter((t) => {
      if (t.status === "DONE") return t.dueDate === todayStr;
      if (!t.dueDate) return true;
      return t.dueDate <= todayStr;
    });

    const completedTasksCount = allTasks.filter((t) => t.status === "DONE").length;
    const totalTasksCount = allTasks.length;

    const totalCardOutstanding = 0;

    const upcomingCardDues = creditCards
      .map((c) => {
        const dueInfo = getNextCardDueDate(c.dueDate);
        const decNumber = decryptCardField(c.cardNumber);
        const cleanDigits = decNumber ? decNumber.replace(/\D/g, "") : "";
        const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "••••";
        return {
          id: c.id,
          name: c.name,
          bank: c.bank,
          last4,
          creditLimit: c.creditLimit,
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
      routinesLeftCount,
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
      },
      upcomingDues: upcomingCardDues.slice(0, 3),
      importantDates,
      partner,
      steps: {
        todayCount: todayStepLog?.stepCount || 0,
        targetSteps: user.settings?.defaultStepGoal || 10000,
        syncSource: todayStepLog?.syncSource || "MANUAL",
        distanceKm: todayStepLog?.distanceKm || 0,
        calories: todayStepLog?.calories || 0,
      },
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard" }, { status: 500 });
  }
}

