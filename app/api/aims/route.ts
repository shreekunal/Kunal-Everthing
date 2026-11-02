import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { format } from "date-fns";

export async function GET(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const aims = await prisma.aim.findMany({
      where: { userId: user.id },
      include: {
        milestones: {
          orderBy: { order: "asc" },
          include: {
            topics: {
              orderBy: { order: "asc" },
              include: {
                sessions: {
                  select: {
                    id: true,
                    durationMinutes: true,
                    date: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Compute progress stats for each aim & track decaying topics for spaced repetition
    const decayingTopicsList: Array<{
      aimId: string;
      aimTitle: string;
      milestoneId: string;
      milestoneTitle: string;
      topicId: string;
      topicTitle: string;
      mastery: string;
      lastStudiedDate: string | null;
      daysSinceLastStudied: number;
    }> = [];

    const enrichedAims = aims.map((aim: any) => {
      let totalTopics = 0;
      let masteredTopics = 0;
      let confidentTopics = 0;
      let inProgressTopics = 0;
      let notStartedTopics = 0;
      let totalStudyMinutes = 0;

      const enrichedMilestones = (aim.milestones || []).map((m: any) => {
        const mTopics = m.topics || [];
        let mTotal = mTopics.length;
        let mMastered = 0;
        let mStudyMins = 0;

        const enrichedTopics = mTopics.map((t: any) => {
          totalTopics++;
          if (t.mastery === "MASTERED") {
            masteredTopics++;
            mMastered++;
          } else if (t.mastery === "CONFIDENT") {
            confidentTopics++;
          } else if (t.mastery === "IN_PROGRESS") {
            inProgressTopics++;
          } else {
            notStartedTopics++;
          }

          const sessions = t.sessions || [];
          const topicMins = sessions.reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0);
          totalStudyMinutes += topicMins;
          mStudyMins += topicMins;

          // Spaced Repetition Knowledge Decay calculation
          const sortedSessionDates = sessions
            .map((s: any) => s.date)
            .filter(Boolean)
            .sort()
            .reverse();
          const lastStudiedDate = sortedSessionDates[0] || (t.updatedAt ? format(new Date(t.updatedAt), "yyyy-MM-dd") : null);
          const daysSinceLastStudied = lastStudiedDate
            ? Math.max(0, Math.floor((Date.now() - new Date(lastStudiedDate).getTime()) / 86400000))
            : null;
          
          // Topic is decaying if it was started/in progress/mastered but has not been touched in 7+ days
          const isDecaying = (t.mastery !== "NOT_STARTED") && (daysSinceLastStudied === null || daysSinceLastStudied >= 7);

          if (isDecaying) {
            decayingTopicsList.push({
              aimId: aim.id,
              aimTitle: aim.title,
              milestoneId: m.id,
              milestoneTitle: m.title,
              topicId: t.id,
              topicTitle: t.title,
              mastery: t.mastery,
              lastStudiedDate,
              daysSinceLastStudied: daysSinceLastStudied ?? 14,
            });
          }

          return {
            ...t,
            totalStudyMinutes: topicMins,
            sessionCount: sessions.length,
            lastStudiedDate,
            daysSinceLastStudied,
            isDecaying,
          };
        });

        return {
          ...m,
          topics: enrichedTopics,
          totalTopics: mTotal,
          masteredTopics: mMastered,
          completionPercent: mTotal > 0 ? Math.round((mMastered / mTotal) * 100) : 0,
          studyMinutes: mStudyMins,
        };
      });

      // Calculate weighted mastery score: MASTERED (100%), CONFIDENT (66%), IN_PROGRESS (33%)
      const weightedScore =
        totalTopics > 0
          ? Math.round(
              ((masteredTopics * 1.0 + confidentTopics * 0.66 + inProgressTopics * 0.33) /
                totalTopics) *
                100
            )
          : 0;

      return {
        ...aim,
        milestones: enrichedMilestones,
        stats: {
          totalTopics,
          masteredTopics,
          confidentTopics,
          inProgressTopics,
          notStartedTopics,
          masteryPercent: weightedScore,
          fullyMasteredPercent: totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0,
          totalStudyMinutes,
        },
      };
    });

    return NextResponse.json({ aims: enrichedAims, decayingTopics: decayingTopicsList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "CREATE_MILESTONE") {
      const { aimId, title, order } = body;
      if (!aimId || !title?.trim()) {
        return NextResponse.json({ error: "Aim ID and title required" }, { status: 400 });
      }

      const aim = await prisma.aim.findFirst({
        where: { id: aimId, userId: user.id },
      });
      if (!aim) {
        return NextResponse.json({ error: "Aim not found" }, { status: 404 });
      }

      const count = await prisma.milestone.count({ where: { aimId } });
      const milestone = await prisma.milestone.create({
        data: {
          aimId,
          title: title.trim(),
          order: order !== undefined ? order : count,
        },
      });
      return NextResponse.json({ milestone }, { status: 201 });
    }

    if (action === "CREATE_TOPIC") {
      const { milestoneId, title, mastery, notes } = body;
      if (!milestoneId || !title?.trim()) {
        return NextResponse.json({ error: "Milestone ID and title required" }, { status: 400 });
      }

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, aim: { userId: user.id } },
      });
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      const count = await prisma.studyTopic.count({ where: { milestoneId } });
      const topic = await prisma.studyTopic.create({
        data: {
          milestoneId,
          title: title.trim(),
          mastery: mastery || "NOT_STARTED",
          order: count,
          notes: notes || null,
        },
      });
      return NextResponse.json({ topic }, { status: 201 });
    }

    if (action === "CREATE_TOPICS_BATCH") {
      const { milestoneId, titles } = body;
      if (!milestoneId || !Array.isArray(titles) || titles.length === 0) {
        return NextResponse.json({ error: "Milestone ID and titles array required" }, { status: 400 });
      }

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, aim: { userId: user.id } },
      });
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      const startCount = await prisma.studyTopic.count({ where: { milestoneId } });
      const created = await prisma.studyTopic.createMany({
        data: titles.map((t: string, idx: number) => ({
          milestoneId,
          title: String(t).trim(),
          mastery: "NOT_STARTED",
          order: startCount + idx,
        })),
      });

      return NextResponse.json({ success: true, count: created.count }, { status: 201 });
    }

    if (action === "CREATE_MILESTONE_WITH_RANGE") {
      const { aimId, milestoneTitle, titles } = body;
      if (!aimId || !Array.isArray(titles) || titles.length === 0) {
        return NextResponse.json({ error: "Aim ID and titles array required" }, { status: 400 });
      }

      const aim = await prisma.aim.findFirst({
        where: { id: aimId, userId: user.id },
      });
      if (!aim) {
        return NextResponse.json({ error: "Aim not found" }, { status: 404 });
      }

      const mCount = await prisma.milestone.count({ where: { aimId } });
      const milestone = await prisma.milestone.create({
        data: {
          aimId,
          title: (milestoneTitle || "Lectures").trim(),
          order: mCount,
          topics: {
            create: titles.map((t: string, idx: number) => ({
              title: String(t).trim(),
              mastery: "NOT_STARTED",
              order: idx,
            })),
          },
        },
        include: {
          topics: true,
        },
      });

      return NextResponse.json({ success: true, milestone }, { status: 201 });
    }

    // Default action: Create whole Aim (with optional nested milestones & topics)
    const { title, description, targetDate, milestones } = body;
    if (!title?.trim()) {
      return NextResponse.json({ error: "Aim title is required" }, { status: 400 });
    }

    const aim = await prisma.aim.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        targetDate: targetDate || null,
        status: "ACTIVE",
        milestones: Array.isArray(milestones) && milestones.length > 0
          ? {
              create: milestones.map((m: any, mIdx: number) => ({
                title: m.title?.trim() || `Milestone ${mIdx + 1}`,
                order: mIdx,
                topics: Array.isArray(m.topics) && m.topics.length > 0
                  ? {
                      create: m.topics.map((t: any, tIdx: number) => ({
                        title: typeof t === "string" ? t.trim() : t.title?.trim() || `Topic ${tIdx + 1}`,
                        mastery: t.mastery || "NOT_STARTED",
                        order: tIdx,
                        notes: t.notes || null,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        milestones: {
          include: {
            topics: true,
          },
        },
      },
    });

    return NextResponse.json({ aim }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "UPDATE_TOPIC_MASTERY") {
      const { topicId, mastery, notes } = body;
      if (!topicId || !mastery) {
        return NextResponse.json({ error: "Topic ID and mastery required" }, { status: 400 });
      }

      // Verify user ownership
      const topic = await prisma.studyTopic.findFirst({
        where: { id: topicId, milestone: { aim: { userId: user.id } } },
      });
      if (!topic) {
        return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      }

      const updatedTopic = await prisma.studyTopic.update({
        where: { id: topicId },
        data: {
          mastery,
          ...(notes !== undefined ? { notes } : {}),
        },
      });

      return NextResponse.json({ topic: updatedTopic });
    }

    if (action === "UPDATE_AIM") {
      const { aimId, title, description, targetDate, status } = body;
      if (!aimId) {
        return NextResponse.json({ error: "Aim ID required" }, { status: 400 });
      }

      const aim = await prisma.aim.findFirst({
        where: { id: aimId, userId: user.id },
      });
      if (!aim) {
        return NextResponse.json({ error: "Aim not found" }, { status: 404 });
      }

      const updatedAim = await prisma.aim.update({
        where: { id: aimId },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(description !== undefined ? { description: description?.trim() || null } : {}),
          ...(targetDate !== undefined ? { targetDate: targetDate || null } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });

      return NextResponse.json({ aim: updatedAim });
    }

    if (action === "UPDATE_MILESTONE") {
      const { milestoneId, title, order } = body;
      if (!milestoneId || !title?.trim()) {
        return NextResponse.json({ error: "Milestone ID and title required" }, { status: 400 });
      }

      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, aim: { userId: user.id } },
      });
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }

      const updatedMilestone = await prisma.milestone.update({
        where: { id: milestoneId },
        data: {
          title: title.trim(),
          ...(order !== undefined ? { order } : {}),
        },
      });

      return NextResponse.json({ milestone: updatedMilestone });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let user = await getCurrentUser();
    if (!user) {
      const auth = await authenticateMcpRequest(request);
      if (auth.authenticated && auth.user) {
        user = auth.user;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const aimId = searchParams.get("aimId");
    const milestoneId = searchParams.get("milestoneId");
    const topicId = searchParams.get("topicId");

    if (topicId) {
      const topic = await prisma.studyTopic.findFirst({
        where: { id: topicId, milestone: { aim: { userId: user.id } } },
      });
      if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
      await prisma.studyTopic.delete({ where: { id: topicId } });
      return NextResponse.json({ success: true, deletedTopicId: topicId });
    }

    if (milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { id: milestoneId, aim: { userId: user.id } },
      });
      if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      await prisma.milestone.delete({ where: { id: milestoneId } });
      return NextResponse.json({ success: true, deletedMilestoneId: milestoneId });
    }

    if (aimId) {
      const aim = await prisma.aim.findFirst({
        where: { id: aimId, userId: user.id },
      });
      if (!aim) return NextResponse.json({ error: "Aim not found" }, { status: 404 });
      await prisma.aim.delete({ where: { id: aimId } });
      return NextResponse.json({ success: true, deletedAimId: aimId });
    }

    return NextResponse.json({ error: "Must provide aimId, milestoneId, or topicId" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
