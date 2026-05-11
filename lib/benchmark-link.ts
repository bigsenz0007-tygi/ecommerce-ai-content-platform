/** 对标链接校验：与生成接口保持一致，便于前后端共用。 */

export function isAllowedBenchmarkUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    const h = u.hostname.toLowerCase();
    return (
      h.includes("xiaohongshu.com") ||
      h.includes("xhslink.com") ||
      h.includes("xhs.cn") ||
      h.includes("douyin.com") ||
      h.includes("iesdouyin.com") ||
      h.includes("amemv.com")
    );
  } catch {
    return false;
  }
}
