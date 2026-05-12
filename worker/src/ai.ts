import { analyzeTrendingCandidate } from "../../lib/ai-providers";
import type { WorkerAnalyzedItem, WorkerExtractedItem } from "./types";

export async function enrichWithAi(item: WorkerExtractedItem): Promise<WorkerAnalyzedItem> {
  const analysis = await analyzeTrendingCandidate({
    platform: item.platform,
    title: item.title,
    contentBody: item.contentBody,
    tags: item.tags,
    likes: item.likes,
    comments: item.comments,
    favorites: item.favorites,
  });

  return {
    ...item,
    aiCategory: analysis.category,
    aiStyleSummary: analysis.styleSummary,
    aiStructureSummary: analysis.structureSummary,
    aiObjectiveHints: analysis.objectiveHints,
    aiBenchmarkSummary: analysis.benchmarkSummary,
  };
}
