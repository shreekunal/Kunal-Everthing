import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const dates = await prisma.importantDate.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ dates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { name, date, category, repeatPattern, reminderDaysBefore, notes } = body;

    if (!name || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    const importantDate = await prisma.importantDate.create({
      data: {
        userId: user.id,
        name,
        date,
        category: category || "CUSTOM",
        repeatPattern: repeatPattern || "YEARLY",
        reminderDaysBefore: reminderDaysBefore || "14,7,1,0",
        notes: notes || null,
      },
    });

    return NextResponse.json({ date: importantDate }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
