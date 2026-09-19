import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { awardPoints } from "@/lib/rewards";
import { addDays, addMonths, format, parseISO } from "date-fns";

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

    const existingTask = await prisma.task.findUnique({
      where: { id, userId: user.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isMarkingComplete = body.status === "DONE" && existingTask.status !== "DONE";
    const isUnmarkingComplete = body.status === "TODO" && existingTask.status === "DONE";

    const updateData: any = { ...body };
    if ("remindAt" in body) {
      updateData.remindAt = body.remindAt ? new Date(body.remindAt) : null;
    }
    if (isMarkingComplete) {
      updateData.completedAt = new Date();
    } else if (isUnmarkingComplete) {
      updateData.completedAt = null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Reward XP on task completion
    if (isMarkingComplete) {
      const priorityXP =
        existingTask.priority === "HIGH" ? 50 : existingTask.priority === "MEDIUM" ? 35 : 20;

      await awardPoints({
        userId: user.id,
        points: priorityXP,
        type: "TASK_COMPLETED",
        title: `Completed Task: ${existingTask.title}`,
        reason: `${existingTask.priority} priority task completed`,
        category: "PRODUCTIVITY",
        referenceId: existingTask.id,
      });
    } else if (isUnmarkingComplete) {
      // Clean up previous reward log if unmarking task
      await prisma.rewardLog.deleteMany({
        where: {
          userId: user.id,
          referenceId: existingTask.id,
          type: "TASK_COMPLETED",
        },
      });
    }


    // Handle Smart Recurrence: Generate next instance if marked complete and recurring
    if (isMarkingComplete && existingTask.recurrence && existingTask.recurrence !== "NONE") {
      let baseDate = existingTask.dueDate ? parseISO(existingTask.dueDate) : new Date();
      let nextDate: Date;

      if (existingTask.recurrence === "DAILY") {
        nextDate = addDays(baseDate, 1);
      } else if (existingTask.recurrence === "WEEKDAYS") {
        const day = baseDate.getDay();
        nextDate = day === 5 ? addDays(baseDate, 3) : day === 6 ? addDays(baseDate, 2) : addDays(baseDate, 1);
      } else if (existingTask.recurrence === "WEEKLY") {
        nextDate = addDays(baseDate, 7);
      } else if (existingTask.recurrence === "MONTHLY") {
        nextDate = addMonths(baseDate, 1);
      } else {
        nextDate = addDays(baseDate, 1);
      }

      await prisma.task.create({
        data: {
          userId: user.id,
          title: existingTask.title,
          description: existingTask.description,
          priority: existingTask.priority,
          status: "TODO",
          dueDate: format(nextDate, "yyyy-MM-dd"),
          dueTime: existingTask.dueTime,
          recurrence: existingTask.recurrence,
          category: existingTask.category,
          notes: existingTask.notes,
        },
      });
    }

    return NextResponse.json({ task: updatedTask });
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

    await prisma.task.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
