import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  readPlatformAccounts,
  writePlatformAccounts,
  type PlatformAccountRecord,
} from "@/lib/platform-account-store";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";

export async function GET() {
  const accounts = await readPlatformAccounts();
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后再登录平台账号");
  const body = (await request.json()) as {
    platform?: string;
    username?: string;
    password?: string;
  };
  if (!body.platform || !body.username || !body.password) {
    return NextResponse.json(
      { error: "platform / username / password 必填" },
      { status: 400 }
    );
  }

  // 登录测试（模拟）：密码至少4位即判定可登录
  const loginOk = body.password.trim().length >= 4;
  if (!loginOk) {
    return NextResponse.json(
      { error: "登录测试失败：密码长度不足（演示规则）" },
      { status: 400 }
    );
  }

  const rows = await readPlatformAccounts();
  const existing = rows.find(
    (x) => x.platform === body.platform && x.username === body.username
  );
  const now = new Date().toISOString();
  let next: PlatformAccountRecord[];
  if (existing) {
    next = rows.map((x) =>
      x.id === existing.id
        ? {
            ...x,
            connected: true,
            lastTestStatus: "ok",
            lastTestAt: now,
            passwordMask: "******",
          }
        : x
    );
  } else {
    next = [
      ...rows,
      {
        id: randomUUID(),
        platform: body.platform,
        username: body.username,
        passwordMask: "******",
        connected: true,
        lastTestStatus: "ok",
        lastTestAt: now,
      },
    ];
  }
  await writePlatformAccounts(next);

  // 首次登录成功后默认设为发布账号
  await prisma.platformConnection.upsert({
    where: { platform: body.platform },
    create: {
      platform: body.platform,
      accountName: body.username,
      connected: true,
      tokenMask: "tok_live_***_mask",
    },
    update: {
      accountName: body.username,
      connected: true,
      tokenMask: "tok_live_***_mask",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "登录测试通过，账号已纳入平台账号池",
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后再设置默认账号");
  const body = (await request.json()) as {
    action?: "set_default";
    platform?: string;
    username?: string;
  };
  if (body.action !== "set_default" || !body.platform || !body.username) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  await prisma.platformConnection.upsert({
    where: { platform: body.platform },
    create: {
      platform: body.platform,
      accountName: body.username,
      connected: true,
      tokenMask: "tok_live_***_mask",
    },
    update: {
      accountName: body.username,
      connected: true,
      tokenMask: "tok_live_***_mask",
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后再移除账号");
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
  const rows = await readPlatformAccounts();
  const next = rows.filter((x) => x.id !== id);
  await writePlatformAccounts(next);
  return NextResponse.json({ ok: true });
}
