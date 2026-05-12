import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";

const FALLBACK_SETTINGS = {
  dailyCount: 10,
  premiumSlots: 2,
  scheduleHour: 9,
  bannedWords: ["最", "第一", "国家级"],
  maxConcurrentTask: 20,
  maxPublishPerHour: 30,
  minScoreForPublish: 70,
  autoDeleteRejected: true,
  complianceLevel: "strict",
};

export async function GET() {
  try {
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
  } catch {
    return NextResponse.json({ ...FALLBACK_SETTINGS, fallback: true });
  }
}

export async function PUT(request: Request) {
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

  try {
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
  } catch {
    return NextResponse.json({
      dailyCount: body.dailyCount ?? FALLBACK_SETTINGS.dailyCount,
      premiumSlots: body.premiumSlots ?? FALLBACK_SETTINGS.premiumSlots,
      scheduleHour: body.scheduleHour ?? FALLBACK_SETTINGS.scheduleHour,
      bannedWords: body.bannedWords ?? FALLBACK_SETTINGS.bannedWords,
      maxConcurrentTask: body.maxConcurrentTask ?? FALLBACK_SETTINGS.maxConcurrentTask,
      maxPublishPerHour: body.maxPublishPerHour ?? FALLBACK_SETTINGS.maxPublishPerHour,
      minScoreForPublish: body.minScoreForPublish ?? FALLBACK_SETTINGS.minScoreForPublish,
      autoDeleteRejected: body.autoDeleteRejected ?? FALLBACK_SETTINGS.autoDeleteRejected,
      complianceLevel: body.complianceLevel ?? FALLBACK_SETTINGS.complianceLevel,
      fallback: true,
    });
  }
}
