import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { format, subDays } from "date-fns";

export async function GET(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date");
    const todayStr = requestedDate || format(new Date(), "yyyy-MM-dd");
    const sevenDaysAgoStr = format(subDays(new Date(), 6), "yyyy-MM-dd");
    const thirtyDaysAgoStr = format(subDays(new Date(), 29), "yyyy-MM-dd");

    // Execute all database queries concurrently in parallel with Promise.all
    const [
      settings,
      todayStepLog,
      stepLogs7Days,
      activeFast,
      fastHistory,
      latestWeight,
      weightLogs30Days,
    ] = await Promise.all([
      prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          heightCm: 175.0,
          targetWeightKg: 70.0,
          defaultStepGoal: 10000,
          fastingProtocol: "16:8",
          fastingNotifications: true,
        },
      }),
      prisma.dailyStepLog.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date: todayStr,
          },
        },
      }),
      prisma.dailyStepLog.findMany({
        where: {
          userId: user.id,
          date: { gte: sevenDaysAgoStr, lte: todayStr },
        },
        orderBy: { date: "asc" },
      }),
      prisma.fastingSession.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.fastingSession.findMany({
        where: {
          userId: user.id,
          status: { in: ["COMPLETED", "BROKEN"] },
        },
        orderBy: { startTime: "desc" },
        take: 10,
      }),
      prisma.weightLog.findFirst({
        where: { userId: user.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.weightLog.findMany({
        where: {
          userId: user.id,
          date: { gte: thirtyDaysAgoStr },
        },
        orderBy: { date: "asc" },
        take: 30,
      }),
    ]);

    // Build complete 7-day rolling window for steps chart
    const past7DaysKeys = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
    );
    const stepLogsMap = new Map(stepLogs7Days.map((l) => [l.date, l]));
    const complete7DayStepHistory = past7DaysKeys.map((dStr) => {
      const existing = stepLogsMap.get(dStr);
      if (existing) return existing;
      if (dStr === todayStr && todayStepLog) return todayStepLog;
      return {
        date: dStr,
        stepCount: 0,
        targetSteps: settings.defaultStepGoal ?? 10000,
        distanceKm: 0,
        calories: 0,
        syncSource: "MANUAL",
      };
    });

    return NextResponse.json({
      todayStr,
      settings: {
        heightCm: settings.heightCm ?? 175,
        targetWeightKg: settings.targetWeightKg ?? 70,
        defaultStepGoal: settings.defaultStepGoal ?? 10000,
        fastingProtocol: settings.fastingProtocol ?? "16:8",
        fastingNotifications: settings.fastingNotifications ?? true,
      },
      steps: {
        today: todayStepLog || {
          date: todayStr,
          stepCount: 0,
          targetSteps: settings.defaultStepGoal ?? 10000,
          distanceKm: 0,
          calories: 0,
          syncSource: "MANUAL",
        },
        history: complete7DayStepHistory,
      },
      fasting: {
        active: activeFast,
        history: fastHistory,
      },
      weight: {
        latest: latestWeight,
        history: weightLogs30Days,
      },
    });
  } catch (error) {
    console.error("Failed to fetch vitality telemetry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    // Fetch user settings for calculations
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    const heightM = ((settings?.heightCm || 175) / 100);
    const targetSteps = settings?.defaultStepGoal || 10000;

    // Fetch latest weight for calorie approximation
    const latestWeightRec = await prisma.weightLog.findFirst({
      where: { userId: user.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    const weightKg = latestWeightRec?.weightKg || settings?.targetWeightKg || 70;

    // --- ACTION: LOG_STEPS (Absolute set or sync) ---
    if (action === "LOG_STEPS") {
      const { stepCount, date = todayStr, syncSource = "MANUAL" } = body;
      const parsedSteps = Math.max(0, Math.round(Number(stepCount) || 0));
      const distanceKm = Number((parsedSteps * 0.00078).toFixed(2));
      const calories = Math.round(parsedSteps * (weightKg * 0.0005));

      const log = await prisma.dailyStepLog.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date,
          },
        },
        update: {
          stepCount: parsedSteps,
          distanceKm,
          calories,
          syncSource,
        },
        create: {
          userId: user.id,
          date,
          stepCount: parsedSteps,
          targetSteps,
          distanceKm,
          calories,
          syncSource,
        },
      });

      return NextResponse.json({ success: true, log });
    }

    // --- ACTION: INCREMENT_STEPS / ADD_STEPS (+500, +1000, etc.) ---
    if (action === "INCREMENT_STEPS" || action === "ADD_STEPS") {
      const { delta, stepsToAdd, steps, date = todayStr } = body;
      const rawDelta = delta ?? stepsToAdd ?? steps;
      const parsedDelta = Math.round(Number(rawDelta) || 0);

      const existing = await prisma.dailyStepLog.findUnique({
        where: {
          userId_date: {
            userId: user.id,
            date,
          },
        },
      });

      const currentSteps = existing?.stepCount || 0;
      const newSteps = Math.max(0, currentSteps + parsedDelta);
      const distanceKm = Number((newSteps * 0.00078).toFixed(2));
      const calories = Math.round(newSteps * (weightKg * 0.0005));

      const log = await prisma.dailyStepLog.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date,
          },
        },
        update: {
          stepCount: newSteps,
          distanceKm,
          calories,
          syncSource: "MANUAL",
        },
        create: {
          userId: user.id,
          date,
          stepCount: newSteps,
          targetSteps,
          distanceKm,
          calories,
          syncSource: "MANUAL",
        },
      });

      return NextResponse.json({ success: true, log, newSteps });
    }

    // --- ACTION: LOG_WEIGHT ---
    if (action === "LOG_WEIGHT") {
      const { weightKg: inputWeight, date = todayStr, notes } = body;
      const parsedWeight = parseFloat(inputWeight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        return NextResponse.json({ error: "Invalid weight value" }, { status: 400 });
      }

      const bmi = Number((parsedWeight / (heightM * heightM)).toFixed(1));

      const log = await prisma.weightLog.create({
        data: {
          userId: user.id,
          weightKg: parsedWeight,
          bmi,
          notes: notes?.trim() || null,
          date,
        },
      });

      return NextResponse.json({ success: true, log, bmi });
    }

    // --- ACTION: START_FAST ---
    if (action === "START_FAST") {
      const { protocol = "16:8", targetHours: customHours, startTime: customStartTime } = body;

      // Determine duration in hours
      let targetHours = 16.0;
      if (customHours && Number(customHours) > 0) {
        targetHours = Number(customHours);
      } else if (protocol.includes(":")) {
        const parts = protocol.split(":");
        targetHours = parseFloat(parts[0]) || 16.0;
      }

      const start = customStartTime ? new Date(customStartTime) : new Date();
      const targetEnd = new Date(start.getTime() + targetHours * 60 * 60 * 1000);

      // Cancel any ongoing active fasts before starting a new one
      await prisma.fastingSession.updateMany({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
        data: {
          status: "CANCELLED",
          endTime: new Date(),
        },
      });

      const session = await prisma.fastingSession.create({
        data: {
          userId: user.id,
          protocol,
          targetHours,
          startTime: start,
          targetEndTime: targetEnd,
          status: "ACTIVE",
        },
      });

      // Update preference in settings
      await prisma.userSettings.update({
        where: { userId: user.id },
        data: { fastingProtocol: protocol },
      });

      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in vitality POST:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // --- ACTION: END_FAST ---
    if (action === "END_FAST") {
      const { sessionId, feelingsRating, notes } = body;
      const now = new Date();

      const session = await prisma.fastingSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          status: "ACTIVE",
        },
      });

      if (!session) {
        return NextResponse.json({ error: "Active fast not found" }, { status: 404 });
      }

      const elapsedMs = now.getTime() - new Date(session.startTime).getTime();
      const targetMs = Number(session.targetHours) * 60 * 60 * 1000;
      const status = elapsedMs >= targetMs * 0.95 ? "COMPLETED" : "BROKEN";

      const updated = await prisma.fastingSession.update({
        where: { id: session.id },
        data: {
          status,
          endTime: now,
          feelingsRating: feelingsRating ? Number(feelingsRating) : null,
          notes: notes?.trim() || null,
        },
      });

      return NextResponse.json({ success: true, session: updated, status });
    }

    // --- ACTION: CANCEL_FAST ---
    if (action === "CANCEL_FAST") {
      const { sessionId } = body;
      const session = await prisma.fastingSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
          status: "ACTIVE",
        },
      });

      if (!session) {
        return NextResponse.json({ error: "Active fast not found" }, { status: 404 });
      }

      const updated = await prisma.fastingSession.update({
        where: { id: session.id },
        data: {
          status: "CANCELLED",
          endTime: new Date(),
        },
      });

      return NextResponse.json({ success: true, session: updated });
    }

    // --- ACTION: UPDATE_SETTINGS ---
    if (action === "UPDATE_SETTINGS") {
      const { heightCm, targetWeightKg, defaultStepGoal, fastingProtocol, fastingNotifications } = body;

      const dataToUpdate: any = {};
      if (heightCm !== undefined && Number(heightCm) > 0) dataToUpdate.heightCm = Number(heightCm);
      if (targetWeightKg !== undefined && Number(targetWeightKg) > 0) dataToUpdate.targetWeightKg = Number(targetWeightKg);
      if (defaultStepGoal !== undefined && Number(defaultStepGoal) > 0) dataToUpdate.defaultStepGoal = Number(defaultStepGoal);
      if (fastingProtocol) dataToUpdate.fastingProtocol = fastingProtocol;
      if (fastingNotifications !== undefined) dataToUpdate.fastingNotifications = Boolean(fastingNotifications);

      const settings = await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: dataToUpdate,
        create: {
          userId: user.id,
          ...dataToUpdate,
        },
      });

      return NextResponse.json({ success: true, settings });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in vitality PATCH:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "weight" | "step"
    const id = searchParams.get("id");

    if (!id || !type) {
      return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
    }

    if (type === "weight") {
      await prisma.weightLog.deleteMany({
        where: { id, userId: user.id },
      });
      return NextResponse.json({ success: true });
    }

    if (type === "step") {
      await prisma.dailyStepLog.deleteMany({
        where: { id, userId: user.id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid delete type" }, { status: 400 });
  } catch (error) {
    console.error("Error in vitality DELETE:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
