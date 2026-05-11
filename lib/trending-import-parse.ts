import { isAllowedBenchmarkUrl } from "@/lib/benchmark-link";
import { CATEGORY_TRACK_NAMES, PLATFORM_CHOICES } from "@/lib/content-taxonomy";

export type TrendingImportRow = {
  platform: (typeof PLATFORM_CHOICES)[number];
  category: string;
  title: string;
  contentBody: string;
  tags: string[];
  likes: number;
  comments: number;
  favorites: number;
  url: string;
};

function inferPlatformFromUrl(url: string): (typeof PLATFORM_CHOICES)[number] | null {
  try {
    const h = new URL(url.trim()).hostname.toLowerCase();
    if (h.includes("xiaohongshu.com") || h.includes("xhslink.com") || h.includes("xhs.cn")) return "小红书";
    if (h.includes("douyin.com") || h.includes("iesdouyin.com") || h.includes("amemv.com")) return "抖音";
  } catch {
    /* ignore */
  }
  return null;
}

function parseTags(raw: string): string[] {
  const s = raw.trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const j = JSON.parse(s) as unknown;
      if (Array.isArray(j)) return j.map(String).filter(Boolean).slice(0, 20);
    } catch {
      /* fallthrough */
    }
  }
  return s
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseNum(s: string, def = 0): number {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
}

function isPlatform(s: string): s is (typeof PLATFORM_CHOICES)[number] {
  return (PLATFORM_CHOICES as readonly string[]).includes(s);
}

function isValidTrack(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  return (CATEGORY_TRACK_NAMES as readonly string[]).includes(t as (typeof CATEGORY_TRACK_NAMES)[number]);
}

/**
 * 支持：
 * 1）TSV（从 Excel 复制）：平台\t内容赛道\t标题\t正文\t标签\t点赞\t评论\t收藏\t链接（共 9 列）
 * 2）纯链接行：每行一个 http(s) 小红书/抖音链接（赛道默认「生活日常」）
 */
export function parseTrendingImportRaw(raw: string): { ok: true; rows: TrendingImportRow[] } | { ok: false; error: string } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "内容为空" };

  const rows: TrendingImportRow[] = [];
  let lineNo = 0;
  for (const line of lines) {
    lineNo += 1;
    if (!line.includes("\t")) {
      if (isAllowedBenchmarkUrl(line)) {
        const pf = inferPlatformFromUrl(line);
        if (!pf) {
          return { ok: false, error: `第 ${lineNo} 行：无法从链接识别平台` };
        }
        rows.push({
          platform: pf,
          category: "生活日常",
          title: `（链接导入）${new URL(line).hostname}`,
          contentBody: "",
          tags: [],
          likes: 0,
          comments: 0,
          favorites: 0,
          url: line.trim(),
        });
        continue;
      }
      return { ok: false, error: `第 ${lineNo} 行：需为 TSV（制表符分隔）或有效分享链接` };
    }

    const cols = line.split("\t");
    if (cols.length < 9) {
      return {
        ok: false,
        error: `第 ${lineNo} 行：TSV 至少需要 9 列（平台、内容赛道、标题、正文、标签、点赞、评论、收藏、链接）`,
      };
    }
    const [p, track, title, body, tagsRaw, lk, cm, fav, url] = cols.map((c) => c.trim());
    if (!isPlatform(p)) return { ok: false, error: `第 ${lineNo} 行：平台须为「小红书」或「抖音」` };
    if (!isValidTrack(track)) {
      return {
        ok: false,
        error: `第 ${lineNo} 行：内容赛道须为 PRD 八类之一：${CATEGORY_TRACK_NAMES.join("、")}`,
      };
    }
    if (!url || !isAllowedBenchmarkUrl(url)) {
      return { ok: false, error: `第 ${lineNo} 行：链接须为小红书或抖音域名` };
    }
    rows.push({
      platform: p,
      category: track,
      title: title || "未命名标题",
      contentBody: body || "",
      tags: parseTags(tagsRaw),
      likes: parseNum(lk),
      comments: parseNum(cm),
      favorites: parseNum(fav),
      url: url.trim(),
    });
  }

  if (rows.length === 0) return { ok: false, error: "未解析到有效行" };
  return { ok: true, rows };
}
