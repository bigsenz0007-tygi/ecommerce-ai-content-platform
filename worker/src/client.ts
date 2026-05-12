import { workerConfig } from "./config";
import type { WorkerAnalyzedItem } from "./types";

export async function postToIngestApi(items: WorkerAnalyzedItem[]) {
  if (!workerConfig.ingestEndpoint || !workerConfig.ingestToken) {
    throw new Error("缺少 TRENDING_INGEST_ENDPOINT 或 TRENDING_INGEST_TOKEN");
  }

  const res = await fetch(workerConfig.ingestEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${workerConfig.ingestToken}`,
    },
    body: JSON.stringify({ items }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ingest_failed ${res.status}: ${text.slice(0, 400)}`);
  }
  return text;
}
