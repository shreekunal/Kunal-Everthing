import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getNextCardDueDate } from "@/lib/formatters";
import { format } from "date-fns";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Dynamic Notifications Generator
    const dynamicNotifs: any[] = [];

    // 1. Check Credit Card Dues
    const cards = await prisma.creditCard.findMany({
      where: { userId: user.id, isArchived: false, currentOutstanding: { gt: 0 } },
    });

    for (const card of cards) {
      const dueInfo = getNextCardDueDate(card.dueDate);
      if (dueInfo.daysRemaining <= 3 && dueInfo.daysRemaining >= 0) {
        dynamicNotifs.push({
          id: `card-${card.id}-${dueInfo.daysRemaining}`,
          title: `Credit Card Due: ${card.bank} ${card.name}`,
          message: `Payment of ₹${card.currentOutstanding.toLocaleString("en-IN")} is ${dueInfo.label}.`,
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
        id: `task-${task.id}-${isReminderTriggered ? "remind" : "overdue"}`,
        title: isReminderTriggered ? `Reminder: ${task.title}` : `Overdue Task: ${task.title}`,
        message: isReminderTriggered
          ? `Scheduled task reminder alert for today.`
          : `Task is past its due date (${task.dueDate}).`,
        category: "TASK",
        priority: task.priority === "HIGH" || isReminderTriggered ? "URGENT" : "HIGH",
        isRead: false,
      });
    }

    // 3. Stored Notifications
    const storedNotifs = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const allNotifs = [...dynamicNotifs, ...storedNotifs];
    const unreadCount = allNotifs.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: allNotifs,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
