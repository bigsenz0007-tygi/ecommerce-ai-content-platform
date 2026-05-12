import cron from "node-cron";
import { workerConfig } from "./config";

console.log(`Trending worker scheduler started: ${workerConfig.cron}`);

cron.schedule(workerConfig.cron, async () => {
  console.log(`[${new Date().toISOString()}] start crawl job`);
  const { spawn } = await import("node:child_process");
  const child = spawn(process.execPath, ["./node_modules/tsx/dist/cli.mjs", "src/run.ts"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] crawl job finished with code ${code ?? 0}`);
  });
});
