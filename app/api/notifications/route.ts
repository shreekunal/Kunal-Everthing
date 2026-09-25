import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getNextCardDueDate } from "@/lib/formatters";
import { format, subDays } from "date-fns";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Dynamic Notifications Generator
    const dynamicNotifs: any[] = [];

    // 1. Check Credit Card Dues
    const cards = await prisma.creditCard.findMany({
      where: { userId: user.id, isArchived: false },
    });

    for (const card of cards) {
      const dueInfo = getNextCardDueDate(card.dueDate);
      if (dueInfo.daysRemaining <= 3 && dueInfo.daysRemaining >= 0) {
        dynamicNotifs.push({
          id: `card-${card.id}-${dueInfo.daysRemaining}`,
          title: `Credit Card Due: ${card.bank ? `${card.bank} ` : ""}${card.name}`,
          message: `Payment statement due date is ${dueInfo.label}.`,
          category: "CARD_DUE",
          priority: dueInfo.daysRemaining === 0 ? "URGENT" : "HIGH",
          isRead: false,
        });
      }
    }

    // 2. Check Overdue Tasks & Triggered Reminders
    const now = new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        isArchived: false,
        status: { not: "DONE" },
        OR: [
          { dueDate: { lt: todayStr } },
          { remindAt: { lte: now } },
        ],
      },
      take: 6,
    });

    for (const task of overdueTasks) {
      const isReminderTriggered = task.remindAt && new Date(task.remindAt) <= now;
      dynamicNotifs.push({
        id: `task-${task.id}-${isReminderTriggered ? "remind" : "overdue"}-${todayStr}`,
        title: isReminderTriggered ? `Reminder: ${task.title}` : `Overdue Task: ${task.title}`,
        message: isReminderTriggered
          ? `Scheduled task reminder alert for today.`
          : `Task is past its due date (${task.dueDate}).`,
        category: "TASK",
        priority: task.priority === "HIGH" || isReminderTriggered ? "URGENT" : "HIGH",
        isRead: false,
      });
    }

    // 3. Check Daily Routines & Streaks
    const routines = await prisma.routine.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        completions: {
          where: { date: todayStr, completed: true },
        },
      },
    });

    const incompleteRoutines = routines.filter((r) => r.completions.length === 0);
    const atRiskRoutines = incompleteRoutines.filter((r) => r.currentStreak >= 2);

    for (const r of atRiskRoutines) {
      dynamicNotifs.push({
        id: `routine-at-risk-${r.id}-${todayStr}`,
        title: `⚡ Streak at Risk: ${r.name}`,
        message: `Your ${r.currentStreak}-day streak will reset at midnight if not logged today!`,
        category: "ROUTINE",
        priority: "URGENT",
        isRead: false,
      });
    }

    const currentHour = now.getHours();
    if (currentHour >= 17 && incompleteRoutines.length > 0 && atRiskRoutines.length === 0) {
      dynamicNotifs.push({
        id: `routine-pending-${todayStr}`,
        title: `Daily Habits: ${incompleteRoutines.length} Pending`,
        message: `You have ${incompleteRoutines.length} routine${incompleteRoutines.length > 1 ? "s" : ""} left to complete today. Defend your streaks!`,
        category: "ROUTINE",
        priority: "HIGH",
        isRead: false,
      });
    }

    // 4. Check Important Dates (Birthdays, Anniversaries, Bill dues)
    const importantDates = await prisma.importantDate.findMany({
      where: { userId: user.id },
    });

    for (const d of importantDates) {
      if (!d.date) continue;
      const parts = d.date.split("-").map(Number);
      if (parts.length < 3) continue;
      const [_, month, day] = parts;
      const thisYearTarget = new Date(now.getFullYear(), month - 1, day);
      let targetDate = thisYearTarget;

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (d.repeatPattern === "YEARLY" && targetDate < todayStart) {
        targetDate = new Date(now.getFullYear() + 1, month - 1, day);
      }

      const diffMs = targetDate.getTime() - todayStart.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const reminderDays = (d.reminderDaysBefore || "14,7,1,0")
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      if (daysRemaining >= 0 && (reminderDays.includes(daysRemaining) || daysRemaining <= 1)) {
        const label = daysRemaining === 0 ? "Today!" : daysRemaining === 1 ? "Tomorrow" : `in ${daysRemaining} days`;
        dynamicNotifs.push({
          id: `date-${d.id}-${daysRemaining}-${todayStr}`,
          title: daysRemaining === 0 ? `🎉 Today: ${d.name}` : `Upcoming: ${d.name} (${label})`,
          message: `${d.name} (${d.category}) is ${label}.`,
          category: "DATE",
          priority: daysRemaining === 0 ? "URGENT" : daysRemaining === 1 ? "HIGH" : "NORMAL",
          isRead: false,
        });
      }
    }

    // 5. Check Daily Diary Entry for Today
    const todayDiary = await prisma.dailyDiary.findFirst({
      where: { userId: user.id, date: todayStr },
    });

    if (!todayDiary) {
      dynamicNotifs.push({
        id: `diary-pending-${todayStr}`,
        title: `✍️ Daily Diary Pending`,
        message: `Take a minute to log your reflection, study hours & water intake for today!`,
        category: "DIARY",
        priority: "HIGH",
        isRead: false,
      });
    }

    // 6. Persist dynamic alerts into database with actionUrl as dedup key
    const recentDbNotifs = await prisma.notification.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: subDays(now, 7) },
      },
    });

    const existingKeys = new Set(recentDbNotifs.map((n) => n.actionUrl).filter(Boolean));
    const toCreate = dynamicNotifs.filter((dn) => !existingKeys.has(dn.id));

    if (toCreate.length > 0) {
      await prisma.notification.createMany({
        data: toCreate.map((dn) => ({
          userId: user.id,
          title: dn.title,
          message: dn.message,
          category: dn.category,
          priority: dn.priority,
          actionUrl: dn.id,
          isRead: false,
        })),
      });
    }

    // 6. Query all consolidated notifications from database
    const allNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const unreadCount = allNotifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: allNotifications,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
