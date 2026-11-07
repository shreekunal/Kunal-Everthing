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
export function calculateLevel(
  totalXP: number,
  options?: { isStreakBroken?: boolean }
): {
  level: number;
  title: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  isPetDead: boolean;
} {
  const isPetDead = totalXP < 0 || Boolean(options?.isStreakBroken);
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

  // Helper to directly reset streak to 0 on explicit penalty/relapse
  const resetInfractionStreak = async (
    streakType: string,
    streakName: string,
    infractionTitle: string,
    resetMessage: string
  ) => {
    await prisma.disciplineStreak.upsert({
      where: { userId_type: { userId, type: streakType } },
      create: {
        userId,
        type: streakType,
        name: streakName,
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
        title: infractionTitle,
        message: resetMessage,
        category: "SYSTEM",
        priority: "URGENT",
      },
    });
  };

  // If Unhealthy Food penalty -> reset CLEAN_DIET streak (active violation, not a missed day)
  if (type === "PENALTY_UNHEALTHY_FOOD") {
    await resetInfractionStreak(
      "CLEAN_DIET",
      "Clean Diet & Nutrition",
      "Discipline Infraction: Junk / Unhealthy Food",
      `${Math.abs(points)} XP deducted. Clean Diet streak reset. Regain your focus!`
    );
  }

  // If Relapse penalty -> strictly reset PURITY_NOFAP streak to 0 (no grace on active relapse)
  if (type === "PENALTY_FAP" || type === "PENALTY_RELAPSE") {
    await resetInfractionStreak(
      "PURITY_NOFAP",
      "Monk Purity & Focus",
      "Monk Protocol Breach: Relapse Logged",
      `${Math.abs(points)} XP deducted. Purity streak reset to Day 0. Deep breath — restart right now!`
    );
  }

  // If Sleep penalty -> reset SLEEP_SCHEDULE streak
  if (type === "PENALTY_SLEEP") {
    await resetInfractionStreak(
      "SLEEP_SCHEDULE",
      "Sleep & Recovery Protocol",
      "Discipline Infraction: Sleep Protocol Broken",
      `${Math.abs(points)} XP deducted. Sleep Schedule streak reset. Prioritize restorative rest!`
    );
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
          lastResetDate: subDays(now, 1),
        },
      });
    } else {
      const resetDate = streak.lastResetDate || streak.createdAt;
      const daysSinceReset = Math.max(0, differenceInDays(now, resetDate));
      // Active streak without an explicit penalty today starts at least at 1
      const current = streak.currentStreak === 0 && daysSinceReset === 0 ? 0 : Math.max(1, daysSinceReset);
      const updatedBest = Math.max(streak.bestStreak, current);
      const isGraceActive = Boolean(
        streak.graceUsedAt && differenceInDays(now, streak.graceUsedAt) < 7
      );

      streak = {
        ...streak,
        currentStreak: current,
        bestStreak: updatedBest,
        graceUsed: isGraceActive,
      } as any;
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
  const todayStr = format(now, "yyyy-MM-dd");

  const queries: Promise<any>[] = [
    getOrCreateDisciplineStreaks(userId),
    // Consolidated ultra-fast SQL aggregation in a single query with check-in evaluation
    prisma.$queryRaw<Array<{
      net_balance: number;
      lifetime_karma: number;
      monthly_xp: number;
      today_earned: number;
      today_deducted: number;
      has_purity_checked_in: boolean | null;
      has_diet_checked_in: boolean | null;
    }>>`
      SELECT 
        COALESCE(SUM(points), 0)::int as net_balance,
        COALESCE(SUM(CASE WHEN type != 'REWARD_REDEMPTION' THEN points ELSE 0 END), 0)::int as lifetime_karma,
        COALESCE(SUM(CASE WHEN "createdAt" >= ${currentMonthStart} THEN points ELSE 0 END), 0)::int as monthly_xp,
        COALESCE(SUM(CASE WHEN "createdAt" >= ${todayStart} AND points > 0 THEN points ELSE 0 END), 0)::int as today_earned,
        COALESCE(SUM(CASE WHEN "createdAt" >= ${todayStart} AND points < 0 THEN ABS(points) ELSE 0 END), 0)::int as today_deducted,
        BOOL_OR("createdAt" >= ${todayStart} AND (type = 'CHECKIN_PURITY' OR type = 'REWARD_DAILY_CHECKIN' OR "referenceId" = ${`purity_${todayStr}`})) as has_purity_checked_in,
        BOOL_OR("createdAt" >= ${todayStart} AND (type = 'CHECKIN_DIET' OR type = 'REWARD_DAILY_CHECKIN' OR "referenceId" = ${`diet_${todayStr}`})) as has_diet_checked_in
      FROM "RewardLog"
      WHERE "userId" = ${userId}
    `,
  ];

  if (includeItems) {
    queries.push(
      prisma.rewardLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.rewardItem.findMany({
        where: { userId, isArchived: false },
        orderBy: { cost: "asc" },
      })
    );
  }

  const results = await Promise.all(queries);
  const streaks = results[0];
  const rawAggList = results[1];
  const recentLogs = includeItems ? results[2] || [] : [];
  const rewardItems = includeItems ? results[3] || [] : [];

  const agg = rawAggList?.[0] || {
    net_balance: 0,
    lifetime_karma: 0,
    monthly_xp: 0,
    today_earned: 0,
    today_deducted: 0,
    has_purity_checked_in: false,
    has_diet_checked_in: false,
  };

  const netBalance = agg.net_balance || 0;
  const lifetimeKarmaXP = agg.lifetime_karma || 0;
  const monthlyXP = agg.monthly_xp || 0;
  const todayEarned = agg.today_earned || 0;
  const todayDeducted = agg.today_deducted || 0;

  const purityStreak = streaks.find((s: any) => s.type === "PURITY_NOFAP") || {
    currentStreak: 0,
    bestStreak: 0,
    graceUsed: false,
  };

  const dietStreak = streaks.find((s: any) => s.type === "CLEAN_DIET") || {
    currentStreak: 0,
    bestStreak: 0,
    graceUsed: false,
  };

  const sleepStreak = streaks.find((s: any) => s.type === "SLEEP_SCHEDULE") || {
    currentStreak: 0,
    bestStreak: 0,
    graceUsed: false,
  };

  const hasPurityCheckedIn = Boolean(agg.has_purity_checked_in);
  const hasDietCheckedIn = Boolean(agg.has_diet_checked_in);

  // Rule: On breaking purity or diet streak (streak at 0 without checkin today), the pet dies
  const isStreakBroken =
    ((purityStreak.currentStreak || 0) === 0 && !hasPurityCheckedIn) ||
    ((dietStreak.currentStreak || 0) === 0 && !hasDietCheckedIn);

  // Character level and Pet evolution derive from genuine Karma XP and intact discipline streaks
  const levelInfo = calculateLevel(lifetimeKarmaXP, { isStreakBroken });

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
