import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY =
  process.env.GROQ_API_KEY || "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";

const SYSTEM_PROMPT = `You are a deeply romantic, tender, and heartfelt writer crafting personal love messages from Kunal to his girlfriend/love.
Generate exactly 5 unique, short, deeply affectionate love messages (1 to 2 sentences each).
They must feel completely authentic, intimate, emotional, and warm—never cheesy, formal, or like generic quotes.

Tone and style should be heartfelt and personal, just like these examples:
- “I miss you even when you're just a few minutes away. Somehow, my heart always wants a little more of you.”
- “I don't need a perfect day. I just need you somewhere in it.”
- “I hope you know how much happiness your existence brings into my life.”
- “Good morning, my love. I hope today treats you as beautifully as you deserve.”
- “Sometimes I just randomly smile because I remember that you're mine.”

Output strictly a JSON array of 5 objects with this format:
[
  { "id": 1, "text": "message string", "mood": "Longing" },
  { "id": 2, "text": "message string", "mood": "Gratitude" },
  { "id": 3, "text": "message string", "mood": "Warmth" },
  { "id": 4, "text": "message string", "mood": "Smile" },
  { "id": 5, "text": "message string", "mood": "Forever" }
]
Do not include any markdown fences or explanation outside the JSON array.`;

export async function POST(req: NextRequest) {
  try {
    let topic = "";
    try {
      const body = await req.json();
      if (body && typeof body.topic === "string") {
        topic = body.topic.trim();
      }
    } catch {
      // empty body
    }

    const modelsToTry = ["qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound-mini"];
    let resultJson: any = null;
    let lastError: any = null;

    const userPrompt = topic
      ? `Generate 5 fresh, deeply sweet, affectionate love messages for my love specifically tailored for: "${topic}". Keep the tone tender, loving, personal, and supportive from Kunal to his love (Golu). Return JSON array.`
      : "Generate 5 fresh, deeply sweet and affectionate love messages for my love. Return JSON array.";

    for (const model of modelsToTry) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: userPrompt,
              },
            ],
            temperature: 0.85,
            max_tokens: 700,
          }),
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          console.warn(`Groq model ${model} failed with ${groqRes.status}:`, errText);
          continue;
        }

        const data = await groqRes.json();
        const rawContent = data.choices?.[0]?.message?.content?.trim() || "";

        // Extract JSON array from output (strip codeblocks if any)
        const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (Array.isArray(parsed) && parsed.length > 0) {
          resultJson = parsed;
          break;
        } else if (parsed && Array.isArray(parsed.messages)) {
          resultJson = parsed.messages;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Attempt with ${model} failed:`, err);
      }
    }

    if (!resultJson || !Array.isArray(resultJson) || resultJson.length === 0) {
      // Fallback to high-quality preset examples if network or API error occurs
      const fallbackMessages = [
        {
          id: 1,
          text: "I miss you even when you're just a few minutes away. Somehow, my heart always wants a little more of you.",
          mood: "Longing",
        },
        {
          id: 2,
          text: "I don't need a perfect day. I just need you somewhere in it.",
          mood: "Warmth",
        },
        {
          id: 3,
          text: "I hope you know how much happiness your existence brings into my life.",
          mood: "Gratitude",
        },
        {
          id: 4,
          text: "Good morning, my love. I hope today treats you as beautifully as you deserve.",
          mood: "Morning",
        },
        {
          id: 5,
          text: "Sometimes I just randomly smile because I remember that you're mine.",
          mood: "Smile",
        },
      ];
      return NextResponse.json({
        messages: fallbackMessages,
        source: "fallback",
        warning: lastError?.message || "Using curated presets",
      });
    }

    // Format output cleanly
    const formatted = resultJson.slice(0, 5).map((item: any, idx: number) => ({
      id: item.id || idx + 1,
      text: typeof item.text === "string" ? item.text.replace(/^["“]|["”]$/g, "").trim() : String(item),
      mood: item.mood || "Sweet",
    }));

    return NextResponse.json({
      messages: formatted,
      source: "groq",
      count: formatted.length,
    });
  } catch (error: any) {
    console.error("Error in love messages API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate love messages" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Support GET request as well if needed
  return POST(req);
}
