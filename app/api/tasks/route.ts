import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // all, today, overdue, completed

    let whereClause: any = { userId: user.id, isArchived: false };

    if (filter === "completed") {
      whereClause.status = "DONE";
    } else if (filter === "active") {
      whereClause.status = { not: "DONE" };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    const {
      title,
      description,
      priority,
      dueDate,
      dueTime,
      recurrence,
      category,
      notes,
      remindAt,
      reminderOffset,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        description: description || null,
        priority: priority || "MEDIUM",
        status: "TODO",
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        remindAt: remindAt ? new Date(remindAt) : null,
        reminderOffset: reminderOffset || "NONE",
        recurrence: recurrence || "NONE",
        category: category || "General",
        notes: notes || null,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
