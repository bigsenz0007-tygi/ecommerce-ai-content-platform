import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";

export async function POST(request: Request) {
  const user = await getCurrentUserFromCookie();
  if (!user) return unauthorized("请先登录后再发布预览");
  const body = (await request.json()) as { taskId?: string; platform?: string };
  if (!body.taskId || !body.platform) {
    return NextResponse.json({ error: "taskId 和 platform 必填" }, { status: 400 });
  }

  const [task, conn] = await Promise.all([
    prisma.task.findUnique({ where: { id: body.taskId }, include: { account: true, category: true } }),
    prisma.platformConnection.findUnique({ where: { platform: body.platform } }),
  ]);

  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (!conn?.connected) {
    return NextResponse.json({ error: `${body.platform} 账号未连接` }, { status: 400 });
  }

  const draftUrl = `https://draft.example.com/${encodeURIComponent(body.platform)}/${task.id}`;
  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "published",
      processMemo: `已推送 ${body.platform} 草稿，账号：${conn.accountName}`,
    },
  });

  return NextResponse.json({
    ok: true,
    draftUrl,
    message: `已生成 ${body.platform} 草稿，请人工预览并保存`,
  });
}
