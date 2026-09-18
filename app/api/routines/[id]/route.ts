import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format, subDays } from "date-fns";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const { id } = params;
    const body = await request.json();
    const targetDate = body.date || format(new Date(), "yyyy-MM-dd");

    const routine = await prisma.routine.findUnique({
      where: { id, userId: user.id },
    });

    if (!routine) {
      return NextResponse.json({ error: "Routine not found" }, { status: 404 });
    }

    // Toggle or set completion
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

    // Recalculate streak backwards from today
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDateStr = format(subDays(today, i), "yyyy-MM-dd");
      const comp = await prisma.routineCompletion.findUnique({
        where: {
          routineId_date: {
            routineId: id,
            date: checkDateStr,
          },
        },
      });

      if (comp && comp.completed) {
        currentStreak++;
      } else if (i === 0) {
        // Today is not completed yet, check if yesterday was
        continue;
      } else {
        break;
      }
    }

    const newBestStreak = Math.max(routine.bestStreak, currentStreak);

    const updated = await prisma.routine.update({
      where: { id },
      data: {
        currentStreak,
        bestStreak: newBestStreak,
      },
    });

    return NextResponse.json({
      routine: updated,
      completedToday: isCompletedNow,
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
    const { id } = params;

    await prisma.routine.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
