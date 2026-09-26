import { prisma } from "@/lib/prisma";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "create_task",
    description: "Create a new task in Everything with title, priority (LOW, MEDIUM, HIGH), due date, due time, category, and notes.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title or short description of the task (required)",
        },
        priority: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
          description: "Priority of the task (default: MEDIUM)",
        },
        dueDate: {
          type: "string",
          description: "Due date in YYYY-MM-DD format (optional, e.g. 2026-09-27)",
        },
        dueTime: {
          type: "string",
          description: "Due time in HH:mm 24-hour format (optional, e.g. 17:30)",
        },
        category: {
          type: "string",
          description: "Category for organization, e.g. Work, Study, Health, Finance, Personal (default: Work)",
        },
        description: {
          type: "string",
          description: "Optional detailed task description or checklist",
        },
        notes: {
          type: "string",
          description: "Optional extra notes or context",
        },
        remindAt: {
          type: "string",
          description: "Optional ISO datetime string for notification reminder",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "study_summary",
    description: "Retrieve study and focus telemetry summary (daily, weekly, monthly, or all-time) including total study time, session breakdown, subjects, estimated XP, and progress against goals.",
    inputSchema: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          enum: ["today", "this_week", "last_7_days", "month", "all_time"],
          description: "Timeframe for study analytics (default: today)",
        },
        date: {
          type: "string",
          description: "Optional specific date in YYYY-MM-DD format to inspect historical records",
        },
      },
    },
  },
];

/**
 * Executes a tool call given user and arguments
 */
