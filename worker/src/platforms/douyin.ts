import type { BrowserContext } from "playwright";
import { extractDetailItem, openPage, scrollAndCollectUrls } from "./shared";
import { workerConfig } from "../config";

const DOUYIN_URL_PATTERN = /^https?:\/\/www\.douyin\.com\/video\/.+/i;

export async function collectDouyinItems(context: BrowserContext) {
  const candidateUrls = new Set<string>(workerConfig.douyinDirectUrls);

  for (const discoveryUrl of workerConfig.douyinDiscoveryUrls) {
    const page = await openPage(context, discoveryUrl);
    try {
      const urls = await scrollAndCollectUrls(page, DOUYIN_URL_PATTERN, workerConfig.scrollRounds);
      urls.forEach((url: string) => candidateUrls.add(url));
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  const limitedUrls = [...candidateUrls].slice(0, workerConfig.maxCandidatesPerPlatform);
  const items = [];
  for (const url of limitedUrls) {
    const item = await extractDetailItem(context, "抖音", url, "worker-douyin");
    if (item) items.push(item);
  }
  return items;
}
