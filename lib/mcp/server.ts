import { MCP_TOOLS, executeMcpTool } from "./tools";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

// In-memory registry of active SSE client session streams
type SseClient = {
  sessionId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  createdAt: number;
};

class McpSessionManager {
  private clients: Map<string, SseClient> = new Map();

  register(sessionId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    this.clients.set(sessionId, {
      sessionId,
      controller,
      createdAt: Date.now(),
    });

    // Clean up stale sessions (> 24h old)
    const now = Date.now();
    this.clients.forEach((client, id) => {
      if (now - client.createdAt > 24 * 60 * 60 * 1000) {
        this.clients.delete(id);
      }
    });
  }

  unregister(sessionId: string) {
    this.clients.delete(sessionId);
  }

  sendToSession(sessionId: string, data: any, eventName = "message"): boolean {
    const client = this.clients.get(sessionId);
    if (!client) return false;

    try {
      const encoder = new TextEncoder();
      const payload = `event: ${eventName}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`;
      client.controller.enqueue(encoder.encode(payload));
      return true;
    } catch {
      this.unregister(sessionId);
      return false;
    }
  }
}

export const mcpSessionManager = new McpSessionManager();

/**
 * Handle incoming JSON-RPC 2.0 request
 */
export async function handleMcpJsonRpc(
  rpc: JsonRpcRequest,
  user: { id: string; name: string }
): Promise<JsonRpcResponse | null> {
  const { id, method, params } = rpc;

  switch (method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "everything-mcp-server",
            version: "1.0.0",
          },
          instructions:
            "Everything MCP Server. Manage your tasks and retrieve rich study/focus analytics via Streamable HTTPS.",
        },
      };
    }

    case "notifications/initialized": {
      // Notification acknowledgment (no response required for JSON-RPC notification)
      return null;
    }

    case "ping": {
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {},
      };
    }

    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          tools: MCP_TOOLS,
        },
      };
    }

    case "tools/call": {
      const name = params?.name;
      const args = params?.arguments || {};

      if (!name) {
        return {
          jsonrpc: "2.0",
          id: id ?? null,
          error: {
            code: -32602,
            message: "Missing 'name' parameter for tools/call",
          },
        };
      }

      const toolResult = await executeMcpTool(name, args, user);
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: toolResult,
      };
    }

    default: {
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }
  }
}
