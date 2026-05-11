import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";
import { parseTrendingImportRaw } from "@/lib/trending-import-parse";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后在策略配置页导入推荐库");

  const body = (await req.json().catch(() => ({}))) as { raw?: string };
  const raw = typeof body.raw === "string" ? body.raw : "";
  const parsed = parseTrendingImportRaw(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await prisma.trendingPick.createMany({
    data: parsed.rows.map((r) => ({
      platform: r.platform,
      category: r.category,
      title: r.title,
      contentBody: r.contentBody,
      tagsJson: JSON.stringify(r.tags),
      likes: r.likes,
      comments: r.comments,
      favorites: r.favorites,
      url: r.url,
    })),
  });

  return NextResponse.json({ ok: true, imported: parsed.rows.length });
}
