import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { authenticateMcpRequest } from "@/lib/mcp/auth";

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
                    focusScore: true,
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

    // Compute progress stats for each aim
    const enrichedAims = aims.map((aim) => {
      let totalTopics = 0;
      let masteredTopics = 0;
      let confidentTopics = 0;
      let inProgressTopics = 0;
      let notStartedTopics = 0;
      let totalStudyMinutes = 0;

      const enrichedMilestones = aim.milestones.map((m) => {
        let mTotal = m.topics.length;
        let mMastered = 0;
        let mStudyMins = 0;

        const enrichedTopics = m.topics.map((t) => {
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

          const topicMins = t.sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
          totalStudyMinutes += topicMins;
          mStudyMins += topicMins;

          return {
            ...t,
            totalStudyMinutes: topicMins,
            sessionCount: t.sessions.length,
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

    return NextResponse.json({ aims: enrichedAims });
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
