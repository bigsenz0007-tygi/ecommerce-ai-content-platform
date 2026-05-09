import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, maskPhone } from "@/lib/auth-session";
import { readAuthStore, writeAuthStore } from "@/lib/auth-store";

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string; code?: string };
  const phone = (body.phone || "").trim();
  const code = (body.code || "").trim();
  if (!isValidPhone(phone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "手机号或验证码格式错误" }, { status: 400 });
  }

  const store = await readAuthStore();
  const now = Date.now();
  const sms = [...store.codes]
    .reverse()
    .find((x) => x.phone === phone && !x.used && new Date(x.expiresAt).getTime() > now);
  if (!sms || sms.code !== code) {
    return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
  }
  sms.used = true;

  let user = store.users.find((x) => x.phone === phone);
  if (!user) {
    user = {
      id: randomUUID(),
      phone,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
  }

  const token = randomUUID().replaceAll("-", "") + randomUUID().replaceAll("-", "");
  const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
  store.sessions = store.sessions.filter((x) => new Date(x.expiresAt).getTime() > now);
  store.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  });
  await writeAuthStore(store);

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      phone: user.phone,
      phoneMasked: maskPhone(user.phone),
    },
  });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
  return response;
}
