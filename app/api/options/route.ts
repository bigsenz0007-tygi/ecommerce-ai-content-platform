import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";

export async function GET() {
  await ensureSeedData();
  const platformOrder = ["淘宝", "京东", "小红书", "抖音"];
  const categoryOrder = ["美妆个护", "宠物生活", "美食点心", "恋爱生活", "ai创造"];

  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({
      where: { name: { in: categoryOrder } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const platforms = platformOrder.filter((p) => accounts.some((a) => a.platform === p));
  const categoryMap = new Map(categories.map((c) => [c.name, c]));
  const orderedCategories = categoryOrder
    .map((name) => categoryMap.get(name))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return NextResponse.json({
    accounts,
    categories: orderedCategories,
    platforms,
    objectives: ["涨粉", "互动", "关注", "分享"],
    formats: ["图文", "视频文字", "纯文字"],
  });
}
