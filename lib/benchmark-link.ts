/** 对标链接校验：与生成接口保持一致，便于前后端共用。 */

function hasProtocol(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url);
}

function isAllowedBenchmarkHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.includes("xiaohongshu.com") ||
    h.includes("xhslink.com") ||
    h.includes("xhs.cn") ||
    h.includes("douyin.com") ||
    h.includes("iesdouyin.com") ||
    h.includes("amemv.com")
  );
}

export function normalizeBenchmarkUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  const candidate = hasProtocol(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(candidate);
    if (isAllowedBenchmarkHost(u.hostname) && u.protocol === "http:") {
      u.protocol = "https:";
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export function inferBenchmarkPlatform(url: string): "" | "小红书" | "抖音" {
  try {
    const normalized = normalizeBenchmarkUrl(url);
    const h = new URL(normalized).hostname.toLowerCase();
    if (h.includes("xiaohongshu.com") || h.includes("xhslink.com") || h.includes("xhs.cn")) return "小红书";
    if (h.includes("douyin.com") || h.includes("iesdouyin.com") || h.includes("amemv.com")) return "抖音";
    return "";
  } catch {
    return "";
  }
}

export function isAllowedBenchmarkUrl(url: string): boolean {
  try {
    const normalized = normalizeBenchmarkUrl(url);
    const h = new URL(normalized).hostname.toLowerCase();
    return isAllowedBenchmarkHost(h);
  } catch {
    return false;
  }
}
