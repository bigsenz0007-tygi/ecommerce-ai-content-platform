import { promises as fs } from "fs";
import path from "path";

export type UserRecord = {
  id: string;
  phone: string;
  createdAt: string;
};

export type SmsCodeRecord = {
  id: string;
  phone: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type AuthStore = {
  users: UserRecord[];
  codes: SmsCodeRecord[];
  sessions: SessionRecord[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "auth-store.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initial: AuthStore = { users: [], codes: [], sessions: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export async function readAuthStore(): Promise<AuthStore> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as AuthStore;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      codes: Array.isArray(parsed.codes) ? parsed.codes : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { users: [], codes: [], sessions: [] };
  }
}

export async function writeAuthStore(store: AuthStore) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}
