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
    const q = searchParams.get("q")?.trim();

    if (!q || q.length === 0) {
      return NextResponse.json({
        query: "",
        tasks: [],
        accounts: [],
        creditCards: [],
        debitCards: [],
        dates: [],
        dailyDiaries: [],
      });
    }

    // Execute parallel searches scoped strictly to current user
    const [
      tasks,
      accounts,
      creditCards,
      debitCards,
      dates,
      dailyDiaries,
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

      // Financial Accounts
      prisma.financialAccount.findMany({
        where: {
          userId: user.id,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          balance: true,
          type: true,
          category: true,
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
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          bank: true,
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
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
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

      // Daily Diaries
      prisma.dailyDiary.findMany({
        where: {
          userId: user.id,
          OR: [
            { content: { contains: q, mode: "insensitive" } },
            { highlights: { contains: q, mode: "insensitive" } },
            { gratitude: { contains: q, mode: "insensitive" } },
            { partnerNote: { contains: q, mode: "insensitive" } },
            { mood: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 6,
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          mood: true,
          rating: true,
          highlights: true,
          partnerNote: true,
        },
      }),
    ]);

    return NextResponse.json({
      query: q,
      tasks,
      accounts,
      creditCards,
      debitCards,
      dates,
      dailyDiaries,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
