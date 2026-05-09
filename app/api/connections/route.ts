import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";

const PLATFORMS = ["淘宝", "抖音", "小红书", "京东"];

export async function GET() {
  const existing = await prisma.platformConnection.findMany();
  const map = new Map(existing.map((x) => [x.platform, x]));
  const rows = PLATFORMS.map((platform) => {
    const row = map.get(platform);
    return (
      row ?? {
        id: `${platform}-virtual`,
        platform,
        accountName: "",
        connected: false,
        tokenMask: "",
        updatedAt: new Date(0),
      }
    );
  });
  return NextResponse.json({ connections: rows });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后再配置平台账号");
  const body = (await request.json()) as {
    platform: string;
    accountName?: string;
    action?: "connect" | "disconnect";
  };
  if (!body.platform) {
    return NextResponse.json({ error: "platform 必填" }, { status: 400 });
  }
  const connect = body.action !== "disconnect";
  const row = await prisma.platformConnection.upsert({
    where: { platform: body.platform },
    create: {
      platform: body.platform,
      accountName: body.accountName || `${body.platform}官方账号`,
      connected: connect,
      tokenMask: connect ? "tok_live_***_mask" : "",
    },
    update: {
      connected: connect,
      accountName: body.accountName || `${body.platform}官方账号`,
      tokenMask: connect ? "tok_live_***_mask" : "",
    },
  });
  return NextResponse.json({ connection: row });
}
