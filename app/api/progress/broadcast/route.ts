import { NextResponse } from "next/server";
import { getCurrentUser, ensureDualProfiles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface FocusBroadcastResponse {
  userId: string;
  userName: string;
  project: string;
  topicTitle: string | null;
  status: "RUNNING" | "PAUSED" | "COMPLETED" | "IDLE";
  mode: "TIMER" | "STOPWATCH";
  remainingSeconds: number;
  totalSeconds: number;
  updatedAt: number;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kunal, mradul } = await ensureDualProfiles();
    const isCurrentKunal = user.email === kunal.email || user.id === kunal.id;
    const partnerUser = isCurrentKunal ? mradul : kunal;

    const [partnerRecord, myRecord] = await Promise.all([
      prisma.focusBroadcast.findUnique({
        where: { userId: partnerUser.id },
      }),
      prisma.focusBroadcast.findUnique({
        where: { userId: user.id },
      }),
    ]);

    const partnerBroadcast: FocusBroadcastResponse | null = partnerRecord
      ? {
          userId: partnerRecord.userId,
          userName: partnerUser.name || (isCurrentKunal ? "Mradul" : "Kunal"),
          project: partnerRecord.project,
          topicTitle: partnerRecord.topicTitle,
          status: partnerRecord.status as FocusBroadcastResponse["status"],
          mode: partnerRecord.mode as FocusBroadcastResponse["mode"],
          remainingSeconds: partnerRecord.remainingSeconds,
          totalSeconds: partnerRecord.totalSeconds,
          updatedAt: partnerRecord.updatedAt.getTime(),
        }
      : null;

    const myBroadcast: FocusBroadcastResponse | null = myRecord
      ? {
          userId: myRecord.userId,
          userName: user.name || (isCurrentKunal ? "Kunal" : "Mradul"),
          project: myRecord.project,
          topicTitle: myRecord.topicTitle,
          status: myRecord.status as FocusBroadcastResponse["status"],
          mode: myRecord.mode as FocusBroadcastResponse["mode"],
          remainingSeconds: myRecord.remainingSeconds,
          totalSeconds: myRecord.totalSeconds,
          updatedAt: myRecord.updatedAt.getTime(),
        }
      : null;

    // Filter out stale broadcasts older than 3 hours
    const now = Date.now();
    const isPartnerActive =
      partnerBroadcast &&
      partnerBroadcast.status !== "IDLE" &&
      now - partnerBroadcast.updatedAt < 3 * 60 * 60 * 1000;

    return NextResponse.json({
      partnerName: partnerUser.name || (isCurrentKunal ? "Mradul" : "Kunal"),
      partnerBroadcast: isPartnerActive ? partnerBroadcast : null,
      myBroadcast,
    });
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
      status = "IDLE",
      project = "Study Focus",
      topicTitle = null,
      mode = "TIMER",
      remainingSeconds = 0,
      totalSeconds = 1500,
    } = body;

    const projectStr = String(project).trim();
    const topicTitleStr = topicTitle ? String(topicTitle).trim() : null;
    const remaining = Number(remainingSeconds) || 0;
    const total = Number(totalSeconds) || 1500;

    const record = await prisma.focusBroadcast.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        project: projectStr,
        topicTitle: topicTitleStr,
        status,
        mode,
        remainingSeconds: remaining,
        totalSeconds: total,
      },
      update: {
        project: projectStr,
        topicTitle: topicTitleStr,
        status,
        mode,
        remainingSeconds: remaining,
        totalSeconds: total,
      },
    });

    const entry: FocusBroadcastResponse = {
      userId: user.id,
      userName: user.name || "User",
      project: record.project,
      topicTitle: record.topicTitle,
      status: record.status as FocusBroadcastResponse["status"],
      mode: record.mode as FocusBroadcastResponse["mode"],
      remainingSeconds: record.remainingSeconds,
      totalSeconds: record.totalSeconds,
      updatedAt: record.updatedAt.getTime(),
    };

    return NextResponse.json({ success: true, broadcast: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
