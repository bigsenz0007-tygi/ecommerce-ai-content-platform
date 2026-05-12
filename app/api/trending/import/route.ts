import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseTrendingImportRaw, type TrendingImportRow } from "@/lib/trending-import-parse";
import { fetchUrlPageSignals } from "@/lib/trending-fetch";

export const dynamic = "force-dynamic";

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[^\s#]{1,24}/g) || [];
  return Array.from(new Set(matches)).slice(0, 10);
}

async function enrichImportedRows(rows: TrendingImportRow[]) {
  return Promise.all(
    rows.map(async (row) => {
      const needsFetch =
        !row.contentBody.trim() || row.title.startsWith("（链接导入）") || row.tags.length === 0;
      if (!needsFetch) return row;

      const sig = await fetchUrlPageSignals(row.url, 1500);
      const fetchedTitle = sig.ogTitle || sig.titleTag || "";
      const fetchedBody = sig.ogDescription || sig.plainPreview.slice(0, 180);
      const fallbackTags = extractHashtags(`${fetchedTitle} ${fetchedBody}`);

      return {
        ...row,
        title: fetchedTitle || row.title,
        contentBody: fetchedBody || row.contentBody,
        tags: row.tags.length > 0 ? row.tags : fallbackTags,
      };
    })
  );
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { raw?: string };
  const raw = typeof body.raw === "string" ? body.raw : "";
  const parsed = parseTrendingImportRaw(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const enrichedRows = await enrichImportedRows(parsed.rows);

  try {
    await prisma.trendingPick.createMany({
      data: enrichedRows.map((r) => ({
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
      skipDuplicates: true,
    });
  } catch {
    return NextResponse.json(
      { error: "当前未连接可用数据库，推荐库暂无法导入；页面展示与推荐已切到本地演示数据。" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, imported: enrichedRows.length });
}
