import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";

export async function GET() {
  await ensureSeedData();
  const s = await prisma.appSettings.findUniqueOrThrow({ where: { id: "singleton" } });
  return NextResponse.json({
    dailyCount: s.dailyCount,
    premiumSlots: s.premiumSlots,
    scheduleHour: s.scheduleHour,
    bannedWords: JSON.parse(s.bannedWords || "[]") as string[],
    maxConcurrentTask: s.maxConcurrentTask,
    maxPublishPerHour: s.maxPublishPerHour,
    minScoreForPublish: s.minScoreForPublish,
    autoDeleteRejected: s.autoDeleteRejected,
    complianceLevel: s.complianceLevel,
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后保存策略配置");
  const body = (await request.json()) as {
    dailyCount?: number;
    premiumSlots?: number;
    scheduleHour?: number;
    bannedWords?: string[];
    maxConcurrentTask?: number;
    maxPublishPerHour?: number;
    minScoreForPublish?: number;
    autoDeleteRejected?: boolean;
    complianceLevel?: string;
  };

  await ensureSeedData();

  const s = await prisma.appSettings.update({
    where: { id: "singleton" },
    data: {
      ...(body.dailyCount != null ? { dailyCount: body.dailyCount } : {}),
      ...(body.premiumSlots != null ? { premiumSlots: body.premiumSlots } : {}),
      ...(body.scheduleHour != null ? { scheduleHour: body.scheduleHour } : {}),
      ...(body.bannedWords != null
        ? { bannedWords: JSON.stringify(body.bannedWords) }
        : {}),
      ...(body.maxConcurrentTask != null ? { maxConcurrentTask: body.maxConcurrentTask } : {}),
      ...(body.maxPublishPerHour != null ? { maxPublishPerHour: body.maxPublishPerHour } : {}),
      ...(body.minScoreForPublish != null ? { minScoreForPublish: body.minScoreForPublish } : {}),
      ...(body.autoDeleteRejected != null ? { autoDeleteRejected: body.autoDeleteRejected } : {}),
      ...(body.complianceLevel != null ? { complianceLevel: body.complianceLevel } : {}),
    },
  });

  return NextResponse.json({
    dailyCount: s.dailyCount,
    premiumSlots: s.premiumSlots,
    scheduleHour: s.scheduleHour,
    bannedWords: JSON.parse(s.bannedWords || "[]") as string[],
    maxConcurrentTask: s.maxConcurrentTask,
    maxPublishPerHour: s.maxPublishPerHour,
    minScoreForPublish: s.minScoreForPublish,
    autoDeleteRejected: s.autoDeleteRejected,
    complianceLevel: s.complianceLevel,
  });
}
