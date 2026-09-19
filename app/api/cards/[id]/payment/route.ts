import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: cardId } = params;
    const body = await request.json();

    const { amount, sourceAccountId, notes, paymentDate } = body;
    const paymentAmount = parseFloat(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const card = await prisma.creditCard.findUnique({
      where: { id: cardId, userId: user.id },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const dateStr = paymentDate || format(new Date(), "yyyy-MM-dd");

    // 1. Create payment record
    const payment = await prisma.creditCardPayment.create({
      data: {
        cardId,
        userId: user.id,
        amount: paymentAmount,
        paymentDate: dateStr,
        sourceAccountId: sourceAccountId || null,
        notes: notes || `Payment for ${card.name}`,
      },
    });

    // 2. Reduce card outstanding balance
    const newOutstanding = Math.max(0, card.currentOutstanding - paymentAmount);
    const updatedCard = await prisma.creditCard.update({
      where: { id: cardId },
      data: {
        currentOutstanding: newOutstanding,
        minDue: Math.max(0, card.minDue - paymentAmount),
      },
    });

    // 3. Deduct from source account if selected
    if (sourceAccountId) {
      const sourceAccount = await prisma.financialAccount.findUnique({
        where: { id: sourceAccountId, userId: user.id },
      });

      if (sourceAccount) {
        await prisma.financialAccount.update({
          where: { id: sourceAccountId },
          data: {
            balance: sourceAccount.balance - paymentAmount,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      payment,
      card: updatedCard,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
