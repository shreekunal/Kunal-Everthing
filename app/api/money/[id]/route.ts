import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const { id } = params;
    const body = await request.json();

    const account = await prisma.financialAccount.findUnique({
      where: { id, userId: user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const {
      name,
      category,
      type,
      balance,
      adjustmentType,
      adjustmentAmount,
    } = body;

    let updatedBalance = account.balance;

    if (adjustmentType && adjustmentAmount !== undefined) {
      const amt = Math.abs(parseFloat(adjustmentAmount) || 0);
      const accType = type || account.type;

      if (accType === "ASSET") {
        if (adjustmentType === "CREDIT" || adjustmentType === "ADD") {
          // Add credit / deposit to asset
          updatedBalance = account.balance + amt;
        } else if (adjustmentType === "DEBIT" || adjustmentType === "DEDUCT") {
          // Deduct / withdraw from asset
          updatedBalance = Math.max(0, account.balance - amt);
        }
      } else {
        // LIABILITY account
        if (adjustmentType === "REDUCE" || adjustmentType === "CREDIT" || adjustmentType === "PAY") {
          // Pay down / reduce liability
          updatedBalance = Math.max(0, account.balance - amt);
        } else if (adjustmentType === "INCREASE" || adjustmentType === "DEBIT" || adjustmentType === "BORROW") {
          // Increase liability / borrow
          updatedBalance = account.balance + amt;
        }
      }
    } else if (balance !== undefined && balance !== null && balance !== "") {
      updatedBalance = parseFloat(balance) || 0;
    }

    const updated = await prisma.financialAccount.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : account.name,
        category: category !== undefined ? category : account.category,
        type: type !== undefined ? type : account.type,
        balance: updatedBalance,
      },
    });

    return NextResponse.json({ account: updated });
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
    const { id } = params;

    await prisma.financialAccount.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
