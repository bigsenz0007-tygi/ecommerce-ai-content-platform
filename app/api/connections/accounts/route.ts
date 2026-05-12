import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createDemoLinkedAccount,
  deleteDemoLinkedAccount,
  listDemoLinkedAccounts,
  setDemoDefaultLinkedAccount,
} from "@/lib/demo-runtime";

function toRow(r: {
  id: string;
  platform: string;
  username: string;
  connected: boolean;
  lastTestStatus: string;
  lastTestAt: Date;
}) {
  return {
    id: r.id,
    platform: r.platform,
    username: r.username,
    passwordMask: "******",
    connected: r.connected,
    lastTestStatus: r.lastTestStatus,
    lastTestAt: r.lastTestAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await prisma.platformLinkedAccount.findMany({
      orderBy: { lastTestAt: "desc" },
    });
    return NextResponse.json({ accounts: rows.map(toRow) });
  } catch {
    return NextResponse.json({ accounts: listDemoLinkedAccounts(), fallback: true });
  }
}

export async function POST(request: Request) {
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

  const loginOk = body.password.trim().length >= 4;
  if (!loginOk) {
    return NextResponse.json(
      { error: "登录测试失败：密码长度不足（演示规则）" },
      { status: 400 }
    );
  }

  const now = new Date();
  try {
    await prisma.platformLinkedAccount.upsert({
      where: {
        platform_username: { platform: body.platform, username: body.username },
      },
      create: {
        platform: body.platform,
        username: body.username,
        passwordMask: "******",
        connected: true,
        lastTestStatus: "ok",
        lastTestAt: now,
      },
      update: {
        connected: true,
        lastTestStatus: "ok",
        lastTestAt: now,
        passwordMask: "******",
      },
    });

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
  } catch {
    createDemoLinkedAccount(body.platform, body.username);
    return NextResponse.json({
      ok: true,
      message: "登录测试通过，账号已纳入平台账号池",
      fallback: true,
    });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    action?: "set_default";
    platform?: string;
    username?: string;
  };
  if (body.action !== "set_default" || !body.platform || !body.username) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  try {
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
  } catch {
    setDemoDefaultLinkedAccount(body.platform, body.username);
    return NextResponse.json({ ok: true, fallback: true });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 必填" }, { status: 400 });
  try {
    await prisma.platformLinkedAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    if (deleteDemoLinkedAccount(id)) {
      return NextResponse.json({ ok: true, fallback: true });
    }
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
}
