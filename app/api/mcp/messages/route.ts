import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { handleMcpJsonRpc, mcpSessionManager, JsonRpcRequest } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") || "";

  try {
    const rawBody = await request.json();

    // Support single request or batch requests
    const isBatch = Array.isArray(rawBody);
    const requests: JsonRpcRequest[] = isBatch ? rawBody : [rawBody];

    const responses = [];

    for (const req of requests) {
      const resp = await handleMcpJsonRpc(req, auth.user);
      if (resp !== null) {
        responses.push(resp);

        // If active SSE session exists, send response over SSE stream
        if (sessionId) {
          mcpSessionManager.sendToSession(sessionId, resp);
        }
      }
    }

    if (responses.length === 0) {
      // Notifications only (no response needed)
      return new Response(null, { status: 202 });
    }

    const responseData = isBatch ? responses : responses[0];
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error / Invalid JSON: ${err.message || String(err)}`,
        },
      },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
