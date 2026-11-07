import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, subDays, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const sevenDaysAgo = subDays(now, 6);
    const sevenDaysAgoStr = format(sevenDaysAgo, "yyyy-MM-dd");
    const sevenDaysAgoDate = startOfDay(sevenDaysAgo);

    const [workSessions, stepLogs, rewardLogs, completedTasksCount, diaryEntries] =
      await Promise.all([
        // 1. Focus Sessions (last 7 days)
        prisma.workSession.findMany({
          where: {
            userId: user.id,
            date: { gte: sevenDaysAgoStr, lte: todayStr },
          },
          select: { durationMinutes: true, type: true },
        }),

        // 2. Step logs (last 7 days)
        prisma.dailyStepLog.findMany({
          where: {
            userId: user.id,
            date: { gte: sevenDaysAgoStr, lte: todayStr },
          },
          select: { stepCount: true },
        }),

        // 3. Points earned (last 7 days positive reward logs)
        prisma.rewardLog.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: sevenDaysAgoDate },
            points: { gt: 0 },
          },
          select: { points: true },
        }),

        // 4. Tasks done (last 7 days)
        prisma.task.count({
          where: {
            userId: user.id,
            status: "DONE",
            updatedAt: { gte: sevenDaysAgoDate },
          },
        }),

        // 5. Daily Diary mood & ratings (last 7 days)
        prisma.dailyDiary.findMany({
          where: {
            userId: user.id,
            date: { gte: sevenDaysAgoStr, lte: todayStr },
          },
          select: { mood: true, rating: true },
        }),
      ]);

    // Aggregate metrics (Strictly NO money/spending data)
    const totalFocusMinutes = workSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    const focusHours = Number((totalFocusMinutes / 60).toFixed(1));

    const totalSteps = stepLogs.reduce((sum, s) => sum + (s.stepCount || 0), 0);

    const pointsEarned = rewardLogs.reduce((sum, r) => sum + (r.points || 0), 0);

    // Calculate dominant mood & average rating
    let dominantMood = "Reflective";
    let averageRating = 5.0;

    if (diaryEntries.length > 0) {
      const moodCounts: Record<string, number> = {};
      let ratingSum = 0;

      for (const d of diaryEntries) {
        if (d.mood) {
          moodCounts[d.mood] = (moodCounts[d.mood] || 0) + 1;
        }
        ratingSum += d.rating || 5;
      }

      const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
      if (sortedMoods.length > 0) {
        dominantMood = sortedMoods[0][0];
      }
      averageRating = Number((ratingSum / diaryEntries.length).toFixed(1));
    }

    const dateRange = `${format(sevenDaysAgo, "d MMM")} – ${format(now, "d MMM yyyy")}`;

    return NextResponse.json({
      userName: user.name || "Kunal",
      dateRange,
      focusHours,
      totalSteps,
      pointsEarned,
      tasksDone: completedTasksCount,
      dominantMood,
      averageRating,
      diaryEntriesCount: diaryEntries.length,
    });
  } catch (error: any) {
    console.error("Weekly recap GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load weekly recap" },
      { status: 500 }
    );
  }
}
