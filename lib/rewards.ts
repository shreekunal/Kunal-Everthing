import { prisma } from "@/lib/prisma";
import { format, subDays, differenceInDays, startOfMonth, endOfMonth } from "date-fns";

export interface AwardParams {
  userId: string;
  points: number;
  type: string;
  title: string;
  reason?: string;
  category?: string;
  referenceId?: string;
}

export interface DeductParams {
  userId: string;
  points: number;
  type: string;
  title: string;
  reason?: string;
  category?: string;
}

/**
 * Level & Tier calculation
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 450 XP
 * Level 5: 700 XP
 * Level 6: 1000 XP
 * Formula: Base level progression
 */
export function calculateLevel(totalXP: number): {
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  isPetDead: boolean;
} {
  const isPetDead = totalXP < 0;
  const safeXP = Math.max(0, totalXP);

  // Approximate formula: Level = floor(sqrt(XP / 25)) + 1
  // XP required for level L: 25 * (L - 1)^2
  const level = Math.max(1, Math.floor(Math.sqrt(safeXP / 25)) + 1);

  const currentLevelThreshold = 25 * Math.pow(level - 1, 2);
  const nextLevelThreshold = 25 * Math.pow(level, 2);

  const xpInCurrentLevel = safeXP - currentLevelThreshold;
  const xpNeededForLevel = nextLevelThreshold - currentLevelThreshold;
  const progressPercent = isPetDead
    ? 0
    : Math.min(
        100,
        Math.max(0, Math.round((xpInCurrentLevel / (xpNeededForLevel || 1)) * 100))
      );

  let title = "Novice Disciple";
  if (isPetDead) title = "Mourning Spirit 💀";
  else if (level >= 25) title = "Grandmaster of Mind 👑";
  else if (level >= 20) title = "Apex Ascetic ⚔️";
  else if (level >= 15) title = "Monk of Focus 💎";
  else if (level >= 10) title = "Spartan Warrior 🥇";
  else if (level >= 6) title = "Iron Will 🥈";
  else if (level >= 3) title = "Disciplined Seeker 🥉";

  return {
    level: isPetDead ? 0 : level,
    title,
    currentLevelXP: totalXP,
    nextLevelXP: nextLevelThreshold,
    progressPercent,
    isPetDead,
  };
}

/**
 * Award Reward Points / XP
 */
export async function awardPoints({
  userId,
  points,
  type,
  title,
  reason,
  category = "PRODUCTIVITY",
  referenceId,
}: AwardParams) {
  const safePoints = Math.abs(points);

  const log = await prisma.rewardLog.create({
    data: {
      userId,
      points: safePoints,
      type,
      title,
      reason,
      category,
      referenceId,
    },
  });

  return log;
}

/**
 * Deduct Points / Log Discipline Infraction
 */
export async function deductPoints({
  userId,
  points,
  type,
  title,
  reason,
  category = "PENALTY",
}: DeductParams) {
  const deduction = -Math.abs(points);

  const log = await prisma.rewardLog.create({
    data: {
      userId,
      points: deduction,
      type,
      title,
      reason,
      category,
    },
  });

  const now = new Date();

  // If Unhealthy Food penalty -> reset or update CLEAN_DIET streak
  if (type === "PENALTY_UNHEALTHY_FOOD") {
    await prisma.disciplineStreak.upsert({
      where: { userId_type: { userId, type: "CLEAN_DIET" } },
      create: {
        userId,
        type: "CLEAN_DIET",
        name: "Clean Diet & Nutrition",
        currentStreak: 0,
        bestStreak: 0,
        lastResetDate: now,
      },
      update: {
        currentStreak: 0,
        lastResetDate: now,
      },
    });

    // Create system notification
    await prisma.notification.create({
      data: {
        userId,
        title: "Discipline Infraction: Junk / Unhealthy Food",
        message: `${Math.abs(points)} XP deducted. Clean Diet streak reset. Regain your focus!`,
        category: "SYSTEM",
        priority: "HIGH",
      },
    });
  }

  // If Relapse  penalty -> reset PURITY_NOFAP streak
  if (type === "PENALTY_FAP" || type === "PENALTY_RELAPSE") {
    await prisma.disciplineStreak.upsert({
      where: { userId_type: { userId, type: "PURITY_NOFAP" } },
      create: {
        userId,
        type: "PURITY_NOFAP",
        name: "Monk Purity & Focus",
        currentStreak: 0,
        bestStreak: 0,
        lastResetDate: now,
      },
      update: {
        currentStreak: 0,
        lastResetDate: now,
      },
    });

    // Create system notification
    await prisma.notification.create({
      data: {
        userId,
        title: "Monk Protocol Breach: Relapse Logged",
        message: `${Math.abs(points)} XP deducted. Purity streak reset to Day 0. Deep breath — restart right now!`,
        category: "SYSTEM",
        priority: "URGENT",
      },
    });
  }

  return log;
}

