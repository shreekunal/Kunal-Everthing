import { NextResponse } from "next/server";
import { getCurrentUser, ensureDualProfiles } from "@/lib/auth";

export const dynamic = "force-dynamic";

// In-process shared memory cache for live focus broadcasts
interface FocusBroadcast {
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

const broadcastMap = new Map<string, FocusBroadcast>();

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kunal, mradul } = await ensureDualProfiles();
    const isCurrentKunal = user.email === kunal.email || user.id === kunal.id;
    const partnerUser = isCurrentKunal ? mradul : kunal;

    const partnerBroadcast = broadcastMap.get(partnerUser.id) || null;
    const myBroadcast = broadcastMap.get(user.id) || null;

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

    const entry: FocusBroadcast = {
      userId: user.id,
      userName: user.name || "Kunal",
      project: String(project).trim(),
      topicTitle: topicTitle ? String(topicTitle).trim() : null,
      status,
      mode,
      remainingSeconds: Number(remainingSeconds) || 0,
      totalSeconds: Number(totalSeconds) || 1500,
      updatedAt: Date.now(),
    };

    broadcastMap.set(user.id, entry);

    return NextResponse.json({ success: true, broadcast: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
