import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSeedData } from "@/lib/pipeline";
import { TRENDING_MAX_CARDS, TRENDING_MIN_LIBRARY_COUNT } from "@/lib/trending-constants";
import { PLATFORM_CHOICES } from "@/lib/content-taxonomy";

export const dynamic = "force-dynamic";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform")?.trim() || "";
  const categoryId = searchParams.get("categoryId")?.trim() || "";

  if (!platform || !categoryId) {
    return NextResponse.json({ error: "请传入 platform 与 categoryId（内容赛道）" }, { status: 400 });
  }
  if (!(PLATFORM_CHOICES as readonly string[]).includes(platform)) {
    return NextResponse.json({ error: "平台仅支持小红书或抖音" }, { status: 400 });
  }

  await ensureSeedData();

  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) {
    return NextResponse.json({ error: "内容赛道不存在，请刷新页面后重选" }, { status: 400 });
  }
  const trackName = cat.name;

  const total = await prisma.trendingPick.count({
    where: { platform, category: trackName },
  });

  if (total < TRENDING_MIN_LIBRARY_COUNT) {
    return NextResponse.json({
      empty: true,
      total,
      minRequired: TRENDING_MIN_LIBRARY_COUNT,
      trackName,
      items: [] as unknown[],
      message: `「${platform}」+「${trackName}」下推荐库仅 ${total} 条，不足 ${TRENDING_MIN_LIBRARY_COUNT} 条，请至「策略配置」导入更多素材后再试。`,
    });
  }

  const all = await prisma.trendingPick.findMany({
    where: { platform, category: trackName },
  });
  const picked = shuffle(all).slice(0, TRENDING_MAX_CARDS);

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

  return NextResponse.json({ empty: false, total, trackName, items });
}
