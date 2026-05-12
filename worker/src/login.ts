import { chromium } from "playwright";
import { workerConfig } from "./config";

async function main() {
  const context = await chromium.launchPersistentContext(workerConfig.profileDir, {
    headless: false,
    viewport: { width: 1440, height: 900 },
  });

  const pages = [
    ...(workerConfig.xhsDiscoveryUrls.length > 0 ? workerConfig.xhsDiscoveryUrls : ["https://www.xiaohongshu.com/"]),
    ...(workerConfig.douyinDiscoveryUrls.length > 0 ? workerConfig.douyinDiscoveryUrls : ["https://www.douyin.com/"]),
  ];

  for (const url of pages.slice(0, 2)) {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  }

  console.log("浏览器已打开，请手动完成小红书/抖音登录。登录完成后直接关闭浏览器，登录态会保存在 WORKER_PROFILE_DIR。");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
