import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";
import {
  CATEGORY_TRACK_NAMES,
  CONTENT_FORMATS,
  CONTENT_GOALS,
  CONTENT_STYLES,
  PLATFORM_CHOICES,
} from "@/lib/content-taxonomy";

export async function GET() {
  await ensureSeedData();
  const platformOrder = ["小红书", "抖音"];

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { platform: { in: platformOrder } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { name: { in: [...CATEGORY_TRACK_NAMES] } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const platforms = platformOrder.filter((p) => accounts.some((a) => a.platform === p));
  const categoryMap = new Map(categories.map((c) => [c.name, c]));
  const orderedCategories = CATEGORY_TRACK_NAMES.map((name) => categoryMap.get(name)).filter(
    (x): x is NonNullable<typeof x> => Boolean(x)
  );

  return NextResponse.json({
    accounts,
    categories: orderedCategories,
    platforms,
    platformChoices: [...PLATFORM_CHOICES],
    objectives: [...CONTENT_GOALS],
    formats: [...CONTENT_FORMATS],
    contentStyles: [...CONTENT_STYLES],
  });
}
