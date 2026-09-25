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

    const existing = await prisma.debitCard.findUnique({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Debit card not found" }, { status: 404 });
    }

    const { name, cardNumber, expiryDate, cvv, network, notes } = body;

    let computedLast4 = existing.last4;
    if (cardNumber !== undefined) {
      const cleanDigits = cardNumber ? cardNumber.replace(/\D/g, "") : "";
      computedLast4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : null;
    }

    const updated = await prisma.debitCard.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        cardNumber: cardNumber !== undefined ? encryptCardField(cardNumber) : existing.cardNumber,
        last4: computedLast4,
        expiryDate: expiryDate !== undefined ? encryptCardField(expiryDate) : existing.expiryDate,
        cvv: cvv !== undefined ? encryptCardField(cvv) : existing.cvv,
        network: network !== undefined ? network : existing.network,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      },
    });

    return NextResponse.json({
      debitCard: {
        ...updated,
        cardNumber: decryptCardField(updated.cardNumber),
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

    await prisma.debitCard.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
