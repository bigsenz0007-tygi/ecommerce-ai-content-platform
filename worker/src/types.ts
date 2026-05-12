export type WorkerPlatform = "小红书" | "抖音";

export type WorkerExtractedItem = {
  platform: WorkerPlatform;
  title: string;
  contentBody: string;
  tags: string[];
  likes: number;
  comments: number;
  favorites: number;
  coverImageUrl: string;
  imageUrls: string[];
  videoUrl: string;
  authorName: string;
  crawlKeyword: string;
  url: string;
};

export type WorkerAnalyzedItem = WorkerExtractedItem & {
  aiCategory: string;
  aiStyleSummary: string;
  aiStructureSummary: string;
  aiObjectiveHints: string[];
  aiBenchmarkSummary: string;
};
