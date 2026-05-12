import type { BrowserContext, Page } from "playwright";
import type { WorkerExtractedItem, WorkerPlatform } from "../types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function openPage(context: BrowserContext, url: string) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await sleep(1500);
  return page;
}

export async function scrollAndCollectUrls(page: Page, pattern: RegExp, rounds: number) {
  const found = new Set<string>();
  for (let i = 0; i < rounds; i += 1) {
    const urls = await page.evaluate((patternSource) => {
      const regex = new RegExp(patternSource, "i");
      return Array.from(document.querySelectorAll("a[href]"))
        .map((el) => (el as HTMLAnchorElement).href)
        .filter((href) => regex.test(href));
    }, pattern.source);
    urls.forEach((url) => found.add(url));
    await page.mouse.wheel(0, 2000);
    await sleep(1200);
  }
  return [...found];
}

function parseMetric(raw: string) {
  const normalized = raw.replace(/,/g, "").trim().toLowerCase();
  if (!normalized) return 0;
  const match = normalized.match(/([\d.]+)\s*([万w]?)/);
  if (!match) return 0;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return 0;
  return Math.round(base * (match[2] ? 10_000 : 1));
}

function pickMetric(text: string, labels: string[]) {
  for (const label of labels) {
    const before = text.match(new RegExp(`${label}\\s*([\\d.万w,]+)`, "i"));
    if (before?.[1]) return parseMetric(before[1]);
    const after = text.match(new RegExp(`([\\d.万w,]+)\\s*${label}`, "i"));
    if (after?.[1]) return parseMetric(after[1]);
  }
  return 0;
}

function extractTags(text: string) {
  return Array.from(new Set(text.match(/#[^\s#]{1,24}/g) || [])).slice(0, 10);
}

export async function extractDetailItem(
  context: BrowserContext,
  platform: WorkerPlatform,
  url: string,
  crawlKeyword: string
): Promise<WorkerExtractedItem | null> {
  const page = await openPage(context, url);
  try {
    const extracted = await page.evaluate(() => {
      const meta = (name: string, attr: "property" | "name" = "property") =>
        document.querySelector(`meta[${attr}="${name}"]`)?.getAttribute("content")?.trim() || "";
      const title =
        meta("og:title") ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.title ||
        "";
      const description =
        meta("og:description") ||
        meta("description", "name") ||
        document.querySelector("article")?.textContent?.trim() ||
        document.body?.innerText?.trim() ||
        "";
      const author =
        document.querySelector('[data-e2e="user-info"]')?.textContent?.trim() ||
        document.querySelector('[class*="author"]')?.textContent?.trim() ||
        "";
      const imageUrls = Array.from(document.querySelectorAll("img[src]"))
        .map((el) => (el as HTMLImageElement).src)
        .filter((src) => /^https?:\/\//i.test(src));
      const videoUrl =
        (document.querySelector("video") as HTMLVideoElement | null)?.currentSrc ||
        (document.querySelector("video source") as HTMLSourceElement | null)?.src ||
        meta("og:video") ||
        "";
      const coverImageUrl = meta("og:image") || imageUrls[0] || "";
      const text = document.body?.innerText?.replace(/\s+/g, " ").trim() || "";
      return {
        title,
        description,
        author,
        imageUrls,
        videoUrl,
        coverImageUrl,
        text,
      };
    });

    const bodyText = extracted.description || extracted.text;
    if (!extracted.title && !bodyText) return null;

    return {
      platform,
      title: extracted.title || bodyText.slice(0, 40) || `${platform}内容`,
      contentBody: bodyText.slice(0, 5000),
      tags: extractTags(`${extracted.title} ${bodyText}`),
      likes: pickMetric(extracted.text, ["点赞", "赞"]),
      comments: pickMetric(extracted.text, ["评论"]),
      favorites: pickMetric(extracted.text, ["收藏"]),
      coverImageUrl: extracted.coverImageUrl,
      imageUrls: extracted.imageUrls.slice(0, 12),
      videoUrl: extracted.videoUrl,
      authorName: extracted.author,
      crawlKeyword,
      url,
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}
