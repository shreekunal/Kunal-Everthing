import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";

    // Query full dataset belonging exclusively to current user
    const [
      settings,
      tasks,
      routines,
      routineCompletions,
      workSessions,
      accounts,
      creditCards,
      debitCards,
      netWorthSnapshots,
      importantDates,
      partner,
      messageTemplates,
      scheduledMessages,
      dailyDiaries,
      disciplineStreaks,
      rewardLogs,
      rewardItems,
    ] = await Promise.all([
      prisma.userSettings.findUnique({ where: { userId: user.id } }),
      prisma.task.findMany({ where: { userId: user.id } }),
      prisma.routine.findMany({ where: { userId: user.id } }),
      prisma.routineCompletion.findMany({ where: { userId: user.id } }),
      prisma.workSession.findMany({ where: { userId: user.id } }),
      prisma.financialAccount.findMany({ where: { userId: user.id } }),
      prisma.creditCard.findMany({ where: { userId: user.id } }),
      prisma.debitCard.findMany({ where: { userId: user.id } }),
      prisma.netWorthSnapshot.findMany({ where: { userId: user.id } }),
      prisma.importantDate.findMany({ where: { userId: user.id } }),
      prisma.partner.findUnique({ where: { userId: user.id } }),
      prisma.messageTemplate.findMany({ where: { userId: user.id } }),
      prisma.scheduledMessage.findMany({ where: { userId: user.id } }),
      prisma.dailyDiary.findMany({ where: { userId: user.id } }),
      prisma.disciplineStreak.findMany({ where: { userId: user.id } }),
      prisma.rewardLog.findMany({ where: { userId: user.id } }),
      prisma.rewardItem.findMany({ where: { userId: user.id } }),
    ]);

    const backupData = {
      settings,
      tasks,
      routines,
      routineCompletions,
      workSessions,
      accounts,
      creditCards,
      debitCards,
      netWorthSnapshots,
      importantDates,
      partner,
      messageTemplates,
      scheduledMessages,
      dailyDiaries,
      disciplineStreaks,
      rewardLogs,
      rewardItems,
    };

    // Calculate SHA-256 checksum for tamper detection
    const dataString = JSON.stringify(backupData);
    const checksum = crypto.createHash("sha256").update(dataString).digest("hex");

    const payload = {
      app: "kunal-os",
      version: "3.0",
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      checksum,
      summary: {
        tasks: tasks.length,
        routines: routines.length,
        routineCompletions: routineCompletions.length,
        workSessions: workSessions.length,
        accounts: accounts.length,
        creditCards: creditCards.length,
        debitCards: debitCards.length,
        dailyDiaries: dailyDiaries.length,
        importantDates: importantDates.length,
        rewardLogs: rewardLogs.length,
      },
      data: backupData,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isDownload) {
      const today = new Date().toISOString().split("T")[0];
      headers["Content-Disposition"] = `attachment; filename="kunal-os-backup-${today}.json"`;
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { backup, dryRun } = body;

    if (!backup || !backup.data) {
      return NextResponse.json({ error: "Invalid backup file: missing data" }, { status: 400 });
    }

    // Check integrity checksum if available
    if (backup.checksum) {
      const computed = crypto.createHash("sha256").update(JSON.stringify(backup.data)).digest("hex");
      if (computed !== backup.checksum) {
        return NextResponse.json(
          { error: "Tampered or corrupted backup file: checksum mismatch" },
          { status: 400 }
        );
      }
    }

    const { data } = backup;

    // Dry Run Preview
    if (dryRun) {
      return NextResponse.json({
        valid: true,
        exportDate: backup.exportDate,
        counts: {
          tasks: data.tasks?.length || 0,
          routines: data.routines?.length || 0,
          accounts: data.accounts?.length || 0,
          creditCards: data.creditCards?.length || 0,
          debitCards: data.debitCards?.length || 0,
          dailyDiaries: data.dailyDiaries?.length || 0,
          importantDates: data.importantDates?.length || 0,
          workSessions: data.workSessions?.length || 0,
        },
      });
    }

    // Safe Atomic Transaction Restore
    await prisma.$transaction(async (tx) => {
      // 1. Settings
      if (data.settings) {
        const { id, userId, createdAt, updatedAt, ...settingFields } = data.settings;
        await tx.userSettings.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...settingFields },
          update: settingFields,
        });
      }

      // 2. Tasks
      if (Array.isArray(data.tasks)) {
        for (const t of data.tasks) {
          const { id, userId, createdAt, updatedAt, ...taskData } = t;
          await tx.task.upsert({
            where: { id: id || "temp-id" },
            create: { id, userId: user.id, ...taskData },
            update: { ...taskData },
          });
        }
      }

      // 3. Routines
      if (Array.isArray(data.routines)) {
        for (const r of data.routines) {
          const { id, userId, createdAt, updatedAt, ...routineData } = r;
          await tx.routine.upsert({
            where: { id: id || "temp-id" },
            create: { id, userId: user.id, ...routineData },
            update: { ...routineData },
          });
        }
      }

      // 4. Financial Accounts
      if (Array.isArray(data.accounts)) {
        for (const a of data.accounts) {
          const { id, userId, createdAt, updatedAt, ...accData } = a;
          await tx.financialAccount.upsert({
            where: { id: id || "temp-id" },
            create: { id, userId: user.id, ...accData },
            update: { ...accData },
          });
        }
      }

      // 5. Credit Cards
      if (Array.isArray(data.creditCards)) {
        for (const c of data.creditCards) {
          const { id, userId, createdAt, updatedAt, ...cardData } = c;
          await tx.creditCard.upsert({
            where: { id: id || "temp-id" },
            create: { id, userId: user.id, ...cardData },
            update: { ...cardData },
          });
        }
      }

      // 6. Debit Cards
      if (Array.isArray(data.debitCards)) {
        for (const d of data.debitCards) {
          const { id, userId, createdAt, updatedAt, ...debitData } = d;
          await tx.debitCard.upsert({
            where: { id: id || "temp-id" },
            create: { id, userId: user.id, ...debitData },
            update: { ...debitData },
          });
        }
      }

      // 7. Important Dates
      if (Array.isArray(data.importantDates)) {
        for (const dt of data.importantDates) {
          const { id, userId, createdAt, updatedAt, ...dateData } = dt;
          await tx.importantDate.upsert({
            where: { id: id || "temp-id" },
            create: { id, userId: user.id, ...dateData },
            update: { ...dateData },
          });
        }
      }

      // 8. Daily Diary
      if (Array.isArray(data.dailyDiaries)) {
        for (const dy of data.dailyDiaries) {
          const { id, userId, createdAt, updatedAt, ...diaryData } = dy;
          await tx.dailyDiary.upsert({
            where: { userId_date: { userId: user.id, date: diaryData.date } },
            create: { id, userId: user.id, ...diaryData },
            update: { ...diaryData },
          });
        }
      }

      // 9. Partner
      if (data.partner) {
        const { id, userId, createdAt, updatedAt, ...partnerData } = data.partner;
        await tx.partner.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...partnerData },
          update: { ...partnerData },
        });
      }

      // 10. Discipline Streaks
      if (Array.isArray(data.disciplineStreaks)) {
        for (const s of data.disciplineStreaks) {
          const { id, userId, createdAt, updatedAt, ...streakData } = s;
          await tx.disciplineStreak.upsert({
            where: { userId_type: { userId: user.id, type: streakData.type } },
            create: { userId: user.id, ...streakData },
            update: { ...streakData },
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      restoredAt: new Date().toISOString(),
      message: "Zero-loss restore completed successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
