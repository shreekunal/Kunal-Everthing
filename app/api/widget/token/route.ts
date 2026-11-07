import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWidgetToken } from "@/lib/widgetAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/widget/token
 * Returns the status of the current user's widget token (without revealing secrets).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeToken = await prisma.widgetToken.findFirst({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({
      hasActiveToken: Boolean(activeToken),
      token: activeToken || null,
    });
  } catch (error: any) {
    console.error("Widget token GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve widget token status" }, { status: 500 });
  }
}

/**
 * POST /api/widget/token
 * Generates a new scoped, revocable widget token.
 * Returns the raw token string EXACTLY ONCE to be stored in EncryptedSharedPreferences.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed
    }

    const label = body?.label ? String(body.label).trim().slice(0, 100) : "Android Home Screen Widget";

    // Revoke any prior active tokens for this user
    await prisma.widgetToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Generate fresh cryptographic token
    const { rawToken, tokenHash } = generateWidgetToken();

    const created = await prisma.widgetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        label,
      },
      select: {
        id: true,
        label: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      token: rawToken, // Provided once to the native client
      tokenRecord: created,
    });
  } catch (error: any) {
    console.error("Widget token POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate widget token" }, { status: 500 });
  }
}

/**
 * DELETE /api/widget/token
 * Revokes all active widget tokens for the current user.
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.widgetToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      revokedCount: result.count,
    });
  } catch (error: any) {
    console.error("Widget token DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to revoke widget tokens" }, { status: 500 });
  }
}
