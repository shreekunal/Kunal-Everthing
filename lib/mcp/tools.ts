import { prisma } from "@/lib/prisma";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { awardPoints } from "@/lib/rewards";

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
    description: "Retrieve comprehensive study, cognitive window, focus efficiency, and aim mastery telemetry (daily, weekly, monthly, or all-time) including wall-clock efficiency, flow ratings, peak cognitive prime windows, pre-session intentions, and high-stakes aim syllabus progress.",
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
  {
    name: "log_study_session",
    description: "Log a completed study session with pure study focus duration, From/To wall-clock timestamps, focus flow rating (1-5), pre-session intention, and bottleneck reflection.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Subject or topic name (e.g. 'Dynamic Programming', 'Distributed Systems')",
        },
        durationMinutes: {
          type: "number",
          description: "Pure focused study duration in minutes (e.g. 60)",
        },
        startTime: {
          type: "string",
          description: "Wall-clock start time in HH:mm format (optional, e.g. '10:00')",
        },
        endTime: {
          type: "string",
          description: "Wall-clock end time in HH:mm format (optional, e.g. '12:30')",
        },
        focusScore: {
          type: "number",
          enum: [1, 2, 3, 4, 5],
          description: "Flow and focus rating from 1 (distracted) to 5 (pure flow zone)",
        },
        intention: {
          type: "string",
          description: "Pre-session intention prompt: What ONE problem or concept must be solved?",
        },
        reflection: {
          type: "string",
          description: "Post-session interrogation prompt: What was the hardest bottleneck or concept?",
        },
        topicId: {
          type: "string",
          description: "Optional linked StudyTopic ID from an Aim syllabus",
        },
        notes: {
          type: "string",
          description: "Optional category/mode (e.g. 'Deep Study', 'Problem Practice', 'Revision')",
        },
      },
      required: ["project", "durationMinutes"],
    },
  },
  {
    name: "manage_aims",
    description: "Retrieve or update high-stakes aims, milestones, and syllabus topics with 4-tier mastery levels (NOT_STARTED, IN_PROGRESS, CONFIDENT, MASTERED).",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["LIST_AIMS", "UPDATE_TOPIC_MASTERY", "CREATE_AIM"],
          description: "Action to perform (default: LIST_AIMS)",
        },
        topicId: {
          type: "string",
          description: "Topic ID when updating mastery",
        },
        mastery: {
          type: "string",
          enum: ["NOT_STARTED", "IN_PROGRESS", "CONFIDENT", "MASTERED"],
          description: "New mastery level for topic",
        },
        title: {
          type: "string",
          description: "Aim title when creating a new aim",
        },
        targetDate: {
          type: "string",
          description: "Optional target date in YYYY-MM-DD format",
        },
      },
    },
  },
];

function calculateElapsedMinutes(startStr?: string | null, endStr?: string | null): number | null {
  if (!startStr || !endStr) return null;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return null;
  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return Math.max(1, endTotal - startTotal);
}

