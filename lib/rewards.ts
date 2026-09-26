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

  // If Relapse penalty -> reset PURITY_NOFAP streak
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

  // If Sleep penalty -> reset SLEEP_SCHEDULE streak
  if (type === "PENALTY_SLEEP") {
    await prisma.disciplineStreak.upsert({
      where: { userId_type: { userId, type: "SLEEP_SCHEDULE" } },
      create: {
        userId,
        type: "SLEEP_SCHEDULE",
        name: "Sleep & Recovery Protocol",
        currentStreak: 0,
        bestStreak: 0,
        lastResetDate: now,
      },
      update: {
        currentStreak: 0,
        lastResetDate: now,
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        title: "Discipline Infraction: Sleep Protocol Broken",
        message: `${Math.abs(points)} XP deducted. Sleep Schedule streak reset. Prioritize restorative rest!`,
        category: "SYSTEM",
        priority: "NORMAL",
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
    { type: "SLEEP_SCHEDULE", name: "Sleep & Recovery Protocol" },
  ];

  const now = new Date();
  const existingStreaks = await prisma.disciplineStreak.findMany({
    where: { userId },
  });

  const results = [];
  for (const item of types) {
    let streak = existingStreaks.find((s) => s.type === item.type);

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
      const resetDate = streak.lastResetDate || streak.createdAt;
      const daysSinceReset = Math.max(0, differenceInDays(now, resetDate));
      const updatedBest = Math.max(streak.bestStreak, daysSinceReset);

      streak = {
        ...streak,
        currentStreak: daysSinceReset,
        bestStreak: updatedBest,
      };
    }
    results.push(streak);
  }

  return results;
}

export const DEFAULT_STORE_PERKS = [
  {
    title: "Eat Junk Pass",
    cost: 150,
    category: "FOOD",
    icon: "Pizza",
    description: "One planned, guilt-free cheat meal or junk food treat without penalty.",
  },
  {
    title: "Relapse Pass",
    cost: 300,
    category: "DISCIPLINE",
    icon: "Zap",
    description: "Controlled forgiveness release protocol without long-term streak demotion.",
  },
  {
    title: "Sleep Pass",
    cost: 100,
    category: "LEISURE",
    icon: "Moon",
    description: "Guilt-free +1.5 hour extra sleep-in or deep restorative rest day.",
  },
];

/**
 * Seed default reward store items if none exist
 */
export async function ensureDefaultRewardItems(userId: string) {
  // Archive or remove legacy store items not in the 3 default perks
  const validTitles = new Set(DEFAULT_STORE_PERKS.map((p) => p.title.toLowerCase().trim()));
  
  const existing = await prisma.rewardItem.findMany({ where: { userId, isArchived: false } });
  for (const item of existing) {
    if (!validTitles.has(item.title.toLowerCase().trim())) {
      await prisma.rewardItem.update({
        where: { id: item.id },
        data: { isArchived: true },
      });
    }
  }

  const refreshed = await prisma.rewardItem.findMany({ where: { userId, isArchived: false } });
  const existingTitles = new Set(refreshed.map((i) => i.title.toLowerCase().trim()));

  const toCreate: any[] = [];
  for (const perk of DEFAULT_STORE_PERKS) {
    if (!existingTitles.has(perk.title.toLowerCase().trim())) {
      toCreate.push({
        userId,
        title: perk.title,
        cost: perk.cost,
        category: perk.category,
        icon: perk.icon,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.rewardItem.createMany({ data: toCreate });
  }
}

/**
 * Undo recent reward deduction or redemption action
 */
export async function undoRecentRewardAction(userId: string, logId: string) {
  const log = await prisma.rewardLog.findUnique({
    where: { id: logId, userId },
  });

  if (!log) {
    throw new Error("Reward log entry not found or unauthorized");
  }

  // If it was a store redemption, decrement redemption counter
  if (log.type === "REWARD_REDEMPTION" && log.referenceId) {
    await prisma.rewardItem.updateMany({
      where: { id: log.referenceId, userId },
      data: { timesRedeemed: { decrement: 1 } },
    });
  }

  // Delete the log entry
  await prisma.rewardLog.delete({
    where: { id: log.id },
  });

  return {
    success: true,
    restoredPoints: Math.abs(log.points),
    type: log.type,
    title: log.title,
  };
}

/**
 * Get comprehensive discipline & rewards overview (Ultra-fast parallel queries)
 */
export async function getDisciplineSummary(userId: string, includeItems = true) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const daysLeftInMonth = Math.max(0, differenceInDays(currentMonthEnd, now));
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const queries: Promise<any>[] = [
    getOrCreateDisciplineStreaks(userId),
    // Net spendable karma balance (earned minus redeemed)
    prisma.rewardLog.aggregate({
      where: { userId },
      _sum: { points: true },
    }),
    // Lifetime Karma XP (earned minus actual discipline infractions only - NEVER decreased by perk purchases)
    prisma.rewardLog.aggregate({
      where: {
        userId,
        type: { not: "REWARD_REDEMPTION" },
      },
      _sum: { points: true },
    }),
    prisma.rewardLog.aggregate({
      where: {
        userId,
        createdAt: { gte: currentMonthStart },
      },
      _sum: { points: true },
    }),
    prisma.rewardLog.findMany({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    }),
    prisma.rewardLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ];

  if (includeItems) {
    queries.push(
      prisma.rewardItem.findMany({
        where: { userId, isArchived: false },
        orderBy: { cost: "asc" },
      })
    );
  }

  const [streaks, lifetimeAgg, lifetimeKarmaAgg, monthAgg, todayLogs, recentLogs, rewardItems] =
    await Promise.all(queries);

  const netBalance = lifetimeAgg._sum.points || 0;
  const lifetimeKarmaXP = lifetimeKarmaAgg._sum.points || 0;
  const monthlyXP = monthAgg._sum.points || 0;

  const todayEarned = todayLogs
    .filter((l: any) => l.points > 0)
    .reduce((sum: number, l: any) => sum + l.points, 0);

  const todayDeducted = Math.abs(
    todayLogs.filter((l: any) => l.points < 0).reduce((sum: number, l: any) => sum + l.points, 0)
  );

  // Character level and Pet evolution derive from genuine Karma XP (spending coins does NOT demote level or kill pet)
  const levelInfo = calculateLevel(lifetimeKarmaXP);

  const purityStreak = streaks.find((s: any) => s.type === "PURITY_NOFAP") || {
    currentStreak: 0,
    bestStreak: 0,
  };

  const dietStreak = streaks.find((s: any) => s.type === "CLEAN_DIET") || {
    currentStreak: 0,
    bestStreak: 0,
  };

  const sleepStreak = streaks.find((s: any) => s.type === "SLEEP_SCHEDULE") || {
    currentStreak: 0,
    bestStreak: 0,
  };

  const todayStr = format(now, "yyyy-MM-dd");
  const hasPurityCheckedIn = todayLogs.some(
    (l: any) =>
      l.type === "CHECKIN_PURITY" ||
      l.type === "REWARD_DAILY_CHECKIN" ||
      l.referenceId === `purity_${todayStr}`
  );
  const hasDietCheckedIn = todayLogs.some(
    (l: any) =>
      l.type === "CHECKIN_DIET" ||
      l.type === "REWARD_DAILY_CHECKIN" ||
      l.referenceId === `diet_${todayStr}`
  );

  return {
    totalXP: Math.max(0, netBalance),
    spendableCoins: Math.max(0, netBalance),
    lifetimeXP: lifetimeKarmaXP,
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
      sleep: sleepStreak,
    },
    todayCheckins: {
      purity: hasPurityCheckedIn,
      diet: hasDietCheckedIn,
    },
    recentLogs,
    rewardItems: rewardItems || [],
  };
}
