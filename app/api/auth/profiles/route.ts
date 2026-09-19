import { NextResponse } from "next/server";
import { getAvailableProfiles } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = await getAvailableProfiles();
    return NextResponse.json({ profiles });
  } catch (error: any) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Failed to load profiles" },
      { status: 500 }
    );
  }
}
