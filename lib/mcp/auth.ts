import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrCreateDefaultUser } from "@/lib/auth";

/**
 * Validates MCP request and resolves the authenticated user.
 * Supports:
 * 1. Authorization: Bearer <API_KEY>
 * 2. x-api-key: <API_KEY>
 * 3. Query param ?apiKey=<API_KEY>
 * 4. Existing browser session cookie
 * 5. Falls back to default primary user if no custom API key is required in env
 */
export async function authenticateMcpRequest(request: Request) {
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization") || "";
  const apiKeyHeader = request.headers.get("x-api-key") || "";
  const queryApiKey = url.searchParams.get("apiKey") || "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : apiKeyHeader || queryApiKey;

  // 1. Check if authenticated browser session cookie exists
  const sessionUser = await getCurrentUser().catch(() => null);
  if (sessionUser) {
    return { authenticated: true, user: sessionUser, error: null };
  }

  // 2. For external API / Claude calls, enforce configured API key
  const configuredApiKey = process.env.EVERYTHING_MCP_API_KEY || process.env.MCP_API_KEY;
  if (configuredApiKey) {
    if (!token || token !== configuredApiKey) {
      return { authenticated: false, error: "Invalid or missing MCP API key", user: null };
    }
    const defaultUser = await getOrCreateDefaultUser();
    return { authenticated: true, user: defaultUser, error: null };
  }

  // In production, reject unauthenticated access if no API key is configured
  if (process.env.NODE_ENV === "production") {
    return {
      authenticated: false,
      error: "MCP API key must be configured in production (EVERYTHING_MCP_API_KEY).",
      user: null,
    };
  }

  // 3. Resolve default primary user (Kunal) in local development
  const defaultUser = await getOrCreateDefaultUser();
  return { authenticated: true, user: defaultUser, error: null };
}
