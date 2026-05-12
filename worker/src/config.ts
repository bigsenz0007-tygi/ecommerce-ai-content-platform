import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function boolEnv(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function numEnv(name: string, fallback: number) {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function listEnv(name: string) {
  return (process.env[name] || "")
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export const workerConfig = {
  headless: boolEnv("WORKER_HEADLESS", true),
  profileDir: path.resolve(process.cwd(), process.env.WORKER_PROFILE_DIR || "./.playwright-profile"),
  cron: process.env.WORKER_CRON || "0 */6 * * *",
  maxCandidatesPerPlatform: numEnv("WORKER_MAX_CANDIDATES_PER_PLATFORM", 20),
  scrollRounds: numEnv("WORKER_SCROLL_ROUNDS", 5),
  enableXhs: boolEnv("WORKER_ENABLE_XHS", true),
  enableDouyin: boolEnv("WORKER_ENABLE_DOUYIN", true),
  xhsDiscoveryUrls: listEnv("XHS_DISCOVERY_URLS"),
  douyinDiscoveryUrls: listEnv("DOUYIN_DISCOVERY_URLS"),
  xhsDirectUrls: listEnv("XHS_DIRECT_URLS"),
  douyinDirectUrls: listEnv("DOUYIN_DIRECT_URLS"),
  ingestEndpoint: (process.env.TRENDING_INGEST_ENDPOINT || "").trim(),
  ingestToken: (process.env.TRENDING_INGEST_TOKEN || "").trim(),
  minLikes: numEnv("CRAWL_MIN_LIKES", 1000),
  minFavorites: numEnv("CRAWL_MIN_FAVORITES", 50),
  minComments: numEnv("CRAWL_MIN_COMMENTS", 100),
};
