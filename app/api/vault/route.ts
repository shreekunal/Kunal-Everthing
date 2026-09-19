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
    const type = searchParams.get("type"); // PASSWORD, CARD, NOTE, API_KEY, RECOVERY

    let whereClause: any = { userId: user.id };
    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    const items = await prisma.vaultItem.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        title: true,
        category: true,
        iv: true,
        ciphertext: true,
        salt: true,
        lastCopiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ items });
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

    const { type, title, category, iv, ciphertext, salt } = body;

    if (!title || !ciphertext || !iv || !salt) {
      return NextResponse.json(
        { error: "Encrypted payload (title, iv, ciphertext, salt) is required" },
        { status: 400 }
      );
    }

    const vaultItem = await prisma.vaultItem.create({
      data: {
        userId: user.id,
        type: type || "PASSWORD",
        title,
        category: category || "General",
        iv,
        ciphertext,
        salt,
      },
    });

    return NextResponse.json({ item: vaultItem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
