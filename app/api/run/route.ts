import { NextResponse } from "next/server";
import { runDailyBatch, type ContentFormat, type GenerationObjective } from "@/lib/pipeline";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";
import { CONTENT_FORMATS, CONTENT_GOALS } from "@/lib/content-taxonomy";
import { isAllowedBenchmarkUrl } from "@/lib/benchmark-link";
import type { BenchmarkSupplementInput } from "@/lib/benchmark-types";

const OBJECTIVES: GenerationObjective[] = [...CONTENT_GOALS];
const FORMATS: ContentFormat[] = [...CONTENT_FORMATS];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
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
      benchmarkSupplement?: BenchmarkSupplementInput;
    };

    const benchmarkUser =
      body.benchmarkUser?.link?.trim() || body.benchmarkUser?.imageDataUrl
        ? {
            link: body.benchmarkUser?.link?.trim(),
            imageDataUrl: body.benchmarkUser?.imageDataUrl,
          }
        : undefined;

    const mode = body.mode ?? "precise";

    if (mode === "random") {
      const link = body.benchmarkUser?.link?.trim() || "";
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
      const count = Math.max(1, Math.min(10, Number(body.count ?? 5)));
      const result = await runDailyBatch({
        platform: body.platform,
        categoryId: body.categoryId,
        objective: randomPick(OBJECTIVES),
        contentFormat: randomPick(FORMATS),
        count,
        benchmarkUser: { link, imageDataUrl: body.benchmarkUser?.imageDataUrl },
        benchmarkSupplement: body.benchmarkSupplement,
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
    if (!user) {
      return unauthorized("请先登录后使用精准生");
    }
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
          benchmarkSupplement: body.benchmarkSupplement,
        })
      : await runDailyBatch();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "运行失败" }, { status: 500 });
  }
}
