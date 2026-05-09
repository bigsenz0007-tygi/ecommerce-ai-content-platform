import { promises as fs } from "fs";
import path from "path";

export type PlatformAccountRecord = {
  id: string;
  platform: string;
  username: string;
  passwordMask: string;
  connected: boolean;
  lastTestStatus: "ok" | "failed";
  lastTestAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "platform-accounts.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

export async function readPlatformAccounts(): Promise<PlatformAccountRecord[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as PlatformAccountRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writePlatformAccounts(rows: PlatformAccountRecord[]) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf-8");
}
