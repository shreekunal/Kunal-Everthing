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
      include: {
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 5,
        },
      },
      orderBy: { currentOutstanding: "desc" },
    });

    const cardsWithDueInfo = cards.map((c) => {
      const dueInfo = getNextCardDueDate(c.dueDate);
      const utilization = c.creditLimit > 0 ? (c.currentOutstanding / c.creditLimit) * 100 : 0;
      const availableLimit = Math.max(0, c.creditLimit - c.currentOutstanding);

      return {
        id: c.id,
        name: c.name,
        bank: c.bank,
        network: c.network,
        last4: c.last4,
        creditLimit: c.creditLimit,
        currentOutstanding: c.currentOutstanding,
        minDue: c.minDue,
        availableLimit,
        utilization: Math.round(utilization),
        statementDate: c.statementDate,
        dueDate: c.dueDate,
        cardNumber: decryptCardField(c.cardNumber),
        expiryDate: decryptCardField(c.expiryDate),
        cvv: decryptCardField(c.cvv),
        autopay: c.autopay,
        daysRemaining: dueInfo.daysRemaining,
        dueDateLabel: dueInfo.label,
        formattedDueDate: dueInfo.date.toISOString(),
        recentPayments: c.payments,
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
      last4,
      cardNumber,
      expiryDate,
      cvv,
      creditLimit,
      statementDate,
      dueDate,
      currentOutstanding,
      minDue,
      autopay,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Card name is required" },
        { status: 400 }
      );
    }

    // Determine clean last4 from cardNumber or explicit last4
    const cleanDigits = cardNumber ? cardNumber.replace(/\D/g, "") : "";
    const computedLast4 = cleanDigits.length >= 4 
      ? cleanDigits.slice(-4) 
      : (last4 ? last4.slice(-4) : "0000");

    const card = await prisma.creditCard.create({
      data: {
        userId: user.id,
        name: name.trim(),
        bank: bank ? bank.trim() : "",
        network: network || "VISA",
        last4: computedLast4,
        cardNumber: encryptCardField(cardNumber),
        expiryDate: encryptCardField(expiryDate),
        cvv: encryptCardField(cvv),
        creditLimit: parseFloat(creditLimit) || 100000.0,
        statementDate: parseInt(statementDate, 10) || 12,
        dueDate: parseInt(dueDate, 10) || 30,
        currentOutstanding: parseFloat(currentOutstanding) || 0.0,
        minDue: parseFloat(minDue) || (parseFloat(currentOutstanding) || 0) * 0.05,
        autopay: Boolean(autopay),
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      card: {
        ...card,
        cardNumber: decryptCardField(card.cardNumber),
        expiryDate: decryptCardField(card.expiryDate),
        cvv: decryptCardField(card.cvv),
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
