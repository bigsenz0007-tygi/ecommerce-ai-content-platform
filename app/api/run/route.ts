import { NextResponse } from "next/server";
import { runDailyBatch, type ContentFormat, type GenerationObjective } from "@/lib/pipeline";
import { CONTENT_FORMATS, CONTENT_GOALS } from "@/lib/content-taxonomy";
import {
  inferBenchmarkPlatform,
  isAllowedBenchmarkUrl,
  normalizeBenchmarkUrl,
} from "@/lib/benchmark-link";
import { createDemoTasksFromRun, getDemoState } from "@/lib/demo-runtime";

const OBJECTIVES: GenerationObjective[] = [...CONTENT_GOALS];
const FORMATS: ContentFormat[] = [...CONTENT_FORMATS];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function isPlatformChoice(value: string): value is "小红书" | "抖音" {
  return value === "小红书" || value === "抖音";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    mode?: "random" | "precise";
    accountId?: string;
    platform?: "小红书" | "抖音";
    categoryId?: string;
    objective?: GenerationObjective;
    contentFormat?: ContentFormat;
    count?: number;
    advancedContext?: Record<string, string>;
    benchmarkUser?: { link?: string; imageDataUrl?: string };
    benchmarkPresetSummary?: string;
  };
  try {
    const benchmarkUser =
      body.benchmarkUser?.link?.trim() || body.benchmarkUser?.imageDataUrl
        ? {
            link: body.benchmarkUser?.link?.trim()
              ? normalizeBenchmarkUrl(body.benchmarkUser.link.trim())
              : undefined,
            imageDataUrl: body.benchmarkUser?.imageDataUrl,
          }
        : undefined;

    const mode = body.mode ?? "precise";

    if (mode === "random") {
      const link = body.benchmarkUser?.link?.trim()
        ? normalizeBenchmarkUrl(body.benchmarkUser.link.trim())
        : "";
      if (!body.platform || !body.categoryId) {
        return NextResponse.json({ error: "随便生需要选择平台与分类" }, { status: 400 });
      }
      if (body.platform !== "小红书" && body.platform !== "抖音") {
        return NextResponse.json({ error: "平台仅支持小红书或抖音" }, { status: 400 });
      }
      if (!link) {
        return NextResponse.json({ error: "随便生请填写小红书或抖音对标链接" }, { status: 400 });
      }
      if (!isAllowedBenchmarkUrl(link)) {
        return NextResponse.json(
          { error: "请输入有效的小红书或抖音链接（域名需匹配对应平台）" },
          { status: 400 }
        );
      }
      const inferredPlatform = inferBenchmarkPlatform(link);
      if (inferredPlatform && inferredPlatform !== body.platform) {
        return NextResponse.json({ error: "链接所属平台与所选平台不一致，请检查" }, { status: 400 });
      }
      const count = Math.max(1, Math.min(10, Number(body.count ?? 5)));
      const result = await runDailyBatch({
        platform: body.platform,
        categoryId: body.categoryId,
        objective: randomPick(OBJECTIVES),
        contentFormat: randomPick(FORMATS),
        count,
        benchmarkUser: { link, imageDataUrl: body.benchmarkUser?.imageDataUrl },
        benchmarkPresetSummary: body.benchmarkPresetSummary?.trim() || undefined,
        randomizePerItem: true,
      });
      return NextResponse.json({
        ...result,
        message:
          result.message ||
          `随便生已完成：${count} 条（对标链接仿写，每条随机目标与内容格式）`,
      });
    }

    if (!body.accountId || !body.categoryId) {
      return NextResponse.json({ error: "精准生需要 accountId 与 categoryId" }, { status: 400 });
    }

    let result;
    const hasGuidedOptions = !!body.objective && !!body.contentFormat;
    result = hasGuidedOptions
      ? await runDailyBatch({
          accountId: body.accountId,
          categoryId: body.categoryId,
          objective: body.objective!,
          contentFormat: body.contentFormat!,
          count: Math.max(1, Math.min(50, Number(body.count ?? 10))),
          advancedContext: body.advancedContext || {},
          benchmarkUser,
          benchmarkPresetSummary: body.benchmarkPresetSummary?.trim() || undefined,
        })
      : await runDailyBatch();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : String(e || "");
    const isDbEnvError =
      msg.includes("DATABASE_URL") ||
      msg.includes("postgresql://") ||
      msg.includes("postgres://");
    if (isDbEnvError) {
      const demoPlatformRaw =
        body.platform ||
        getDemoState().accounts.find((account) => account.id === body.accountId)?.platform ||
        "";
      if (isPlatformChoice(demoPlatformRaw) && body.categoryId) {
        const count =
          body.mode === "random"
            ? Math.max(1, Math.min(10, Number(body.count ?? 3)))
            : Math.max(1, Math.min(50, Number(body.count ?? 3)));
        const tasks = createDemoTasksFromRun({
          platform: demoPlatformRaw,
          categoryId: body.categoryId,
          objective: body.objective || randomPick(OBJECTIVES),
          contentFormat: body.contentFormat || randomPick(FORMATS),
          count,
          benchmarkLink: body.benchmarkUser?.link?.trim()
            ? normalizeBenchmarkUrl(body.benchmarkUser.link.trim())
            : "",
        });
        return NextResponse.json({
          ok: true,
          fallback: true,
          created: tasks.length,
          message:
            body.mode === "precise"
              ? `演示模式已生成 ${tasks.length} 条精准内容，可直接去审核页继续体验完整流程。`
              : `演示模式已生成 ${tasks.length} 条内容，可直接去审核页继续体验完整流程。`,
        });
      }
    }
    return NextResponse.json(
      { error: isDbEnvError ? "当前数据库未配置完成，链接校验已通过，但暂时还不能真正生成内容。" : "运行失败" },
      { status: 500 }
    );
  }
}
