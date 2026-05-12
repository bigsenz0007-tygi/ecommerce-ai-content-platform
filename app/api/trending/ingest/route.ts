import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CATEGORY_TRACK_NAMES, PLATFORM_CHOICES, type PlatformChoice } from "@/lib/content-taxonomy";

export const dynamic = "force-dynamic";

type IngestRow = {
  platform: PlatformChoice;
  category?: string;
  title: string;
  contentBody: string;
  tags?: string[];
  likes?: number;
  comments?: number;
  favorites?: number;
  coverImageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  authorName?: string;
  crawlKeyword?: string;
  url: string;
  aiCategory?: string;
  aiStyleSummary?: string;
  aiStructureSummary?: string;
  aiObjectiveHints?: string[];
  aiBenchmarkSummary?: string;
  importSource?: string;
};

const MIN_LIKES = 1000;
const MIN_FAVORITES = 50;
const MIN_COMMENTS = 100;

function authTokenFromRequest(req: Request): string {
  const bearer = req.headers.get("authorization") || "";
  if (bearer.startsWith("Bearer ")) return bearer.slice("Bearer ".length).trim();
  return req.headers.get("x-trending-ingest-token")?.trim() || "";
}

function normalizeCategory(...inputs: string[]) {
  for (const input of inputs) {
    const s = input.trim();
    if ((CATEGORY_TRACK_NAMES as readonly string[]).includes(s)) return s;
  }
  const text = inputs.join(" ").toLowerCase();
  const mappings: Array<{ category: string; keywords: string[] }> = [
    { category: "生活日常", keywords: ["生活", "日常", "独居", "vlog", "通勤", "routine", "收纳"] },
    { category: "美妆穿搭", keywords: ["美妆", "穿搭", "口红", "护肤", "试色", "ootd"] },
    { category: "美食探店", keywords: ["探店", "美食", "餐厅", "咖啡", "火锅", "烘焙", "小吃"] },
    { category: "知识干货", keywords: ["教程", "干货", "技巧", "复盘", "excel", "方法"] },
    { category: "情感文案", keywords: ["情感", "共鸣", "治愈", "文案", "关系", "情绪"] },
    { category: "好物种草", keywords: ["种草", "好物", "测评", "开箱", "神器", "性价比"] },
    { category: "娱乐剧情", keywords: ["剧情", "娱乐", "反转", "搞笑", "段子"] },
    { category: "职场创业", keywords: ["职场", "创业", "面试", "副业", "简历", "工作"] },
  ];
  const hit = mappings.find((item) => item.keywords.some((keyword) => text.includes(keyword)));
  return hit?.category || "生活日常";
}

function normalizeTags(tags: string[] | undefined) {
  return Array.from(
    new Set(
      (tags || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 20)
    )
  );
}

function shouldSyncToLibrary(row: Pick<IngestRow, "likes" | "favorites" | "comments">) {
  return (
    Number(row.likes || 0) > MIN_LIKES &&
    Number(row.favorites || 0) > MIN_FAVORITES &&
    Number(row.comments || 0) > MIN_COMMENTS
  );
}

