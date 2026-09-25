import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptCardField, decryptCardField } from "@/lib/crypto/cardEncryption";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.creditCard.findUnique({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Credit card not found" }, { status: 404 });
    }

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

    const updated = await prisma.creditCard.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        bank: bank !== undefined ? bank.trim() : existing.bank,
        network: network !== undefined ? network : existing.network,
        cardNumber: cardNumber !== undefined ? encryptCardField(cardNumber) : existing.cardNumber,
        expiryDate: expiryDate !== undefined ? encryptCardField(expiryDate) : existing.expiryDate,
        cvv: cvv !== undefined ? encryptCardField(cvv) : existing.cvv,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : existing.creditLimit,
        statementDate: statementDate !== undefined ? parseInt(statementDate, 10) : existing.statementDate,
        dueDate: dueDate !== undefined ? parseInt(dueDate, 10) : existing.dueDate,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
    });

    const decNumber = decryptCardField(updated.cardNumber);
    const cleanDigits = decNumber ? decNumber.replace(/\D/g, "") : "";
    const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "••••";

    return NextResponse.json({
      card: {
        ...updated,
        last4,
        cardNumber: decNumber,
        expiryDate: decryptCardField(updated.expiryDate),
        cvv: decryptCardField(updated.cvv),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;

    await prisma.creditCard.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