function getWindowFromTime(timeStr?: string | null, fallbackDate?: Date): string {
  let hour = 10;
  if (timeStr && timeStr.includes(":")) {
    const parsedH = parseInt(timeStr.split(":")[0], 10);
    if (!isNaN(parsedH)) hour = parsedH;
  } else if (fallbackDate) {
    hour = new Date(fallbackDate).getHours();
  }

  if (hour >= 5 && hour < 9) return "Early Morning (05:00 - 09:00)";
  if (hour >= 9 && hour < 12) return "Morning (09:00 - 12:00)";
  if (hour >= 12 && hour < 17) return "Afternoon (12:00 - 17:00)";
  if (hour >= 17 && hour < 21) return "Evening (17:00 - 21:00)";
  if (hour >= 21 || hour < 1) return "Night (21:00 - 01:00)";
  return "Late Night (01:00 - 05:00)";
}

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

      case "log_study_session": {
        const {
          project,
          durationMinutes,
          startTime,
          endTime,
          focusScore = 5,
          intention,
          reflection,
          topicId,
          notes,
        } = args;

        if (!project || !durationMinutes) {
          return {
            isError: true,
            content: [{ type: "text", text: "Error: 'project' and 'durationMinutes' are required." }],
          };
        }

        const mins = Number(durationMinutes);
        const elapsedMins = calculateElapsedMinutes(startTime, endTime);
        const efficiencyPct = elapsedMins && elapsedMins > 0
          ? Number(Math.min(100, Math.max(10, (mins / elapsedMins) * 100)).toFixed(1))
          : null;

        const session = await prisma.workSession.create({
          data: {
            userId: user.id,
            project: project.trim(),
            durationMinutes: mins,
            startTime: startTime || null,
            endTime: endTime || null,
            elapsedMinutes: elapsedMins || null,
            efficiencyPercent: efficiencyPct || null,
            focusScore: focusScore ? Number(focusScore) : 5,
            intention: intention?.trim() || null,
            reflection: reflection?.trim() || null,
            topicId: topicId || null,
            type: "STUDY",
            date: format(new Date(), "yyyy-MM-dd"),
            notes: notes || "Deep Study",
          },
        });

        let earnedXP = Math.max(2, Math.floor(mins / 5));
        if (focusScore >= 4) earnedXP += focusScore === 5 ? 10 : 5;

        await awardPoints({
          userId: user.id,
          points: earnedXP,
          type: "WORK_SESSION_LOGGED",
          title: `Study Session: ${project} (${mins}m)`,
          reason: `Completed ${mins}m focus session [Flow: ${focusScore}/5]`,
          category: "PRODUCTIVITY",
          referenceId: session.id,
        });

        const resLines = [
          `🎯 **Study Session Successfully Recorded**`,
          `- **Subject:** ${session.project}`,
          `- **Pure Focus Duration:** ${mins} mins (+${earnedXP} XP)`,
          ...(startTime && endTime ? [`- **Wall-Clock Time:** ${startTime} → ${endTime} (${elapsedMins}m elapsed)`] : []),
          ...(efficiencyPct ? [`- **Focus Efficiency:** **${efficiencyPct}%**`] : []),
          `- **Flow State Rating:** ⭐ **${focusScore}/5**`,
          ...(intention ? [`- **Target Focus:** "${intention}"`] : []),
          ...(reflection ? [`- **Bottleneck Review:** "${reflection}"`] : []),
        ];

        return {
          content: [{ type: "text", text: resLines.join("\n") }],
        };
      }

      case "manage_aims": {
        const action = args.action || "LIST_AIMS";

        if (action === "UPDATE_TOPIC_MASTERY") {
          const { topicId, mastery } = args;
          if (!topicId || !mastery) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: 'topicId' and 'mastery' are required." }],
            };
          }

          const topic = await prisma.studyTopic.findFirst({
            where: { id: topicId, milestone: { aim: { userId: user.id } } },
            include: { milestone: { include: { aim: true } } },
          });

          if (!topic) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: Topic not found or unauthorized." }],
            };
          }

          const updated = await prisma.studyTopic.update({
            where: { id: topicId },
            data: { mastery },
          });

          return {
            content: [
              {
                type: "text",
                text: `💎 **Topic Mastery Updated**\n- **Aim:** ${topic.milestone.aim.title}\n- **Milestone:** ${topic.milestone.title}\n- **Topic:** ${updated.title}\n- **New Mastery Level:** \`${updated.mastery}\``,
              },
            ],
          };
        }

        if (action === "CREATE_AIM") {
          const { title, targetDate } = args;
          if (!title?.trim()) {
            return {
              isError: true,
              content: [{ type: "text", text: "Error: 'title' is required to create an Aim." }],
            };
          }

          const aim = await prisma.aim.create({
            data: {
              userId: user.id,
              title: title.trim(),
              targetDate: targetDate || null,
              status: "ACTIVE",
            },
          });

          return {
            content: [
              {
                type: "text",
                text: `🎯 **High-Stakes Aim Created**\n- **ID:** \`${aim.id}\`\n- **Title:** ${aim.title}\n- **Target Date:** ${aim.targetDate || "No target date"}`,
              },
            ],
          };
        }

        // Default: LIST_AIMS
        const aims = await prisma.aim.findMany({
          where: { userId: user.id },
          include: {
            milestones: {
              orderBy: { order: "asc" },
              include: {
                topics: { orderBy: { order: "asc" } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });

        if (aims.length === 0) {
          return {
            content: [{ type: "text", text: "ℹ️ No high-stakes aims configured yet in Everything." }],
          };
        }

        const aimLines = aims.map((aim) => {
          let totalTopics = 0;
          let mastered = 0;
          const milestoneLines = aim.milestones.map((m) => {
            const topicLines = m.topics.map((t) => {
              totalTopics++;
              if (t.mastery === "MASTERED") mastered++;
              const badge =
                t.mastery === "MASTERED"
                  ? "💎 MASTERED"
                  : t.mastery === "CONFIDENT"
                  ? "🟢 CONFIDENT"
                  : t.mastery === "IN_PROGRESS"
                  ? "🟡 IN_PROGRESS"
                  : "⚪ NOT_STARTED";
              return `    - [${badge}] \`${t.id}\` **${t.title}**`;
            });
            return `  * 📌 **Milestone:** ${m.title}\n${topicLines.join("\n")}`;
          });

          const pct = totalTopics > 0 ? Math.round((mastered / totalTopics) * 100) : 0;
          return `### 🎯 Aim: ${aim.title} (${pct}% Mastered)\n- **Target Date:** ${aim.targetDate || "None"}\n${milestoneLines.join("\n")}`;
        });

        return {
          content: [{ type: "text", text: `## 📚 High-Stakes Aims & Syllabus Matrix\n\n${aimLines.join("\n\n")}` }],
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

        const [sessions, aims] = await Promise.all([
          prisma.workSession.findMany({
            where: {
              userId: user.id,
              ...(dateFilter ? { date: dateFilter } : {}),
            },
            include: {
              topic: {
                include: {
                  milestone: {
                    include: {
                      aim: { select: { title: true } },
                    },
                  },
                },
              },
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          }),
          prisma.aim.findMany({
            where: { userId: user.id },
            include: {
              milestones: {
                include: {
                  topics: true,
                },
              },
            },
          }),
        ]);

        const studySessions = sessions.filter((s) => s.type === "STUDY");
        const totalStudyMinutes = studySessions.reduce((acc, s) => acc + s.durationMinutes, 0);

        // Calculate Average Focus Score and Efficiency
        const scoredSessions = studySessions.filter((s) => s.focusScore && s.focusScore > 0);
        const avgFocusScore =
          scoredSessions.length > 0
            ? (scoredSessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / scoredSessions.length).toFixed(1)
            : "5.0";

        const efficiencySessions = studySessions.filter((s) => s.efficiencyPercent && s.efficiencyPercent > 0);
        const avgEfficiency =
          efficiencySessions.length > 0
            ? Math.round(efficiencySessions.reduce((acc, s) => acc + (s.efficiencyPercent || 0), 0) / efficiencySessions.length)
            : null;

        // Cognitive Prime Window Calculation
        const windowCounts: Record<string, { mins: number; focusSum: number; count: number }> = {};
        for (const s of studySessions) {
          const winName = getWindowFromTime(s.startTime, s.createdAt);
          if (!windowCounts[winName]) {
            windowCounts[winName] = { mins: 0, focusSum: 0, count: 0 };
          }
          windowCounts[winName].mins += s.durationMinutes;
          windowCounts[winName].focusSum += s.focusScore || 5;
          windowCounts[winName].count += 1;
        }

        const sortedWindows = Object.entries(windowCounts).sort(
          (a, b) => b[1].mins * (b[1].focusSum / b[1].count) - a[1].mins * (a[1].focusSum / a[1].count)
        );
        const primeWindow = sortedWindows.length > 0 ? sortedWindows[0] : null;

        const formatDuration = (mins: number) => {
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          if (h === 0) return `${m}m`;
          if (m === 0) return `${h}h`;
          return `${h}h ${m}m`;
        };

        const earnedXP = Math.floor(totalStudyMinutes / 5);

        // Recent session lines with temporal and cognitive parameters
        const recentLines = studySessions.slice(0, 6).map((s) => {
          const effStr = s.efficiencyPercent ? ` [⚡ ${s.efficiencyPercent}% Eff]` : "";
          const flowStr = s.focusScore ? ` [⭐ Flow: ${s.focusScore}/5]` : "";
          const timeStr = s.startTime && s.endTime ? ` (${s.startTime} → ${s.endTime})` : "";
          const intentStr = s.intention ? `\n    - 🎯 *Target:* "${s.intention}"` : "";
          const reflectStr = s.reflection ? `\n    - 🧠 *Bottleneck:* "${s.reflection}"` : "";
          return `- **${s.project}** (${formatDuration(s.durationMinutes)})${timeStr}${effStr}${flowStr} on ${s.date}${intentStr}${reflectStr}`;
        });

        // Aims progress roll-up
        const aimSummaries = aims.map((aim) => {
          let total = 0;
          let mastered = 0;
          aim.milestones.forEach((m) => {
            m.topics.forEach((t) => {
              total++;
              if (t.mastery === "MASTERED") mastered++;
            });
          });
          const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
          return `- 🎯 **${aim.title}:** ${pct}% Mastered (${mastered}/${total} topics)`;
        });

        const summaryText = [
          `📊 **Study, Focus & Aim Telemetry • Everything**`,
          `👤 **Student:** ${user.name} | 📅 **Period:** ${headerLabel}`,
          ``,
          `### ⏱️ Core Focus & Efficiency Metrics`,
          `- **Total Study Time:** **${formatDuration(totalStudyMinutes)}** (${totalStudyMinutes} minutes)`,
          `- **Total Completed Sessions:** **${studySessions.length} sessions**`,
          `- **Average Focus Flow Rating:** ⭐ **${avgFocusScore}/5**`,
          ...(avgEfficiency ? [`- **Average Wall-Clock Efficiency:** **${avgEfficiency}%** (Pure Study vs Elapsed Time)`] : []),
          `- **Discipline XP Yield:** **+${earnedXP} XP** *(Feeds Companion & Rewards)*`,
          ...(primeWindow
            ? [
                `- **🔥 Biological Prime Cognitive Window:** **${primeWindow[0]}** (${formatDuration(primeWindow[1].mins)} logged, avg ${(primeWindow[1].focusSum / primeWindow[1].count).toFixed(1)}/5 flow)`,
              ]
            : []),
          ``,
          ...(aimSummaries.length > 0
            ? [`### 🎯 High-Stakes Aim Syllabi Mastery`, ...aimSummaries, ``]
            : []),
          ...(recentLines.length > 0
            ? [`### 🕒 Recent Sessions & Cognitive Intentions`, ...recentLines, ``]
            : []),
          `### 🧠 AI Coach Directives`,
          `- _Use this telemetry (Wall-clock efficiency, flow ratings, prime cognitive window, and syllabus bottlenecks) to provide actionable deliberate practice guidance, spaced repetition timing, and focus preservation strategies._`,
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
