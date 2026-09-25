import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import { decryptCardField } from "@/lib/crypto/cardEncryption";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.financialAccount.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { balance: "desc" },
    });

    const creditCards = await prisma.creditCard.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "desc" },
    });

    const debitCards = await prisma.debitCard.findMany({
      where: { userId: user.id, isArchived: false },
      orderBy: { createdAt: "desc" },
    });

    const decryptedCreditCards = creditCards.map((c) => {
      const decNumber = decryptCardField(c.cardNumber);
      const cleanDigits = decNumber ? decNumber.replace(/\D/g, "") : "";
      const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "••••";
      return {
        ...c,
        last4,
        cardNumber: decNumber,
        expiryDate: decryptCardField(c.expiryDate),
        cvv: decryptCardField(c.cvv),
      };
    });

    const decryptedDebitCards = debitCards.map((c) => {
      const decNumber = decryptCardField(c.cardNumber);
      const cleanDigits = decNumber ? decNumber.replace(/\D/g, "") : "";
      const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : "••••";
      return {
        ...c,
        last4,
        cardNumber: decNumber,
        expiryDate: decryptCardField(c.expiryDate),
        cvv: decryptCardField(c.cvv),
      };
    });

    const totalAssets = accounts
      .filter((a) => a.type === "ASSET")
      .reduce((acc, a) => acc + a.balance, 0);

    const otherLiabilities = accounts
      .filter((a) => a.type === "LIABILITY")
      .reduce((acc, a) => acc + a.balance, 0);

    const totalCardOutstanding = 0;
    const totalLiabilities = otherLiabilities;
    const netWorth = totalAssets - totalLiabilities;

    // Record or update daily snapshot
    const todayStr = format(new Date(), "yyyy-MM-dd");
    await prisma.netWorthSnapshot.upsert({
      where: {
        userId_snapshotDate: {
          userId: user.id,
          snapshotDate: todayStr,
        },
      },
      update: {
        totalAssets,
        totalLiabilities,
        netWorth,
      },
      create: {
        userId: user.id,
        snapshotDate: todayStr,
        totalAssets,
        totalLiabilities,
        netWorth,
      },
    });

    // Recent snapshots for trendline
    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { snapshotDate: "asc" },
      take: 30,
    });

    return NextResponse.json({
      netWorth,
      totalAssets,
      totalLiabilities,
      totalCardOutstanding,
      accounts,
      creditCards: decryptedCreditCards,
      debitCards: decryptedDebitCards,
      snapshots,
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
    const { name, type, category, balance } = body;

    if (!name) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    const account = await prisma.financialAccount.create({
      data: {
        userId: user.id,
        name: name.trim(),
        type: type || "ASSET",
        category: category || "BANK",
        balance: parseFloat(balance) || 0.0,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