export async function executeMcpTool(
  toolName: string,
  args: Record<string, any>,
  user: { id: string; name: string }
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (toolName) {
      case "create_task": {
        const {
          title,
          priority = "MEDIUM",
          dueDate,
          dueTime,
          category = "Work",
          description,
          notes,
          remindAt,
        } = args;

        if (!title || typeof title !== "string" || !title.trim()) {
          return {
            isError: true,
            content: [{ type: "text", text: "Error: 'title' is required to create a task." }],
          };
        }

        const validPriorities = ["LOW", "MEDIUM", "HIGH"];
        const sanitizedPriority = validPriorities.includes(priority?.toUpperCase())
          ? priority.toUpperCase()
          : "MEDIUM";

        const task = await prisma.task.create({
          data: {
            userId: user.id,
            title: title.trim(),
            priority: sanitizedPriority,
            status: "TODO",
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            category: category || "Work",
            description: description || null,
            notes: notes || null,
            remindAt: remindAt ? new Date(remindAt) : null,
          },
        });

        const formattedResponse = [
          `✅ **Task Created Successfully in Everything**`,
          `- **ID:** \`${task.id}\``,
          `- **Title:** ${task.title}`,
          `- **Priority:** ${task.priority}`,
          `- **Category:** ${task.category}`,
          `- **Due Date:** ${task.dueDate || "No due date"} ${task.dueTime ? `at ${task.dueTime}` : ""}`,
          `- **Status:** ${task.status}`,
          `- **Owner:** ${user.name}`,
        ].join("\n");

        return {
          content: [{ type: "text", text: formattedResponse }],
        };
      }

      case "study_summary": {
        const timeframe = args.timeframe || "today";
        const today = new Date();
        const targetDateStr = args.date || format(today, "yyyy-MM-dd");

        let dateFilter: any = {};
        let headerLabel = "";

        if (args.date) {
          dateFilter = { equals: targetDateStr };
          headerLabel = `Date: ${targetDateStr}`;
        } else if (timeframe === "today") {
          dateFilter = { equals: targetDateStr };
          headerLabel = `Today (${targetDateStr})`;
        } else if (timeframe === "this_week") {
          const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
          const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
          dateFilter = { gte: weekStart, lte: weekEnd };
          headerLabel = `This Week (${weekStart} to ${weekEnd})`;
        } else if (timeframe === "last_7_days") {
          const sevenDaysAgo = format(subDays(today, 6), "yyyy-MM-dd");
          dateFilter = { gte: sevenDaysAgo, lte: targetDateStr };
          headerLabel = `Last 7 Days (${sevenDaysAgo} to ${targetDateStr})`;
        } else if (timeframe === "month") {
          const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
          const monthEnd = format(endOfMonth(today), "yyyy-MM-dd");
          dateFilter = { gte: monthStart, lte: monthEnd };
          headerLabel = `This Month (${monthStart} to ${monthEnd})`;
        } else if (timeframe === "all_time") {
          dateFilter = undefined;
          headerLabel = "All-Time Focus Telemetry";
        }

        const sessions = await prisma.workSession.findMany({
          where: {
            userId: user.id,
            ...(dateFilter ? { date: dateFilter } : {}),
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        const studySessions = sessions.filter((s) => s.type === "STUDY");
        const workSessions = sessions.filter((s) => s.type === "WORK");
        const personalSessions = sessions.filter((s) => s.type === "PERSONAL");

        const totalStudyMinutes = studySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalWorkMinutes = workSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalPersonalMinutes = personalSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        const totalAllMinutes = totalStudyMinutes + totalWorkMinutes + totalPersonalMinutes;

        // Subject breakdown
        const subjectMap: Record<string, { minutes: number; count: number }> = {};
        for (const s of studySessions) {
          const key = s.project.trim() || "General Study";
          if (!subjectMap[key]) {
            subjectMap[key] = { minutes: 0, count: 0 };
          }
          subjectMap[key].minutes += s.durationMinutes;
          subjectMap[key].count += 1;
        }

        const sortedSubjects = Object.entries(subjectMap).sort(
          (a, b) => b[1].minutes - a[1].minutes
        );

        // Format helper
        const formatDuration = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          if (h === 0) return `${m}m`;
          if (m === 0) return `${h}h`;
          return `${h}h ${m}m`;
        };

        // Calculate XP Yield (1 XP per 5 mins of study)
        const earnedXP = Math.floor(totalStudyMinutes / 5);

        // Cognitive analytics for AI Coaching
        const sessionCount = studySessions.length;
        const avgSessionDuration = sessionCount > 0 ? Math.round(totalStudyMinutes / sessionCount) : 0;
        const dailyTargetMinutes = 180; // 3 hours daily goal default
        const weeklyTargetMinutes = 1260; // 21 hours weekly goal default

        const subjectLines = sortedSubjects.length > 0
          ? sortedSubjects
              .map(
                ([subj, data]) => {
                  const percentOfTotal = totalStudyMinutes > 0 ? Math.round((data.minutes / totalStudyMinutes) * 100) : 0;
                  return `- **${subj}:** ${formatDuration(data.minutes)} (${percentOfTotal}% of study time across ${data.count} session${data.count === 1 ? "" : "s"})`;
                }
              )
              .join("\n")
          : "- *No study sessions recorded for this timeframe.*";

        const recentLines = studySessions.slice(0, 7).map((s) => {
          return `- **${s.project}** (${formatDuration(s.durationMinutes)}) on ${s.date}${s.notes ? ` • _${s.notes}_` : ""}`;
        });

        // AI Coaching Signals
        const pacingSignals = [];
        if (avgSessionDuration > 90) {
          pacingSignals.push("Long session average (>90m) — consider introducing 5-10m active recovery breaks (Pomodoro technique).");
        } else if (avgSessionDuration < 25 && sessionCount > 0) {
          pacingSignals.push("Short session average (<25m) — try deep focus blocks of 35-50 minutes for deeper cognitive absorption.");
        }

        if (sortedSubjects.length > 1) {
          const topSubject = sortedSubjects[0];
          const topPercent = Math.round((topSubject[1].minutes / totalStudyMinutes) * 100);
          if (topPercent > 70) {
            pacingSignals.push(`Heavy concentration on ${topSubject[0]} (${topPercent}%). Interleaving other subjects can improve retention.`);
          }
        }

        const summaryText = [
          `📊 **Study & Focus Telemetry • Everything**`,
          `👤 **Student:** ${user.name} | 📅 **Period:** ${headerLabel}`,
          ``,
          `### ⏱️ Core Focus Metrics`,
          `- **Total Study Time:** **${formatDuration(totalStudyMinutes)}** (${totalStudyMinutes} minutes)`,
          `- **Completed Sessions:** **${sessionCount} sessions** (Average: **${avgSessionDuration} mins / session**)`,
          `- **Other Focus Time (Work/Personal):** ${formatDuration(totalWorkMinutes + totalPersonalMinutes)}`,
          `- **Discipline XP Yield:** **+${earnedXP} XP** *(1 XP per 5 mins)*`,
          `- **Daily Target Progress (3h/day):** ${Math.round((totalStudyMinutes / dailyTargetMinutes) * 100)}%`,
          `- **Weekly Target Progress (21h/week):** ${Math.round((totalStudyMinutes / weeklyTargetMinutes) * 100)}%`,
          ``,
          `### 📚 Subject Distribution & Deep Work Balance`,
          subjectLines,
          ``,
          ...(recentLines.length > 0
            ? [`### 🕒 Recent Sessions Timeline`, ...recentLines, ``]
            : []),
          `### 🧠 Cognitive & Coaching Telemetry Signals`,
          ...(pacingSignals.length > 0
            ? pacingSignals.map((sig) => `- 💡 ${sig}`)
            : ["- 💡 Steady focus distribution maintained."]),
          `- 📌 _AI Coach Instruction: Use this telemetry (duration, pacing, subject distribution, and targets) to provide actionable study advice, spaced repetition suggestions, and fatigue management tips._`,
        ].join("\n");

        return {
          content: [{ type: "text", text: summaryText }],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
        };
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `Tool execution failed: ${error.message || String(error)}` }],
    };
  }
}
