import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWidgetBearer } from "@/lib/widgetAuth";
import { awardPoints } from "@/lib/rewards";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

/**
 * POST /api/widget/action
 * Executes an allow-listed, secure 1-tap widget action.
 * Supported:
 *   - LOG_WATER: logs +250ml (+1 glass), idempotent per requestId
 *   - COMPLETE_TASK: marks a task as DONE and awards appropriate XP
 */
export async function POST(request: Request) {
  const auth = await verifyWidgetBearer(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user } = auth.data;

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, requestId, taskId } = body;

  if (!action || typeof action !== "string") {
    return NextResponse.json({ error: "Missing required 'action' field" }, { status: 400 });
  }

  // 1. ACTION: LOG_WATER
  if (action === "LOG_WATER") {
    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { error: "LOG_WATER requires an idempotent 'requestId' string" },
        { status: 400 }
      );
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const referenceId = `water_count_${todayStr}`;

    try {
      const existing = await prisma.rewardLog.findFirst({
        where: {
          userId: user.id,
          referenceId,
        },
      });

      let currentGlasses = 0;
      let targetGlasses = 8;
      let processedRequestIds: string[] = [];

      if (existing?.reason) {
        try {
          const parsed = JSON.parse(existing.reason);
          if (typeof parsed.count === "number") currentGlasses = parsed.count;
          if (typeof parsed.target === "number") targetGlasses = parsed.target;
          if (Array.isArray(parsed.processedRequestIds)) {
            processedRequestIds = parsed.processedRequestIds;
          }
        } catch {
          currentGlasses = existing.points || 0;
        }
      }

      // Idempotency check: if already processed, return immediately without duplicate increment
      if (processedRequestIds.includes(requestId)) {
        return NextResponse.json({
          success: true,
          idempotent: true,
          count: currentGlasses,
          target: targetGlasses,
          ml: currentGlasses * 250,
          targetMl: targetGlasses * 250,
        });
      }

      // Increment by 1 glass (+250 ml)
      const newCount = currentGlasses + 1;
      const updatedIds = [...processedRequestIds.slice(-25), requestId];

      const reasonJson = JSON.stringify({
        count: newCount,
        target: targetGlasses,
        processedRequestIds: updatedIds,
      });

      if (existing) {
        await prisma.rewardLog.update({
          where: { id: existing.id },
          data: {
            title: `Hydration: ${newCount}/${targetGlasses} glasses`,
            reason: reasonJson,
          },
        });
      } else {
        await prisma.rewardLog.create({
          data: {
            userId: user.id,
            points: 0,
            type: "WATER_LOG",
            title: `Hydration: ${newCount}/${targetGlasses} glasses`,
            reason: reasonJson,
            category: "HEALTH",
            referenceId,
          },
        });
      }

      return NextResponse.json({
        success: true,
        action: "LOG_WATER",
        count: newCount,
        target: targetGlasses,
        ml: newCount * 250,
        targetMl: targetGlasses * 250,
      });
    } catch (err: any) {
      console.error("Widget LOG_WATER error:", err);
      return NextResponse.json({ error: err.message || "Failed to log water" }, { status: 500 });
    }
  }

  // 2. ACTION: COMPLETE_TASK
  if (action === "COMPLETE_TASK") {
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json(
        { error: "COMPLETE_TASK requires a valid 'taskId' string" },
        { status: 400 }
      );
    }

    try {
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId, userId: user.id },
      });

      if (!existingTask) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      if (existingTask.status === "DONE") {
        return NextResponse.json({
          success: true,
          alreadyDone: true,
          task: { id: existingTask.id, title: existingTask.title, status: "DONE" },
        });
      }

      // Mark complete
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "DONE",
          completedAt: new Date(),
        },
      });

      // Award XP mirroring app/api/tasks/[id]/route.ts
      const priorityXP =
        existingTask.priority === "HIGH" ? 10 : existingTask.priority === "MEDIUM" ? 5 : 2;

      await awardPoints({
        userId: user.id,
        points: priorityXP,
        type: "TASK_COMPLETED",
        title: `Completed Task: ${existingTask.title}`,
        reason: `${existingTask.priority} priority task completed via Widget`,
        category: "PRODUCTIVITY",
        referenceId: existingTask.id,
      });

      return NextResponse.json({
        success: true,
        action: "COMPLETE_TASK",
        task: {
          id: updated.id,
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
        },
      });
    } catch (err: any) {
      console.error("Widget COMPLETE_TASK error:", err);
      return NextResponse.json({ error: err.message || "Failed to complete task" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: `Unsupported widget action: '${action}'. Allowed: LOG_WATER, COMPLETE_TASK` },
    { status: 400 }
  );
}
