import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDisciplineSummary, awardPoints, deductPoints } from "@/lib/rewards";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const summary = await getDisciplineSummary(user.id);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Rewards GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load discipline rewards data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { action, points, title, reason, notes, itemId } = body;

    // 1. Unhealthy food penalty
    if (action === "PENALTY_UNHEALTHY_FOOD") {
      const deduction = points || 50;
      const log = await deductPoints({
        userId: user.id,
        points: deduction,
        type: "PENALTY_UNHEALTHY_FOOD",
        title: title || "Discipline Infraction: Unhealthy / Junk Food",
        reason: notes || reason || "Ate junk/processed food. Resetting clean nutrition streak.",
        category: "NUTRITION",
      });
      return NextResponse.json({ success: true, log });
    }

    // 2. FAP / Relapse penalty
    if (action === "PENALTY_FAP" || action === "PENALTY_RELAPSE") {
      const deduction = points || 100;
      const log = await deductPoints({
        userId: user.id,
        points: deduction,
        type: "PENALTY_FAP",
        title: title || "Monk Protocol Breach: Relapse ",
        reason: notes || reason || "Discipline relapse logged. Resetting purity streak to Day 0.",
        category: "PURITY",
      });
      return NextResponse.json({ success: true, log });
    }

    // 3. Custom penalty
    if (action === "PENALTY_CUSTOM") {
      if (!points || !title) {
        return NextResponse.json({ error: "Points and Title are required" }, { status: 400 });
      }
      const log = await deductPoints({
        userId: user.id,
        points: Math.abs(points),
        type: "PENALTY_CUSTOM",
        title,
        reason: notes || reason,
        category: "PENALTY",
      });
      return NextResponse.json({ success: true, log });
    }

    // 4. Custom reward
    if (action === "REWARD_CUSTOM") {
      if (!points || !title) {
        return NextResponse.json({ error: "Points and Title are required" }, { status: 400 });
      }
      const log = await awardPoints({
        userId: user.id,
        points: Math.abs(points),
        type: "REWARD_CUSTOM",
        title,
        reason: notes || reason,
        category: "DISCIPLINE",
      });
      return NextResponse.json({ success: true, log });
    }

    // 5. Evening Monk Bedtime Reflection Check-in
    if (action === "EVENING_CHECKIN") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existing = await prisma.rewardLog.findFirst({
        where: {
          userId: user.id,
          type: "REWARD_DAILY_CHECKIN",
          createdAt: {
            gte: todayStart,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "You have already completed today's evening reflection!" },
          { status: 400 }
        );
      }

      const log = await awardPoints({
        userId: user.id,
        points: 50,
        type: "REWARD_DAILY_CHECKIN",
        title: "Evening Monk Reflection Completed",
        reason: notes || "Preserved monk purity and clean nutrition throughout the day.",
        category: "DISCIPLINE",
      });

      return NextResponse.json({ success: true, log });
    }

    // 6. Daily Water / Hydration Target Completed Reward (+30 XP)
    if (action === "REWARD_WATER") {
      const todayKey = format(new Date(), "yyyy-MM-dd");
      const referenceId = `water_${todayKey}`;

      // Check if already awarded today to prevent duplicate farming
      const existing = await prisma.rewardLog.findFirst({
        where: {
          userId: user.id,
          referenceId,
        },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          alreadyAwarded: true,
          log: existing,
          points: existing.points,
          message: "Today's hydration reward has already been claimed!",
        });
      }

      const pointsToAward = points || 30;
      const log = await awardPoints({
        userId: user.id,
        points: pointsToAward,
        type: "REWARD_WATER",
        title: "💧 Daily Hydration Target Reached",
        reason: notes || reason || `Completed daily hydration quota (+${pointsToAward} XP).`,
        category: "HEALTH",
        referenceId,
      });

      // Auto-complete any active hydration routine in the user's habits
      try {
        const hydrationRoutine = await prisma.routine.findFirst({
          where: {
            userId: user.id,
            isArchived: false,
            OR: [
              { name: { contains: "Hydration", mode: "insensitive" } },
              { name: { contains: "Water", mode: "insensitive" } },
            ],
          },
        });
        if (hydrationRoutine) {
          await prisma.routineCompletion.upsert({
            where: {
              routineId_date: {
                routineId: hydrationRoutine.id,
                date: todayKey,
              },
            },
            create: {
              userId: user.id,
              routineId: hydrationRoutine.id,
              date: todayKey,
              completed: true,
            },
            update: {
              completed: true,
            },
          });
        }
      } catch (e) {
        console.error("Routine auto-complete error for water:", e);
      }

      return NextResponse.json({
        success: true,
        log,
        points: pointsToAward,
        message: `Earned +${pointsToAward} XP for daily hydration!`,
      });
    }

    // 7. Revert Water Reward (if user un-increments back below target)
    if (action === "REVERT_WATER") {
      const todayKey = format(new Date(), "yyyy-MM-dd");
      const referenceId = `water_${todayKey}`;

      await prisma.rewardLog.deleteMany({
        where: {
          userId: user.id,
          referenceId,
        },
      });

      return NextResponse.json({ success: true, message: "Hydration reward reverted." });
    }

    // 8. Redeem reward perk from store
    if (action === "REDEEM_REWARD") {
      if (!itemId) {
        return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
      }

      const item = await prisma.rewardItem.findUnique({
        where: { id: itemId, userId: user.id },
      });

      if (!item) {
        return NextResponse.json({ error: "Reward perk not found" }, { status: 404 });
      }

      // Check current XP
      const summary = await getDisciplineSummary(user.id);
      if (summary.totalXP < item.cost) {
        return NextResponse.json(
          { error: `Insufficient XP. You need ${item.cost} XP (Current: ${summary.totalXP} XP)` },
          { status: 400 }
        );
      }

      // Log redemption deduction
      const log = await prisma.rewardLog.create({
        data: {
          userId: user.id,
          points: -Math.abs(item.cost),
          type: "REWARD_REDEMPTION",
          title: `Unlocked Perk: ${item.title}`,
          reason: `Redeemed ${item.cost} XP for guilt-free privilege`,
          category: item.category,
          referenceId: item.id,
        },
      });

      // Increment times redeemed
      await prisma.rewardItem.update({
        where: { id: item.id },
        data: { timesRedeemed: { increment: 1 } },
      });

      return NextResponse.json({ success: true, log, message: `Enjoy your ${item.title}!` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Rewards POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process discipline action" },
      { status: 500 }
    );
  }
}
