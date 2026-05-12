import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { regenerateTask } from "@/lib/pipeline";
import { patchDemoTask } from "@/lib/demo-runtime";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as {
    action?: string;
    copyTitle?: string;
    copyBody?: string;
    imageUrl?: string;
    videoUrl?: string;
    videoScript?: string;
    prompt?: string;
    qualityLabel?: "好" | "中" | "差";
  };

  try {
    if (body.action === "adopt") {
      const t = await prisma.task.update({
        where: { id },
        data: {
          adopted: true,
          archived: false,
          status: "pending_publish",
          processMemo: "已审核通过，进入待发布队列",
        },
        include: { account: true, category: true },
      });
      return NextResponse.json({ task: t });
    }
    if (body.action === "reject") {
      await prisma.appSettings.update({
        where: { id: "singleton" },
        data: { rejectedCount: { increment: 1 } },
      });
      await prisma.task.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "save_edit") {
      const t = await prisma.task.update({
        where: { id },
        data: {
          copyTitle: body.copyTitle ?? "",
          copyBody: body.copyBody ?? "",
          imageUrl: body.imageUrl,
          videoUrl: body.videoUrl,
          videoScript: body.videoScript,
          processMemo: "人工编辑并保存",
        },
        include: { account: true, category: true },
      });
      return NextResponse.json({ task: t });
    }
    if (body.action === "regenerate") {
      const t = await regenerateTask(id, body.prompt ?? "");
      if (!t) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      return NextResponse.json({ task: t });
    }
    if (body.action === "label") {
      const qualityLabel = body.qualityLabel ?? "中";
      const memo =
        qualityLabel === "好"
          ? "优质内容：记录模型与流程作为可复用模板"
          : qualityLabel === "差"
            ? "低质内容：进入自动优化策略，后续降低同类模板权重"
            : "中等内容：保留并等待迭代优化";
      const t = await prisma.task.update({
        where: { id },
        data: {
          qualityLabel,
          processMemo: memo,
        },
        include: { account: true, category: true },
      });
      return NextResponse.json({ task: t });
    }
    if (body.action === "publish") {
      const t = await prisma.task.update({
        where: { id },
        data: {
          status: "published",
          processMemo: "已配置平台发布草稿，待人工确认发布",
        },
        include: { account: true, category: true },
      });
      return NextResponse.json({ task: t });
    }
    if (body.action === "delete") {
      await prisma.task.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "pause_task") {
      const t = await prisma.task.update({
        where: { id },
        data: { status: "paused", processMemo: "任务已暂停，等待继续或结束" },
        include: { account: true, category: true },
      });
      return NextResponse.json({ task: t });
    }
    if (body.action === "end_task") {
      await prisma.task.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "clone_task") {
      const src = await prisma.task.findUnique({ where: { id } });
      if (!src) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
      const cloned = await prisma.task.create({
        data: {
          accountId: src.accountId,
          categoryId: src.categoryId,
          status: "pending_task",
          tier: src.tier,
          objective: src.objective,
          contentFormat: src.contentFormat,
          copyTitle: `${src.copyTitle} · 复制`,
          copyBody: src.copyBody,
          imagePrompt: src.imagePrompt,
          imageUrl: src.imageUrl,
          videoScript: src.videoScript,
          videoUrl: src.videoUrl,
          benchmarkTitle: src.benchmarkTitle,
          benchmarkBody: src.benchmarkBody,
          benchmarkUrl: src.benchmarkUrl,
          benchmarkUserLink: src.benchmarkUserLink,
          benchmarkUserImage: src.benchmarkUserImage,
          qualityLabel: src.qualityLabel,
          processMemo: "基于优质内容复制并创建新任务",
          scoreCompliance: src.scoreCompliance,
          scoreQuality: src.scoreQuality,
          scoreConvert: src.scoreConvert,
          scoreTotal: src.scoreTotal,
        },
        include: { account: true, category: true },
      });
      return NextResponse.json({ task: cloned });
    }
    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch {
    const result = patchDemoTask(id, body);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ...result, fallback: true }, { status: result.status });
  }
}
