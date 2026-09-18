import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  DEFAULT_MESSAGE_TEMPLATES,
  DEFAULT_ROUTINES_PRESET,
  INDIAN_CARD_PRESETS,
} from "@/lib/presets";
import { format, subDays } from "date-fns";

export async function POST() {
  try {
    const user = await getCurrentUser();
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // 1. Seed Accounts
    const existingAccounts = await prisma.financialAccount.count({
      where: { userId: user.id },
    });

    if (existingAccounts === 0) {
      await prisma.financialAccount.createMany({
        data: [
          {
            userId: user.id,
            name: "HDFC Salary Account",
            type: "ASSET",
            category: "BANK",
            balance: 65400,
          },
          {
            userId: user.id,
            name: "Zerodha Mutual Funds",
            type: "ASSET",
            category: "INVESTMENT",
            balance: 245000,
          },
          {
            userId: user.id,
            name: "Physical Cash",
            type: "ASSET",
            category: "CASH",
            balance: 8500,
          },
          {
            userId: user.id,
            name: "Emergency FD",
            type: "ASSET",
            category: "FD",
            balance: 50000,
          },
          {
            userId: user.id,
            name: "Education Loan",
            type: "LIABILITY",
            category: "LOAN",
            balance: 26400,
          },
        ],
      });
    }

    // 2. Seed Credit Cards
    const existingCards = await prisma.creditCard.count({
      where: { userId: user.id },
    });

    if (existingCards === 0) {
      await prisma.creditCard.createMany({
        data: [
          {
            userId: user.id,
            name: "Millennia",
            bank: "HDFC Bank",
            network: "VISA",
            last4: "4821",
            creditLimit: 150000,
            statementDate: 12,
            dueDate: 30,
            currentOutstanding: 8240,
            minDue: 412,
            autopay: false,
          },
          {
            userId: user.id,
            name: "Amazon Pay ICICI",
            bank: "ICICI Bank",
            network: "VISA",
            last4: "9312",
            creditLimit: 200000,
            statementDate: 20,
            dueDate: 8,
            currentOutstanding: 3450,
            minDue: 200,
            autopay: true,
          },
        ],
      });
    }

    // 3. Seed Routines
    const existingRoutines = await prisma.routine.count({
      where: { userId: user.id },
    });

    if (existingRoutines === 0) {
      for (const r of DEFAULT_ROUTINES_PRESET) {
        const routine = await prisma.routine.create({
          data: {
            userId: user.id,
            name: r.name,
            category: r.category,
            targetDays: r.targetDays,
            targetDurationMinutes: r.targetDurationMinutes,
            currentStreak: 4,
            bestStreak: 12,
          },
        });

        // Seed sample completions for past 4 days
        for (let i = 1; i <= 4; i++) {
          await prisma.routineCompletion.create({
            data: {
              routineId: routine.id,
              userId: user.id,
              date: format(subDays(new Date(), i), "yyyy-MM-dd"),
              completed: true,
            },
          });
        }
      }
    }

    // 4. Seed Tasks
    const existingTasks = await prisma.task.count({
      where: { userId: user.id },
    });

    if (existingTasks === 0) {
      await prisma.task.createMany({
        data: [
          {
            userId: user.id,
            title: "Review Supplier Portal MCP deployment",
            priority: "HIGH",
            status: "TODO",
            dueDate: todayStr,
            category: "Work",
          },
          {
            userId: user.id,
            title: "Study Next.js App Router caching strategy",
            priority: "MEDIUM",
            status: "TODO",
            dueDate: todayStr,
            category: "Study",
          },
          {
            userId: user.id,
            title: "Pay HDFC Millennia credit card bill",
            priority: "HIGH",
            status: "TODO",
            dueDate: todayStr,
            category: "Finance",
          },
          {
            userId: user.id,
            title: "Read 20 pages of Atomic Habits",
            priority: "LOW",
            status: "DONE",
            dueDate: todayStr,
            category: "Mindset",
          },
        ],
      });
    }

    // 5. Seed Work Sessions for Progress Graphs
    const existingSessions = await prisma.workSession.count({
      where: { userId: user.id },
    });

    if (existingSessions === 0) {
      for (let i = 0; i < 7; i++) {
        const dStr = format(subDays(new Date(), i), "yyyy-MM-dd");
        await prisma.workSession.createMany({
          data: [
            {
              userId: user.id,
              type: "WORK",
              project: "Supplier Portal MCP",
              durationMinutes: 120 + (i % 3) * 30,
              date: dStr,
            },
            {
              userId: user.id,
              type: "STUDY",
              project: "Cloud Architecture",
              durationMinutes: 45 + (i % 2) * 20,
              date: dStr,
            },
            {
              userId: user.id,
              type: "PERSONAL",
              project: "Gym & Fitness",
              durationMinutes: 60,
              date: dStr,
            },
          ],
        });
      }
    }

    // 6. Seed Partner Profile
    const existingPartner = await prisma.partner.findFirst({
      where: { userId: user.id },
    });

    if (!existingPartner) {
      await prisma.partner.create({
        data: {
          userId: user.id,
          name: "Partner",
          nickname: "Babu ❤️",
          birthday: "1998-10-15",
          anniversary: "2022-09-24",
          phone: "+919876543210",
          preferences: "Loves tulips, dark chocolate, and surprise dinner dates",
          notes: "Anniversary coming up soon!",
        },
      });
    }

    // 7. Seed Message Templates
    const existingTemplates = await prisma.messageTemplate.count({
      where: { userId: user.id },
    });

    if (existingTemplates === 0) {
      for (const tmpl of DEFAULT_MESSAGE_TEMPLATES) {
        await prisma.messageTemplate.create({
          data: {
            userId: user.id,
            category: tmpl.category,
            title: tmpl.title,
            content: tmpl.content,
            isDefault: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Presets seeded successfully!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();

    await prisma.task.deleteMany({ where: { userId: user.id } });
    await prisma.routineCompletion.deleteMany({ where: { userId: user.id } });
    await prisma.routine.deleteMany({ where: { userId: user.id } });
    await prisma.workSession.deleteMany({ where: { userId: user.id } });
    await prisma.creditCardPayment.deleteMany({ where: { userId: user.id } });
    await prisma.creditCard.deleteMany({ where: { userId: user.id } });
    await prisma.financialAccount.deleteMany({ where: { userId: user.id } });
    await prisma.netWorthSnapshot.deleteMany({ where: { userId: user.id } });
    await prisma.importantDate.deleteMany({ where: { userId: user.id } });
    await prisma.scheduledMessage.deleteMany({ where: { userId: user.id } });
    await prisma.messageTemplate.deleteMany({ where: { userId: user.id } });
    await prisma.partner.deleteMany({ where: { userId: user.id } });
    await prisma.vaultItem.deleteMany({ where: { userId: user.id } });
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.rewardLog.deleteMany({ where: { userId: user.id } });
    await prisma.disciplineStreak.deleteMany({ where: { userId: user.id } });
    await prisma.rewardItem.deleteMany({ where: { userId: user.id } });

    return NextResponse.json({
      success: true,
      message: "All portal data purged cleanly.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

