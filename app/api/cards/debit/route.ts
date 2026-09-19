import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debitCards = await prisma.debitCard.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ debitCards });
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

    const { name, cardNumber, expiryDate, cvv, network, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Card name is required" },
        { status: 400 }
      );
    }

    // Determine clean last4 from cardNumber
    const cleanDigits = cardNumber ? cardNumber.replace(/\D/g, "") : "";
    const computedLast4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : null;

    const debitCard = await prisma.debitCard.create({
      data: {
        userId: user.id,
        name: name.trim(),
        cardNumber: cardNumber ? cardNumber.trim() : null,
        last4: computedLast4,
        expiryDate: expiryDate ? expiryDate.trim() : null,
        cvv: cvv ? cvv.trim() : null,
        network: network || "VISA",
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({ debitCard }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
