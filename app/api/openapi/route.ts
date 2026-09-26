import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const serverUrl = `${url.protocol}//${url.host}`;

  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "Everything Personal OS API",
      description: "Production API and Tool Provider for Everything Personal OS. Supports task creation and study telemetry.",
      version: "1.0.0",
    },
    servers: [
      {
        url: serverUrl,
        description: "Production Server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "API Key for authentication",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Bearer Token authentication",
        },
      },
    },
    security: [
      { ApiKeyAuth: [] },
      { BearerAuth: [] },
    ],
    paths: {
      "/api/mcp": {
        post: {
          summary: "Execute MCP Tool (create_task or study_summary)",
          operationId: "executeMcpTool",
          description: "Direct JSON-RPC tool invocation endpoint for AI web clients.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jsonrpc: { type: "string", example: "2.0" },
                    method: { type: "string", example: "tools/call" },
                    params: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          enum: ["create_task", "study_summary"],
                          description: "Name of the tool to execute",
                        },
                        arguments: {
                          type: "object",
                          description: "Arguments for the chosen tool",
                        },
                      },
                      required: ["name"],
                    },
                  },
                  required: ["jsonrpc", "method", "params"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful tool execution",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      jsonrpc: { type: "string" },
                      result: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/tasks": {
        post: {
          summary: "Create a new task",
          operationId: "createTask",
          description: "Add a new task to Everything with priority, due date, category, and notes.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Task title (required)" },
                    priority: {
                      type: "string",
                      enum: ["LOW", "MEDIUM", "HIGH"],
                      default: "MEDIUM",
                      description: "Priority level",
                    },
                    dueDate: { type: "string", description: "Due date in YYYY-MM-DD format" },
                    dueTime: { type: "string", description: "Due time in HH:mm format" },
                    category: { type: "string", default: "Work", description: "Category name" },
                    notes: { type: "string", description: "Additional details or context" },
                  },
                  required: ["title"],
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Task created successfully",
            },
          },
        },
      },
      "/api/progress": {
        get: {
          summary: "Get Study and Focus Telemetry",
          operationId: "getStudySummary",
          description: "Retrieve comprehensive study hours, daily/weekly stats, subject breakdowns, and focus session history.",
          responses: {
            "200": {
              description: "Study and focus statistics",
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
