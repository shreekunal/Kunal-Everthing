import assert from "assert";
import { calculateRoutineStreak } from "../lib/utils";
import { calculateLevel } from "../lib/rewards";

console.log("=== Running Streak Grace Day Test Suite (Direct Codebase Import) ===");

const TODAY = "2026-11-07";

// Test 1: Consecutively completed days (no miss)
{
  const dates = ["2026-11-07", "2026-11-06", "2026-11-05", "2026-11-04"];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 4);
  assert.strictEqual(res.bestStreak, 4);
  assert.strictEqual(res.graceUsed, false);
  assert.strictEqual(res.graceDate, null);
  console.log("✔ Test 1: Normal consecutive streak (no miss) passes.");
}

// Test 2: Edge Case 1 - Miss 1 day (yesterday missed, 2 days ago completed)
{
  const dates = ["2026-11-05", "2026-11-04", "2026-11-03"];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 3, "Streak should continue using grace for yesterday");
  assert.strictEqual(res.graceUsed, true, "graceUsed should be true");
  assert.strictEqual(res.graceDate, "2026-11-06", "graceDate should be yesterday");
  console.log("✔ Test 2: Miss 1 day (yesterday missed) with grace preservation passes.");
}

// Test 3: Edge Case 1b - Miss 1 day inside streak (e.g. Nov 5 missed)
{
  const dates = ["2026-11-07", "2026-11-06", /* 11-05 missed */ "2026-11-04", "2026-11-03", "2026-11-02"];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 5, "Streak should be 5 (Nov 7, 6, 4, 3, 2)");
  assert.strictEqual(res.graceUsed, true);
  assert.strictEqual(res.graceDate, "2026-11-05");
  console.log("✔ Test 3: Miss 1 day inside streak preserved by grace passes.");
}

// Test 4: Edge Case 2 - Miss 2 days in a row (yesterday and 2 days ago missed)
{
  const dates = ["2026-11-04", "2026-11-03", "2026-11-02"];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 0, "Streak should reset to 0 when 2 consecutive days are missed");
  assert.strictEqual(res.graceUsed, false);
  console.log("✔ Test 4: Miss 2 days in a row resets currentStreak to 0 passes.");
}

// Test 5: Edge Case 2b - Miss 2 days in a row inside streak
{
  const dates = ["2026-11-07", "2026-11-06", /* 11-05 missed */ /* 11-04 missed */ "2026-11-03", "2026-11-02"];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 2, "Streak breaks at the double miss, counting only Nov 7 and 6");
  assert.strictEqual(res.graceUsed, false, "Grace cannot bridge two missed days");
  console.log("✔ Test 5: Double miss inside streak breaks streak cleanly passes.");
}

// Test 6: Edge Case 3 - Grace already used this week (rolling 7 days)
{
  const dates = [
    "2026-11-07",
    "2026-11-06",
    /* 2026-11-05 missed (Grace 1) */
    "2026-11-04",
    "2026-11-03",
    /* 2026-11-02 missed (CANNOT use grace within 7 days) */
    "2026-11-01",
    "2026-10-31"
  ];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 4, "Current streak should be 4; second miss within 7 days breaks streak");
  assert.strictEqual(res.graceUsed, true);
  assert.strictEqual(res.graceDate, "2026-11-05");
  console.log("✔ Test 6: Grace already used this week prevents second grace within 7 days passes.");
}

// Test 7: Historical bestStreak is never rewritten lower
{
  const dates = [
    "2026-11-07", "2026-11-06", "2026-11-05",
    // Gap
    "2026-10-15", "2026-10-14", "2026-10-13", "2026-10-12", "2026-10-11",
    "2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06",
    "2026-10-05", "2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"
  ];
  const res = calculateRoutineStreak(dates, TODAY);
  assert.strictEqual(res.currentStreak, 3);
  assert.strictEqual(res.bestStreak, 15, "Historical best streak must remain 15");
  console.log("✔ Test 7: Best streak history preservation passes.");
}

// Test 8: Pet and Level evaluation directly from lib/rewards.ts
{
  const deadPet = calculateLevel(500, { isStreakBroken: true });
  assert.strictEqual(deadPet.isPetDead, true);
  assert.strictEqual(deadPet.level, 0);
  assert.strictEqual(deadPet.title, "Mourning Spirit 💀");

  const livePet = calculateLevel(500, { isStreakBroken: false });
  assert.strictEqual(livePet.isPetDead, false);
  assert.strictEqual(livePet.level > 0, true);
  console.log("✔ Test 8: calculateLevel from lib/rewards.ts passes.");
}

console.log("\nALL STREAK GRACE TESTS PASSED AGAINST ACTUAL SOURCE CODE! 🌟\n");
