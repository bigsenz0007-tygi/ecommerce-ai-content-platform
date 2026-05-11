/**
 * 对标链接轻量抓取：单次请求 HTML，解析 OG + 去标签纯文本。
 * 小红书 / 抖音 常返回登录页或空壳，失败时回落到种子库文案（由调用方处理）。
 */

import { extractOpenGraphFromHtml } from "./og-parse";

const MAX_HTML = 180_000;

export type PageSignals = {
  ok: boolean;
  status?: number;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  titleTag?: string;
  /** 去标签后的正文前段，供模型理解 */
  plainPreview: string;
};

function htmlToPlain(html: string, maxChars: number): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, maxChars);
}

export async function fetchUrlPageSignals(url: string, maxPlain = 6000): Promise<PageSignals> {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) {
      return { ok: false, plainPreview: "" };
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(t);
    const html = (await res.text()).slice(0, MAX_HTML);
    const og = extractOpenGraphFromHtml(html);
    const plainPreview = htmlToPlain(html, maxPlain);
    return {
      ok: res.ok,
      status: res.status,
      ogTitle: og.ogTitle,
      ogDescription: og.ogDescription,
      ogImage: og.ogImage,
      titleTag: og.titleTag,
      plainPreview,
    };
  } catch {
    return { ok: false, plainPreview: "" };
  }
}
