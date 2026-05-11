/** 从 HTML 片段提取 Open Graph / 常见 meta，供轻量「爬虫」摘要（不执行 JS）。 */

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function pickMetaContent(html: string, key: "property" | "name", value: string): string | undefined {
  const esc = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re1 = new RegExp(
    `<meta[^>]+${key}=["']${esc}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+${key}=["']${esc}["']`,
    "i",
  );
  const m = html.match(re1) || html.match(re2);
  return m?.[1] ? decodeBasicEntities(m[1].trim()) : undefined;
}

export function extractOpenGraphFromHtml(html: string): {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  titleTag?: string;
} {
  const ogTitle =
    pickMetaContent(html, "property", "og:title") ||
    pickMetaContent(html, "name", "twitter:title");
  const ogDescription =
    pickMetaContent(html, "property", "og:description") ||
    pickMetaContent(html, "name", "twitter:description") ||
    pickMetaContent(html, "name", "description");
  const ogImage =
    pickMetaContent(html, "property", "og:image") ||
    pickMetaContent(html, "name", "twitter:image") ||
    pickMetaContent(html, "name", "twitter:image:src");
  const tm = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleTag = tm?.[1] ? decodeBasicEntities(tm[1].trim()) : undefined;
  return { ogTitle, ogDescription, ogImage, titleTag };
}