/**
 * Get or initialize discipline streaks
 */
export async function getOrCreateDisciplineStreaks(userId: string) {
  const types = [
    { type: "PURITY_NOFAP", name: "Monk Purity (No-Fap)" },
    { type: "CLEAN_DIET", name: "Clean Nutrition & Diet" },
  ];

  const results = [];
  const now = new Date();

  for (const item of types) {
    let streak = await prisma.disciplineStreak.findUnique({
      where: { userId_type: { userId, type: item.type } },
    });

    if (!streak) {
      streak = await prisma.disciplineStreak.create({
        data: {
          userId,
          type: item.type,
          name: item.name,
          currentStreak: 1,
          bestStreak: 1,
          lastResetDate: now,
        },
      });
    } else {
      // Calculate current streak in days based on lastResetDate
      const resetDate = streak.lastResetDate || streak.createdAt;
      const daysSinceReset = Math.max(0, differenceInDays(now, resetDate));

      const updatedBest = Math.max(streak.bestStreak, daysSinceReset);
      if (streak.currentStreak !== daysSinceReset || streak.bestStreak !== updatedBest) {
        streak = await prisma.disciplineStreak.update({
          where: { id: streak.id },
          data: {
            currentStreak: daysSinceReset,
            bestStreak: updatedBest,
          },
        });
      }
    }
    results.push(streak);
  }

  return results;
}

/**
 * Seed default reward store items if none exist
 */
export async function ensureDefaultRewardItems(userId: string) {
  const allowedTitles = ["Eat Junk", "Relapse"];

  // Prune any reward items that are not Eat Junk or Relapse
  await prisma.rewardItem.deleteMany({
    where: {
      userId,
      title: { notIn: allowedTitles },
    },
  });

  const existing = await prisma.rewardItem.findMany({ where: { userId } });
  const existingTitles = existing.map((i) => i.title);

  const toCreate: any[] = [];
  if (!existingTitles.includes("Eat Junk")) {
    toCreate.push({
      userId,
      title: "Eat Junk",
      cost: 200,
      category: "FOOD",
      icon: "Pizza",
    });
  }
  if (!existingTitles.includes("Relapse")) {
    toCreate.push({
      userId,
      title: "Relapse",
      cost: 500,
      category: "LEISURE",
      icon: "Zap",
    });
  }

  if (toCreate.length > 0) {
    await prisma.rewardItem.createMany({ data: toCreate });
  }
}

/**
 * Get comprehensive discipline & rewards overview
 */
export async function getDisciplineSummary(userId: string) {
  await ensureDefaultRewardItems(userId);
  const streaks = await getOrCreateDisciplineStreaks(userId);

  // Fetch all logs
  const logs = await prisma.rewardLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Calculate lifetime XP
  const lifetimeXP = logs.reduce((sum, item) => sum + item.points, 0);

  // Calculate current month XP (Reset cycle on 1st of every month)
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const daysLeftInMonth = Math.max(0, differenceInDays(currentMonthEnd, now));

  const monthlyLogs = logs.filter(
    (item) => new Date(item.createdAt) >= currentMonthStart
  );
  const monthlyXP = monthlyLogs.reduce((sum, item) => sum + item.points, 0);

  // Today start of day
  const todayDateStr = format(now, "yyyy-MM-dd");
  const todayLogs = logs.filter(
    (item) => format(item.createdAt, "yyyy-MM-dd") === todayDateStr
  );

  const todayEarned = todayLogs
    .filter((l) => l.points > 0)
    .reduce((sum, l) => sum + l.points, 0);

  const todayDeducted = Math.abs(
    todayLogs.filter((l) => l.points < 0).reduce((sum, l) => sum + l.points, 0)
  );

  // Monthly season drives current level, rank, and pet state
  const levelInfo = calculateLevel(monthlyXP);

  const rewardItems = await prisma.rewardItem.findMany({
    where: { userId, isArchived: false },
    orderBy: { cost: "asc" },
  });

  const purityStreak = streaks.find((s) => s.type === "PURITY_NOFAP") || {
    currentStreak: 0,
    bestStreak: 0,
  };

  const dietStreak = streaks.find((s) => s.type === "CLEAN_DIET") || {
    currentStreak: 0,
    bestStreak: 0,
  };

  return {
    totalXP: monthlyXP,
    lifetimeXP,
    monthlyXP,
    season: {
      name: format(now, "MMMM yyyy"),
      daysRemaining: daysLeftInMonth,
    },
    ...levelInfo,
    todayEarned,
    todayDeducted,
    streaks: {
      purity: purityStreak,
      diet: dietStreak,
    },
    recentLogs: logs.slice(0, 30),
    rewardItems,
  };
}
