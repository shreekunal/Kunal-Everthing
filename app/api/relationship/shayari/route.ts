import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get("count") || "5", 10);

    let quotesData: any[] = [];

    // 1. Attempt direct fetch to QuoteSlate Vercel API
    try {
      const response = await fetch(
        `https://quoteslate.vercel.app/api/quotes/random?tags=love&count=${count}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        }
      );

      if (response.ok) {
        const rawData = await response.json();
        quotesData = Array.isArray(rawData) ? rawData : [rawData];
      }
    } catch (directErr) {
      console.warn("QuoteSlate direct endpoint unreachable, querying dynamic database:", directErr);
    }

    // 2. If Vercel Edge Challenge (429) or failure occurred, fetch live dynamically from QuoteSlate's dataset on GitHub
    if (quotesData.length === 0) {
      const liveRes = await fetch(
        "https://raw.githubusercontent.com/Musheer360/QuoteSlate/main/data/quotes.json",
        {
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        }
      );

      if (liveRes.ok) {
        const allQuotes = await liveRes.json();
        const loveQuotes = allQuotes.filter(
          (q: any) => q.tags && q.tags.map((t: string) => t.toLowerCase()).includes("love")
        );
        const shuffled = [...loveQuotes].sort(() => 0.5 - Math.random());
        quotesData = shuffled.slice(0, count);
      }
    }

    if (quotesData.length === 0) {
      return NextResponse.json(
        { error: "Failed to retrieve quotes from QuoteSlate live API" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      quotes: quotesData.slice(0, count),
      source: "quoteslate",
      count: quotesData.slice(0, count).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