export async function POST(req: Request) {
  const expectedToken = process.env.TRENDING_INGEST_TOKEN?.trim() || "";
  if (!expectedToken) {
    return NextResponse.json(
      { error: "服务端未配置 TRENDING_INGEST_TOKEN，暂无法接收自动采集入库。" },
      { status: 503 }
    );
  }

  const providedToken = authTokenFromRequest(req);
  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: "未授权的采集入库请求" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { items?: IngestRow[] };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "items 不能为空" }, { status: 400 });
  }

  for (const item of items) {
    if (!(PLATFORM_CHOICES as readonly string[]).includes(item.platform)) {
      return NextResponse.json({ error: `平台无效：${item.platform}` }, { status: 400 });
    }
    if (!item.title?.trim() || !item.url?.trim()) {
      return NextResponse.json({ error: "每条内容必须包含 title 和 url" }, { status: 400 });
    }
  }

  try {
    let stored = 0;
    let synced = 0;

    for (const item of items) {
      const tags = normalizeTags(item.tags);
      const category = normalizeCategory(item.aiCategory || "", item.category || "", item.title, item.contentBody);
      const syncToLibrary = shouldSyncToLibrary(item);

      await prisma.trendingSourceItem.upsert({
        where: { url: item.url },
        update: {
          platform: item.platform,
          category: item.category?.trim() || category,
          title: item.title.trim(),
          contentBody: item.contentBody.trim(),
          tagsJson: JSON.stringify(tags),
          likes: Math.max(0, Number(item.likes || 0)),
          comments: Math.max(0, Number(item.comments || 0)),
          favorites: Math.max(0, Number(item.favorites || 0)),
          coverImageUrl: item.coverImageUrl?.trim() || "",
          imageUrlsJson: JSON.stringify((item.imageUrls || []).map((v) => String(v).trim()).filter(Boolean).slice(0, 20)),
          videoUrl: item.videoUrl?.trim() || "",
          authorName: item.authorName?.trim() || "",
          crawlKeyword: item.crawlKeyword?.trim() || "",
          aiCategory: category,
          aiStyleSummary: item.aiStyleSummary?.trim() || "",
          aiStructureSummary: item.aiStructureSummary?.trim() || "",
          aiObjectiveJson: JSON.stringify((item.aiObjectiveHints || []).map((v) => String(v).trim()).filter(Boolean).slice(0, 5)),
          aiBenchmarkSummary: item.aiBenchmarkSummary?.trim() || "",
          importSource: item.importSource?.trim() || "worker",
          syncedToLibrary: syncToLibrary,
        },
        create: {
          platform: item.platform,
          category: item.category?.trim() || category,
          title: item.title.trim(),
          contentBody: item.contentBody.trim(),
          tagsJson: JSON.stringify(tags),
          likes: Math.max(0, Number(item.likes || 0)),
          comments: Math.max(0, Number(item.comments || 0)),
          favorites: Math.max(0, Number(item.favorites || 0)),
          coverImageUrl: item.coverImageUrl?.trim() || "",
          imageUrlsJson: JSON.stringify((item.imageUrls || []).map((v) => String(v).trim()).filter(Boolean).slice(0, 20)),
          videoUrl: item.videoUrl?.trim() || "",
          authorName: item.authorName?.trim() || "",
          crawlKeyword: item.crawlKeyword?.trim() || "",
          url: item.url.trim(),
          aiCategory: category,
          aiStyleSummary: item.aiStyleSummary?.trim() || "",
          aiStructureSummary: item.aiStructureSummary?.trim() || "",
          aiObjectiveJson: JSON.stringify((item.aiObjectiveHints || []).map((v) => String(v).trim()).filter(Boolean).slice(0, 5)),
          aiBenchmarkSummary: item.aiBenchmarkSummary?.trim() || "",
          importSource: item.importSource?.trim() || "worker",
          syncedToLibrary: syncToLibrary,
        },
      });
      stored += 1;

      if (syncToLibrary) {
        await prisma.trendingPick.upsert({
          where: { url: item.url.trim() },
          update: {
            platform: item.platform,
            category,
            title: item.title.trim(),
            contentBody: item.contentBody.trim(),
            tagsJson: JSON.stringify(tags),
            likes: Math.max(0, Number(item.likes || 0)),
            comments: Math.max(0, Number(item.comments || 0)),
            favorites: Math.max(0, Number(item.favorites || 0)),
          },
          create: {
            platform: item.platform,
            category,
            title: item.title.trim(),
            contentBody: item.contentBody.trim(),
            tagsJson: JSON.stringify(tags),
            likes: Math.max(0, Number(item.likes || 0)),
            comments: Math.max(0, Number(item.comments || 0)),
            favorites: Math.max(0, Number(item.favorites || 0)),
            url: item.url.trim(),
          },
        });
        synced += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      stored,
      syncedToLibrary: synced,
      thresholds: {
        likes: MIN_LIKES,
        favorites: MIN_FAVORITES,
        comments: MIN_COMMENTS,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "自动采集入库失败，请检查数据库配置与表结构。" }, { status: 500 });
  }
}
