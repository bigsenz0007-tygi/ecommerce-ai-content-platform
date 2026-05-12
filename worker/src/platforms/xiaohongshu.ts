import type { BrowserContext } from "playwright";
import { extractDetailItem, openPage, scrollAndCollectUrls } from "./shared";
import { workerConfig } from "../config";

const XHS_URL_PATTERN = /^https?:\/\/www\.xiaohongshu\.com\/(?:explore|discovery\/item)\/.+/i;

export async function collectXiaohongshuItems(context: BrowserContext) {
  const candidateUrls = new Set<string>(workerConfig.xhsDirectUrls);

  for (const discoveryUrl of workerConfig.xhsDiscoveryUrls) {
    const page = await openPage(context, discoveryUrl);
    try {
      const urls = await scrollAndCollectUrls(page, XHS_URL_PATTERN, workerConfig.scrollRounds);
      urls.forEach((url: string) => candidateUrls.add(url));
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  const limitedUrls = [...candidateUrls].slice(0, workerConfig.maxCandidatesPerPlatform);
  const items = [];
  for (const url of limitedUrls) {
    const item = await extractDetailItem(context, "小红书", url, "worker-xhs");
    if (item) items.push(item);
  }
  return items;
}
