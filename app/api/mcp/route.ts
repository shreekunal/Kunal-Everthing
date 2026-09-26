import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { handleMcpJsonRpc, JsonRpcRequest } from "@/lib/mcp/server";
import { MCP_TOOLS } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

/**
 * Discovery and Info Endpoint
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);

  return NextResponse.json({
    name: "Everything MCP Server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    transport: "Streamable HTTPS (SSE) & Direct JSON-RPC",
    authenticated: auth.authenticated,
    user: auth.user ? { name: auth.user.name, email: auth.user.email } : null,
    endpoints: {
      sse: "/api/mcp/sse",
      messages: "/api/mcp/messages",
      direct: "/api/mcp",
    },
    tools: MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: Object.keys(t.inputSchema.properties || {}),
    })),
  });
}

/**
 * Direct JSON-RPC execution endpoint
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.authenticated || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const isBatch = Array.isArray(rawBody);
    const requests: JsonRpcRequest[] = isBatch ? rawBody : [rawBody];

    const responses = [];
    for (const req of requests) {
      const resp = await handleMcpJsonRpc(req, auth.user);
      if (resp !== null) {
        responses.push(resp);
      }
    }

    if (responses.length === 0) {
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
          message: `Invalid JSON-RPC payload: ${err.message || String(err)}`,
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}
