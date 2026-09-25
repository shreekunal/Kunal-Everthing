import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getNextCardDueDate } from "@/lib/formatters";
import { encryptCardField, decryptCardField, migrateAndEncryptAllCards } from "@/lib/crypto/cardEncryption";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-migrate any legacy plaintext cards silently on first read
    migrateAndEncryptAllCards().catch((e) => console.warn("Background card encryption migration error:", e));

    const cards = await prisma.creditCard.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "desc" },
    });

    const cardsWithDueInfo = cards.map((c) => {
      const dueInfo = getNextCardDueDate(c.dueDate);
      const decNumber = decryptCardField(c.cardNumber);
      const cleanDigits = decNumber ? decNumber.replace(/\D/g, "") : "";
      const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "••••";

      return {
        id: c.id,
        name: c.name,
        bank: c.bank,
        network: c.network,
        last4,
        creditLimit: c.creditLimit,
        statementDate: c.statementDate,
        dueDate: c.dueDate,
        cardNumber: decNumber,
        expiryDate: decryptCardField(c.expiryDate),
        cvv: decryptCardField(c.cvv),
        notes: c.notes,
        daysRemaining: dueInfo.daysRemaining,
        dueDateLabel: dueInfo.label,
        formattedDueDate: dueInfo.date.toISOString(),
      };
    });

    return NextResponse.json({ cards: cardsWithDueInfo });
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
      name,
      bank,
      network,
      cardNumber,
      expiryDate,
      cvv,
      creditLimit,
      statementDate,
      dueDate,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Card name is required" },
        { status: 400 }
      );
    }

    const card = await prisma.creditCard.create({
      data: {
        userId: user.id,
        name: name.trim(),
        bank: bank ? bank.trim() : "",
        network: network || "VISA",
        cardNumber: encryptCardField(cardNumber),
        expiryDate: encryptCardField(expiryDate),
        cvv: encryptCardField(cvv),
        creditLimit: parseFloat(creditLimit) || 100000.0,
        statementDate: parseInt(statementDate, 10) || 12,
        dueDate: parseInt(dueDate, 10) || 30,
        notes: notes ? notes.trim() : null,
      },
    });

    const decNumber = decryptCardField(card.cardNumber);
    const cleanDigits = decNumber ? decNumber.replace(/\D/g, "") : "";
    const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "••••";

    return NextResponse.json({
      card: {
        ...card,
        last4,
        cardNumber: decNumber,
        expiryDate: decryptCardField(card.expiryDate),
        cvv: decryptCardField(card.cvv),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
