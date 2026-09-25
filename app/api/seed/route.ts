import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const {
      bankName,
      bankBalance,
      investmentName,
      investmentBalance,
      cardName,
      cardBank,
      cardNumber,
      cardExpiry,
      expiryDate,
      cardCvv,
      cardLimit,
      cardOutstanding,
      cardDueDate,
      partnerName,
      partnerNickname,
      partnerPhone,
      partnerBirthday,
      partnerAnniversary,
      partnerPreferences,
      partnerNotes,
      taskTitles,
      routineNames,
    } = body;

    // 1. Financial Accounts
    if (bankName && bankBalance !== undefined) {
      await prisma.financialAccount.create({
        data: {
          userId: user.id,
          name: bankName,
          type: "ASSET",
          category: "BANK",
          balance: Number(bankBalance) || 0,
        },
      });
    }

    if (investmentName && investmentBalance !== undefined) {
      await prisma.financialAccount.create({
        data: {
          userId: user.id,
          name: investmentName,
          type: "ASSET",
          category: "INVESTMENT",
          balance: Number(investmentBalance) || 0,
        },
      });
    }

    // 2. Credit Card
    if (cardName) {
      const cleanNum = (cardNumber || "").replace(/\s+/g, "");
      const derivedLast4 = cleanNum.length >= 4 ? cleanNum.slice(-4) : "0000";

      await prisma.creditCard.create({
        data: {
          userId: user.id,
          name: cardName,
          bank: cardBank || "",
          network: "VISA",
          cardNumber: cleanNum || null,
          expiryDate: cardExpiry || expiryDate || null,
          cvv: cardCvv || null,
          last4: derivedLast4,
          creditLimit: Number(cardLimit) || 100000,
          currentOutstanding: Number(cardOutstanding) || 0,
          statementDate: 12,
          dueDate: Number(cardDueDate) || 30,
        },
      });
    }

    // 3. Partner Profile
    if (partnerName) {
      const existing = await prisma.partner.findFirst({
        where: { userId: user.id },
      });

      if (existing) {
        await prisma.partner.update({
          where: { id: existing.id },
          data: {
            name: partnerName,
            nickname: partnerNickname || null,
            phone: partnerPhone || null,
            birthday: partnerBirthday || null,
            anniversary: partnerAnniversary || null,
            preferences: partnerPreferences || null,
            notes: partnerNotes || null,
          },
        });
      } else {
        await prisma.partner.create({
          data: {
            userId: user.id,
            name: partnerName,
            nickname: partnerNickname || null,
            phone: partnerPhone || null,
            birthday: partnerBirthday || null,
            anniversary: partnerAnniversary || null,
            preferences: partnerPreferences || null,
            notes: partnerNotes || null,
          },
        });
      }
    }

    // 4. Tasks (comma or newline separated)
    if (taskTitles && typeof taskTitles === "string") {
      const tasks = taskTitles
        .split(/[\n,]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      for (const t of tasks) {
        await prisma.task.create({
          data: {
            userId: user.id,
            title: t,
            priority: "HIGH",
            status: "TODO",
            category: "General",
          },
        });
      }
    }

    // 5. Routines (comma or newline separated)
    if (routineNames && typeof routineNames === "string") {
      const routines = routineNames
        .split(/[\n,]+/)
        .map((r) => r.trim())
        .filter(Boolean);

      for (const r of routines) {
        await prisma.routine.create({
          data: {
            userId: user.id,
            name: r,
            category: "Health",
            targetDays: "DAILY",
            targetDurationMinutes: 30,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Custom setup successfully fed into portal!",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to feed setup data" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.task.deleteMany({ where: { userId: user.id } });
    await prisma.routineCompletion.deleteMany({ where: { userId: user.id } });
    await prisma.routine.deleteMany({ where: { userId: user.id } });
    await prisma.workSession.deleteMany({ where: { userId: user.id } });
    await prisma.creditCardPayment.deleteMany({ where: { userId: user.id } });
    await prisma.creditCard.deleteMany({ where: { userId: user.id } });
    await prisma.debitCard.deleteMany({ where: { userId: user.id } });
    await prisma.financialAccount.deleteMany({ where: { userId: user.id } });
    await prisma.netWorthSnapshot.deleteMany({ where: { userId: user.id } });
    await prisma.importantDate.deleteMany({ where: { userId: user.id } });
    await prisma.scheduledMessage.deleteMany({ where: { userId: user.id } });
    await prisma.messageTemplate.deleteMany({ where: { userId: user.id } });
    await prisma.partner.deleteMany({ where: { userId: user.id } });
    await prisma.dailyDiary.deleteMany({ where: { userId: user.id } });
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
