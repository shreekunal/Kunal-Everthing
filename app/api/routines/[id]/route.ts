import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { awardPoints } from "@/lib/rewards";
import { format } from "date-fns";
import { calculateRoutineStreak } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;
    const body = await request.json();
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const targetDate = body.date || todayStr;

    const routine = await prisma.routine.findUnique({
      where: { id, userId: user.id },
    });

    if (!routine) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    // Toggle or set completion for targetDate
    const existingCompletion = await prisma.routineCompletion.findUnique({
      where: {
        routineId_date: {
          routineId: id,
          date: targetDate,
        },
      },
    });

    let isCompletedNow = true;
    if (existingCompletion) {
      isCompletedNow = !existingCompletion.completed;
      await prisma.routineCompletion.update({
        where: { id: existingCompletion.id },
        data: { completed: isCompletedNow },
      });
    } else {
      await prisma.routineCompletion.create({
        data: {
          routineId: id,
          userId: user.id,
          date: targetDate,
          completed: true,
        },
      });
    }

    // Fetch all completed dates for this routine to calculate accurate streak
    const allCompletions = await prisma.routineCompletion.findMany({
      where: { routineId: id, completed: true },
      select: { date: true },
    });
    const completedDatesSet = new Set(allCompletions.map((c) => c.date));

    const { currentStreak, bestStreak } = calculateRoutineStreak(
      completedDatesSet,
      todayStr
    );

    const newBestStreak = Math.max(routine.bestStreak || 0, bestStreak);

    const updated = await prisma.routine.update({
      where: { id },
      data: {
        currentStreak,
        bestStreak: newBestStreak,
      },
    });

    // Award XP rewards (Balanced: 25 XP per habit + 40 XP Daily Perfect Bonus)
    if (isCompletedNow) {
      // Habit completion XP
      await awardPoints({
        userId: user.id,
        points: 25,
        type: "ROUTINE_COMPLETED",
        title: `Completed Routine: ${routine.name}`,
        reason: `Maintained habit (${routine.category})`,
        category: "HABITS",
        referenceId: `${routine.id}_${targetDate}`,
      });

      // Check if all active routines are completed today -> Daily Perfect Bonus (+40 XP)
      const allActiveRoutines = await prisma.routine.findMany({
        where: { userId: user.id, isArchived: false },
        include: {
          completions: {
            where: { date: targetDate, completed: true },
          },
        },
      });

      const allCompleted = allActiveRoutines.length > 0 && allActiveRoutines.every((r) => r.completions.length > 0);
      if (allCompleted) {
        const bonusRef = `all_routines_${targetDate}`;
        const existingBonus = await prisma.rewardLog.findFirst({
          where: { userId: user.id, referenceId: bonusRef },
        });

        if (!existingBonus) {
          await awardPoints({
            userId: user.id,
            points: 40,
            type: "DAILY_PERFECT_HABITS",
            title: "🌟 All Habits Completed! (Perfect Day Bonus)",
            reason: "Completed 100% of your daily routines today.",
            category: "HABITS",
            referenceId: bonusRef,
          });

          await prisma.notification.create({
            data: {
              userId: user.id,
              title: "🌟 Perfect Discipline Day!",
              message: "100% of daily habits logged today! +40 XP Perfect Day Bonus awarded.",
              category: "ROUTINE",
              priority: "HIGH",
            },
          });
        }
      }

      // Check for streak milestone bonus
      if ([7, 14, 30, 60, 100, 365].includes(currentStreak)) {
        const bonusXP = currentStreak >= 100 ? 250 : currentStreak >= 30 ? 100 : 50;
        await awardPoints({
          userId: user.id,
          points: bonusXP,
          type: "STREAK_BONUS",
          title: `🔥 ${currentStreak}-Day Streak Bonus: ${routine.name}`,
          reason: `Exceptional habit consistency milestone!`,
          category: "HABITS",
          referenceId: `${routine.id}_streak_${currentStreak}`,
        });

        // Surface milestone achievement in Notification Center
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: `🔥 Streak Milestone: ${routine.name}`,
            message: `Incredible dedication! You reached a ${currentStreak}-day streak on "${routine.name}". +${bonusXP} XP awarded!`,
            category: "ROUTINE",
            priority: "HIGH",
          },
        });
      }
    } else {
      // Revert XP if routine completion was unmarked
      await prisma.rewardLog.deleteMany({
        where: {
          userId: user.id,
          referenceId: { in: [`${routine.id}_${targetDate}`, `all_routines_${targetDate}`] },
        },
      });
    }

    return NextResponse.json({
      routine: updated,
      completedToday: completedDatesSet.has(todayStr),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;

    await prisma.routine.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
