import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");

    const where: any = {};
    if (kind && kind !== "ALL") {
      where.kind = kind;
    }

    const lists = await prisma.sharedList.findMany({
      where,
      include: {
        items: {
          orderBy: [{ done: "asc" }, { createdAt: "desc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ lists, currentUser: user.name || "Kunal" });
  } catch (error: any) {
    console.error("GET /api/lists error:", error);
    return NextResponse.json({ error: error.message || "Failed to load lists" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, kind = "CUSTOM" } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "List title is required" }, { status: 400 });
    }

    const list = await prisma.sharedList.create({
      data: {
        title: String(title).trim(),
        kind: String(kind).toUpperCase(),
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ list });
  } catch (error: any) {
    console.error("POST /api/lists error:", error);
    return NextResponse.json({ error: error.message || "Failed to create list" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, kind } = body;

    if (!id) {
      return NextResponse.json({ error: "List ID is required" }, { status: 400 });
    }

    const data: any = {};
    if (title !== undefined) data.title = String(title).trim();
    if (kind !== undefined) data.kind = String(kind).toUpperCase();

    const list = await prisma.sharedList.update({
      where: { id },
      data,
      include: { items: true },
    });

    return NextResponse.json({ list });
  } catch (error: any) {
    console.error("PATCH /api/lists error:", error);
    return NextResponse.json({ error: error.message || "Failed to update list" }, { status: 500 });
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
      return NextResponse.json({ error: "List ID is required" }, { status: 400 });
    }

    await prisma.sharedList.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/lists error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete list" }, { status: 500 });
  }
}
