import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/presets";

export async function GET() {
  try {
    const user = await getCurrentUser();

    // 1. Get partner profile
    let partner = await prisma.partner.findFirst({
      where: { userId: user.id },
      include: {
        scheduledMessages: {
          orderBy: { scheduledDate: "asc" },
        },
      },
    });

    // 2. Get message templates
    let templates = await prisma.messageTemplate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed default templates if none exist
    if (templates.length === 0) {
      for (const tmpl of DEFAULT_MESSAGE_TEMPLATES) {
        await prisma.messageTemplate.create({
          data: {
            userId: user.id,
            category: tmpl.category,
            title: tmpl.title,
            content: tmpl.content,
            isDefault: true,
          },
        });
      }
      templates = await prisma.messageTemplate.findMany({
        where: { userId: user.id },
      });
    }

    return NextResponse.json({ partner, templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const { name, nickname, birthday, anniversary, phone, preferredChannel, preferences, notes } = body;

    const partner = await prisma.partner.upsert({
      where: { userId: user.id },
      update: {
        name,
        nickname: nickname || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        phone: phone || null,
        preferredChannel: preferredChannel || "WHATSAPP",
        preferences: preferences || null,
        notes: notes || null,
      },
      create: {
        userId: user.id,
        name: name || "Partner",
        nickname: nickname || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        phone: phone || null,
        preferredChannel: preferredChannel || "WHATSAPP",
        preferences: preferences || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ partner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
