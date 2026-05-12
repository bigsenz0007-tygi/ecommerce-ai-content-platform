import { chromium } from "playwright";
import { workerConfig } from "./config";
import { collectXiaohongshuItems } from "./platforms/xiaohongshu";
import { collectDouyinItems } from "./platforms/douyin";
import { enrichWithAi } from "./ai";
import { postToIngestApi } from "./client";
import type { WorkerExtractedItem } from "./types";

function dedupeByUrl(items: WorkerExtractedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function main() {
  const context = await chromium.launchPersistentContext(workerConfig.profileDir, {
    headless: workerConfig.headless,
    viewport: { width: 1440, height: 900 },
  });

  try {
    const crawled: WorkerExtractedItem[] = [];
    if (workerConfig.enableXhs) {
      crawled.push(...(await collectXiaohongshuItems(context)));
    }
    if (workerConfig.enableDouyin) {
      crawled.push(...(await collectDouyinItems(context)));
    }

    const deduped = dedupeByUrl(crawled);
    const analyzed = [];
    for (const item of deduped) {
      analyzed.push(await enrichWithAi(item));
    }

    const qualified = analyzed.filter(
      (item) =>
        item.likes > workerConfig.minLikes &&
        item.favorites > workerConfig.minFavorites &&
        item.comments > workerConfig.minComments
    );

    const ingestResult = await postToIngestApi(analyzed);
    console.log(
      JSON.stringify(
        {
          crawled: crawled.length,
          deduped: deduped.length,
          qualified: qualified.length,
          ingestResult,
        },
        null,
        2
      )
    );
  } finally {
    await context.close().catch(() => undefined);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
