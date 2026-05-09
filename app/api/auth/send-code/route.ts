import { randomInt, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { readAuthStore, writeAuthStore } from "@/lib/auth-store";

function isValidPhone(phone: string) {
  return /^1\d{10}$/.test(phone);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string };
  const phone = (body.phone || "").trim();
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "请输入正确的11位手机号" }, { status: 400 });
  }

  const store = await readAuthStore();
  const now = Date.now();
  const latest = [...store.codes]
    .reverse()
    .find((x) => x.phone === phone && !x.used && new Date(x.expiresAt).getTime() > now);
  if (latest && now - new Date(latest.createdAt).getTime() < 60 * 1000) {
    return NextResponse.json({ error: "验证码发送过于频繁，请稍后再试" }, { status: 429 });
  }

  const code = `${randomInt(100000, 1000000)}`;
  store.codes.push({
    id: randomUUID(),
    phone,
    code,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 5 * 60 * 1000).toISOString(),
    used: false,
  });
  store.codes = store.codes.slice(-200);
  await writeAuthStore(store);

  return NextResponse.json({
    ok: true,
    message:
      process.env.NODE_ENV === "production"
        ? "验证码已发送，请通过短信服务商通道查收"
        : "验证码已发送（演示）",
    debugCode: process.env.NODE_ENV === "production" ? undefined : code,
  });
}
