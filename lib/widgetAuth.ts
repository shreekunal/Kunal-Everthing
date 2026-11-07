import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

export function hashWidgetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function generateWidgetToken(): { rawToken: string; tokenHash: string } {
  const randomHex = crypto.randomBytes(32).toString("hex");
  const rawToken = `kos_wgt_${randomHex}`;
  const tokenHash = hashWidgetToken(rawToken);
  return { rawToken, tokenHash };
}

// In-memory sliding window rate limiter: max 60 requests per 60 seconds per token
const rateLimitMap = new Map<string, number[]>();

export function checkWidgetRateLimit(tokenHash: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(tokenHash) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    rateLimitMap.set(tokenHash, validTimestamps);
    return false; // Rate limit exceeded
  }

  validTimestamps.push(now);
  rateLimitMap.set(tokenHash, validTimestamps);
  return true;
}

export interface WidgetAuthSuccess {
  user: User;
  tokenRecord: {
    id: string;
    userId: string;
    label: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  };
}

export type WidgetAuthResult =
  | { success: true; data: WidgetAuthSuccess }
  | { success: false; error: string; status: number };

export async function verifyWidgetBearer(request: Request): Promise<WidgetAuthResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing or malformed Authorization Bearer header",
      status: 401,
    };
  }

  const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!rawToken) {
    return {
      success: false,
      error: "Empty widget token provided",
      status: 401,
    };
  }

  const tokenHash = hashWidgetToken(rawToken);

  // Rate limit check
  if (!checkWidgetRateLimit(tokenHash)) {
    return {
      success: false,
      error: "Rate limit exceeded. Try again in a minute.",
      status: 429,
    };
  }

  try {
    const tokenRecord = await prisma.widgetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt) {
      return {
        success: false,
        error: "Widget token is invalid or has been revoked",
        status: 401,
      };
    }

    // Touch lastUsedAt asynchronously without blocking request pipeline
    prisma.widgetToken
      .update({
        where: { id: tokenRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err) => {
        console.warn("Failed to touch widget token lastUsedAt:", err);
      });

    return {
      success: true,
      data: {
        user: tokenRecord.user,
        tokenRecord: {
          id: tokenRecord.id,
          userId: tokenRecord.userId,
          label: tokenRecord.label,
          createdAt: tokenRecord.createdAt,
          lastUsedAt: tokenRecord.lastUsedAt,
          revokedAt: tokenRecord.revokedAt,
        },
      },
    };
  } catch (err: any) {
    console.error("Widget token verification error:", err);
    return {
      success: false,
      error: "Database error during token verification",
      status: 500,
    };
  }
}
