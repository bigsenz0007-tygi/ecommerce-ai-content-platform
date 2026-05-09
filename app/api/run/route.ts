import { NextResponse } from "next/server";
import { runDailyBatch, type ContentFormat, type GenerationObjective } from "@/lib/pipeline";
import { getCurrentUserFromCookie, unauthorized } from "@/lib/auth-session";

const OBJECTIVES: GenerationObjective[] = ["涨粉", "互动", "关注", "分享"];
const FORMATS: ContentFormat[] = ["图文", "视频文字", "纯文字"];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromCookie();
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "random" | "precise";
      accountId?: string;
      categoryId?: string;
      objective?: "涨粉" | "互动" | "关注" | "分享";
      contentFormat?: "图文" | "视频文字" | "纯文字";
      count?: number;
      advancedContext?: Record<string, string>;
    };
    const mode = body.mode ?? "precise";
    if (!body.accountId || !body.categoryId) {
      return NextResponse.json({ error: "accountId 和 categoryId 必填" }, { status: 400 });
    }

    let result;
    if (!user) {
      if (mode !== "random") {
        return unauthorized("请先登录后使用精准生");
      }
      const count = Math.max(1, Math.min(3, Number(body.count ?? 3)));
      let created = 0;
      for (let i = 0; i < count; i++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await runDailyBatch({
          accountId: body.accountId,
          categoryId: body.categoryId,
          objective: randomPick(OBJECTIVES),
          contentFormat: "图文",
          count: 1,
        });
        created += r.created;
      }
      result = {
        created,
        message: `体验模式已完成：生成 ${created} 条图文（未登录仅支持随便生，最多3条）`,
      };
    } else if (mode === "random") {
      const count = Math.max(1, Math.min(10, Number(body.count ?? 5)));
      let created = 0;
      for (let i = 0; i < count; i++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await runDailyBatch({
          accountId: body.accountId,
          categoryId: body.categoryId,
          objective: randomPick(OBJECTIVES),
          contentFormat: randomPick(FORMATS),
          count: 1,
        });
        created += r.created;
      }
      result = {
        created,
        message: `随便生已完成：生成 ${created} 条（随机图文/视频文字/纯文字，默认符合平台基础规范）`,
      };
    } else {
      const hasGuidedOptions = !!body.objective && !!body.contentFormat;
      result = hasGuidedOptions
        ? await runDailyBatch({
            accountId: body.accountId,
            categoryId: body.categoryId,
            objective: body.objective!,
            contentFormat: body.contentFormat!,
            count: Math.max(1, Math.min(50, Number(body.count ?? 10))),
            advancedContext: body.advancedContext || {},
          })
        : await runDailyBatch();
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "运行失败" }, { status: 500 });
  }
}
