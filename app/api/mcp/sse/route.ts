import { NextRequest } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { mcpSessionManager } from "@/lib/mcp/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.authenticated || !auth.user) {
    return new Response(JSON.stringify({ error: auth.error || "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const sessionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  // Construct absolute messages endpoint URL preserving apiKey query if provided
  const messageEndpoint = new URL("/api/mcp/messages", request.url);
  messageEndpoint.searchParams.set("sessionId", sessionId);
  const queryApiKey = url.searchParams.get("apiKey");
  if (queryApiKey) {
    messageEndpoint.searchParams.set("apiKey", queryApiKey);
  }

  let keepAliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      mcpSessionManager.register(sessionId, controller);

      // Send initial endpoint message according to MCP SSE Spec
      const endpointPayload = `event: endpoint\r\ndata: ${messageEndpoint.toString()}\r\n\r\n`;
      controller.enqueue(encoder.encode(endpointPayload));

      // Keepalive heartbeat every 15 seconds to prevent proxy / NAT timeouts
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\r\n\r\n`));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
          mcpSessionManager.unregister(sessionId);
        }
      }, 15000);
    },
    cancel() {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      mcpSessionManager.unregister(sessionId);
    },
  });

  request.signal.addEventListener("abort", () => {
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    mcpSessionManager.unregister(sessionId);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
