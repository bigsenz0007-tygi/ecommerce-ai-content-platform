import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readAuthStore, type SessionRecord, type UserRecord } from "@/lib/auth-store";

export const AUTH_COOKIE_NAME = "tygi_session";

export async function getCurrentUserFromCookie(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const store = await readAuthStore();
  const session = store.sessions.find((x) => x.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const user = store.users.find((x) => x.id === session.userId);
  return user ?? null;
}

export function unauthorized(message = "请先登录后操作") {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
}

export function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function activeSession(sessions: SessionRecord[], token: string) {
  const s = sessions.find((x) => x.token === token);
  if (!s) return null;
  if (new Date(s.expiresAt).getTime() <= Date.now()) return null;
  return s;
}
