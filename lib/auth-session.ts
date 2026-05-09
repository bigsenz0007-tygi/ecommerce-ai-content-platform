import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserBySessionToken, type UserRecord } from "@/lib/auth-store";

export const AUTH_COOKIE_NAME = "tygi_session";

export async function getCurrentUserFromCookie(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export function unauthorized(message = "请先登录后操作") {
  return NextResponse.json({ error: message, code: "UNAUTHORIZED" }, { status: 401 });
}

export function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
