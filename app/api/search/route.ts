import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q || q.length < 1) {
      return NextResponse.json({
        query: "",
        tasks: [],
        routines: [],
        accounts: [],
        creditCards: [],
        debitCards: [],
        dates: [],
        vaultItems: [],
      });
    }

    // Execute parallel searches scoped strictly to current user
    const [
      tasks,
      routines,
      accounts,
      creditCards,
      debitCards,
      dates,
      vaultItems,
    ] = await Promise.all([
      // Tasks
      prisma.task.findMany({
        where: {
          userId: user.id,
          isArchived: false,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          category: true,
          dueDate: true,
        },
      }),

      // Routines
      prisma.routine.findMany({
        where: {
          userId: user.id,
          isArchived: false,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 6,
        select: {
          id: true,
          name: true,
          category: true,
          currentStreak: true,
          targetDays: true,
        },
      }),

      // Bank & Financial Accounts
      prisma.financialAccount.findMany({
        where: {
          userId: user.id,
          isArchived: false,
          name: { contains: q, mode: "insensitive" },
        },
        take: 6,
        select: {
          id: true,
          name: true,
          type: true,
          category: true,
          balance: true,
        },
      }),

      // Credit Cards
      prisma.creditCard.findMany({
        where: {
          userId: user.id,
          isArchived: false,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { bank: { contains: q, mode: "insensitive" } },
            { last4: { contains: q } },
          ],
        },
        take: 6,
        select: {
          id: true,
          name: true,
          bank: true,
          last4: true,
          currentOutstanding: true,
          creditLimit: true,
          dueDate: true,
        },
      }),

      // Debit Cards
      prisma.debitCard.findMany({
        where: {
          userId: user.id,
          isArchived: false,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { last4: { contains: q } },
          ],
        },
        take: 4,
        select: {
          id: true,
          name: true,
          last4: true,
          network: true,
        },
      }),

      // Important Dates
      prisma.importantDate.findMany({
        where: {
          userId: user.id,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 6,
        select: {
          id: true,
          name: true,
          date: true,
          category: true,
        },
      }),

      // Vault Items (Title & Category only - zero sensitive payload leak)
      prisma.vaultItem.findMany({
        where: {
          userId: user.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 6,
        select: {
          id: true,
          title: true,
          type: true,
          category: true,
        },
      }),
    ]);

    return NextResponse.json({
      query: q,
      tasks,
      routines,
      accounts,
      creditCards,
      debitCards,
      dates,
      vaultItems,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
