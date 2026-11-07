import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listId, text, id } = body;

    if (!listId || !text || !String(text).trim()) {
      return NextResponse.json({ error: "listId and text are required" }, { status: 400 });
    }

    const userName = user.name || "Kunal";

    const item = await prisma.sharedListItem.create({
      data: {
        id: id || undefined,
        listId,
        text: String(text).trim(),
        addedBy: userName,
      },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("POST /api/lists/items error:", error);
    return NextResponse.json({ error: error.message || "Failed to add list item" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, done, text } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const userName = user.name || "Kunal";
    const data: any = {};
    if (text !== undefined) data.text = String(text).trim();
    if (typeof done === "boolean") {
      data.done = done;
      data.doneBy = done ? userName : null;
    }

    const item = await prisma.sharedListItem.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("PATCH /api/lists/items error:", error);
    return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await prisma.sharedListItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/lists/items error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 500 });
  }
}
