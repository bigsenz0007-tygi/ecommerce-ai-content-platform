import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";
import { TRENDING_MAX_CARDS, TRENDING_MIN_LIBRARY_COUNT } from "@/lib/trending-constants";
import { CATEGORY_TRACK_NAMES, PLATFORM_CHOICES } from "@/lib/content-taxonomy";
import { DEFAULT_TRENDING_PICKS } from "@/lib/trending-default-seeds";

export const dynamic = "force-dynamic";

function calcScore(row: {
  likes: number;
  comments: number;
  favorites: number;
  tagsJson: string;
  title: string;
  contentBody: string;
}) {
  let tagCount = 0;
  try {
    const tags = JSON.parse(row.tagsJson || "[]") as unknown;
    if (Array.isArray(tags)) tagCount = tags.length;
  } catch {
    tagCount = 0;
  }
  return (
    row.likes * 1 +
    row.comments * 4 +
    row.favorites * 2 +
    Math.min(tagCount, 5) * 50 +
    Math.min(row.title.length, 30) * 3 +
    Math.min(row.contentBody.length, 120) * 0.5
  );
}

function pickRecommended<T extends { category: string; likes: number; comments: number; favorites: number; tagsJson: string; title: string; contentBody: string }>(
  rows: T[],
  maxCount: number
) {
  const sorted = [...rows].sort((a, b) => calcScore(b) - calcScore(a));
  const picked: T[] = [];
  const perCategory = new Map<string, number>();

  for (const row of sorted) {
    const used = perCategory.get(row.category) || 0;
    if (used >= 2) continue;
    picked.push(row);
    perCategory.set(row.category, used + 1);
    if (picked.length >= maxCount) return picked;
  }

  for (const row of sorted) {
    if (picked.includes(row)) continue;
    picked.push(row);
    if (picked.length >= maxCount) return picked;
  }

  return picked;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform")?.trim() || "";
  const categoryId = searchParams.get("categoryId")?.trim() || "";

  if (!platform || !categoryId) {
    return NextResponse.json({ error: "请传入 platform 与 categoryId" }, { status: 400 });
  }
  if (!(PLATFORM_CHOICES as readonly string[]).includes(platform)) {
    return NextResponse.json({ error: "平台仅支持小红书或抖音" }, { status: 400 });
  }
  const fallbackCategoryName = (CATEGORY_TRACK_NAMES as readonly string[]).includes(categoryId)
    ? categoryId
    : "";

  try {
    await ensureSeedData();

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });
    const categoryName = category?.name || fallbackCategoryName;
    if (!categoryName || !(CATEGORY_TRACK_NAMES as readonly string[]).includes(categoryName)) {
      return NextResponse.json({ error: "内容赛道无效" }, { status: 400 });
    }

    const total = await prisma.trendingPick.count({
      where: { platform, category: categoryName },
    });

    if (total < TRENDING_MIN_LIBRARY_COUNT) {
      return NextResponse.json({
        empty: true,
        total,
        minRequired: TRENDING_MIN_LIBRARY_COUNT,
        category: categoryName,
        items: [] as unknown[],
        message: "内容待更新",
      });
    }

    const all = await prisma.trendingPick.findMany({
      where: { platform, category: categoryName },
    });
    const picked = pickRecommended(all, TRENDING_MAX_CARDS);

    const items = picked.map((row) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tagsJson || "[]") as string[];
        if (!Array.isArray(tags)) tags = [];
      } catch {
        tags = [];
      }
      return {
        id: row.id,
        platform: row.platform,
        category: row.category,
        title: row.title,
        contentBody: row.contentBody,
        tags,
        likes: row.likes,
        comments: row.comments,
        favorites: row.favorites,
        url: row.url,
      };
    });

    return NextResponse.json({ empty: false, total, category: categoryName, items });
  } catch {
    const categoryName = fallbackCategoryName;
    if (!categoryName) {
      return NextResponse.json({ error: "内容赛道无效" }, { status: 400 });
    }
    const all = DEFAULT_TRENDING_PICKS.filter((row) => row.platform === platform && row.category === categoryName);
    const total = all.length;
    if (total < TRENDING_MIN_LIBRARY_COUNT) {
      return NextResponse.json({
        empty: true,
        total,
        minRequired: TRENDING_MIN_LIBRARY_COUNT,
        category: categoryName,
        items: [] as unknown[],
        message: "内容待更新",
        fallback: true,
      });
    }
    const picked = pickRecommended(
      all.map((row, index) => ({
        ...row,
        id: `fallback-${platform}-${categoryName}-${index}`,
      })),
      TRENDING_MAX_CARDS
    );
    return NextResponse.json({
      empty: false,
      total,
      category: categoryName,
      items: picked.map((row) => ({
        id: row.id,
        platform: row.platform,
        category: row.category,
        title: row.title,
        contentBody: row.contentBody,
        tags: JSON.parse(row.tagsJson || "[]") as string[],
        likes: row.likes,
        comments: row.comments,
        favorites: row.favorites,
        url: row.url,
      })),
      fallback: true,
    });
  }
}
