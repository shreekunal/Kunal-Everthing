import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { title, cost, category, icon } = body;

    if (!title || !cost || isNaN(Number(cost))) {
      return NextResponse.json(
        { error: "Title and a numeric XP Cost are required" },
        { status: 400 }
      );
    }

    const item = await prisma.rewardItem.create({
      data: {
        userId: user.id,
        title,
        cost: Math.abs(Number(cost)),
        category: category || "LEISURE",
        icon: icon || "Gift",
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await prisma.rewardItem.updateMany({
      where: { id, userId: user.id },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
