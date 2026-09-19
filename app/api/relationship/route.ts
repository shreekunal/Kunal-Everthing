import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/presets";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const defaultContents = DEFAULT_MESSAGE_TEMPLATES.map((d) => d.content);
    const hasOutdatedTemplates = templates.some(
      (t) => t.isDefault && !defaultContents.includes(t.content)
    );

    // Auto-seed or update to only the 4 requested templates
    if (templates.length === 0 || hasOutdatedTemplates) {
      await prisma.messageTemplate.deleteMany({
        where: { userId: user.id, isDefault: true },
      });

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
        orderBy: { createdAt: "asc" },
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    if (body.action === "CREATE_TEMPLATE") {
      const { title, content, category } = body;
      if (!content) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
      }
      const template = await prisma.messageTemplate.create({
        data: {
          userId: user.id,
          title: title || "Custom Message",
          content,
          category: category || "CUSTOM",
          isDefault: false,
        },
      });
      return NextResponse.json({ template });
    }

    if (body.action === "DELETE_TEMPLATE") {
      const { templateId } = body;
      await prisma.messageTemplate.delete({
        where: { id: templateId, userId: user.id },
      });
      return NextResponse.json({ success: true });
    }

    const { name, nickname, birthday, anniversary, phone, callLink, preferredChannel, preferences, notes } = body;

    const partner = await prisma.partner.upsert({
      where: { userId: user.id },
      update: {
        name,
        nickname: nickname || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        phone: phone || null,
        callLink: callLink || null,
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
        callLink: callLink || null,
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
