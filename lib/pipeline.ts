import { prisma } from "@/lib/db";
import { analyzeBenchmarkForMimic, generateTextBundleWithBenchmark } from "@/lib/ai-providers";
import { fetchUrlPageSignals } from "@/lib/trending-fetch";
import { DEFAULT_TRENDING_PICKS } from "@/lib/trending-default-seeds";
import {
  CATEGORY_TRACK_NAMES,
  CONTENT_FORMATS,
  CONTENT_GOALS,
  type ContentFormatLabel,
  type ContentGoal,
} from "@/lib/content-taxonomy";

export type GenerationObjective = ContentGoal;
export type ContentFormat = ContentFormatLabel;

const ADJECTIVES = ["臻选", "热卖", "限时", "囤货必入", "口碑爆款"];
const PHRASES = [
  "把品质带回家",
  "细节经得起放大",
  "闭眼入不踩坑",
  "销量口碑双在线",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function mockCopy(accountName: string, categoryName: string) {
  const adj = randomPick(ADJECTIVES);
  const phrase = randomPick(PHRASES);
  const title = `${adj}｜${categoryName} · ${accountName}`;
  const body = [
    `【卖点】${categoryName}核心优势一次说清，${phrase}。`,
    `【场景】适合日常/通勤/送礼多场景，下单前可对照参数选择规格。`,
    `【服务】支持平台保障与售后咨询，具体以店铺说明为准。`,
  ].join("\n");
  return { title, body };
}

function mockImagePrompt(categoryName: string) {
  return `电商产品主图，${categoryName}，干净背景，柔光棚拍，高级感，留白，8k细节`;
}

function mockVideoScript(categoryName: string) {
  return [
    `0-3s 开场：镜头推进 + 一句话钩子「${categoryName}，为什么一直回购？」`,
    `3-10s 卖点：三镜头展示材质/细节/使用场景`,
    `10-15s 背书：销量/口碑/保障（不夸大）`,
    `15-18s CTA：引导加购与关注`,
  ].join("\n");
}

function placeholderImage(label: string) {
  const safe = encodeURIComponent(label.slice(0, 12));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a1f2e"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="28" fill="#94a3b8">${safe}</text>
    <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
      font-family="system-ui,sans-serif" font-size="16" fill="#64748b">AI 预览图</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function placeholderVideo(label: string) {
  return `demo://video/${encodeURIComponent(label)}`;
}

export type PipelineResult = { created: number; message: string };

export type RunOptions = {
  /** 与 platform 二选一：精准生传账号；随便生可省略，由 platform 解析默认号 */
  accountId?: string;
  /** 小红书 | 抖音：随便生无账号时必填，用于绑定系统内置平台账号记录 */
  platform?: "小红书" | "抖音";
  categoryId: string;
  objective: GenerationObjective;
  contentFormat: ContentFormat;
  count?: number;
  advancedContext?: Record<string, string>;
  /** 用户对标：链接 + 可选截图 data URL */
  benchmarkUser?: { link?: string; imageDataUrl?: string };
  /** 每条随机目标与内容格式（随便生） */
  randomizePerItem?: boolean;
};

const MAX_STORED_USER_IMAGE = 120_000;

export async function ensureSeedData() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    await prisma.appSettings.create({
      data: {
        id: "singleton",
        dailyCount: 10,
        premiumSlots: 2,
        scheduleHour: 9,
        bannedWords: JSON.stringify(["最", "第一", "国家级"]),
      },
    });
  }

  const accountSeeds = [
    { name: "内容号-B", platform: "抖音", tone: "短句、强节奏、口语化" },
    { name: "小红书号-D", platform: "小红书", tone: "生活化表达、强调体验" },
  ];
  for (const seed of accountSeeds) {
    const exists = await prisma.account.findFirst({ where: { name: seed.name, platform: seed.platform } });
    if (!exists) {
      await prisma.account.create({ data: seed });
    }
  }

  const categorySeeds: { name: string; keywords: string }[] = [
    { name: "生活日常", keywords: "日常 记录 生活感 vlog" },
    { name: "美妆穿搭", keywords: "妆容 护肤 穿搭 ootd" },
    { name: "美食探店", keywords: "探店 美食 打卡 口味" },
    { name: "知识干货", keywords: "教程 清单 方法论 复盘" },
    { name: "情感文案", keywords: "共鸣 情绪 关系 治愈" },
    { name: "好物种草", keywords: "种草 测评 性价比 真实体验" },
    { name: "娱乐剧情", keywords: "剧情 反转 段子 娱乐" },
    { name: "职场创业", keywords: "职场 效率 创业 成长" },
  ];
  for (const seed of categorySeeds) {
    const exists = await prisma.category.findFirst({ where: { name: seed.name } });
    if (!exists) {
      await prisma.category.create({ data: seed });
    }
  }

  try {
    const trendingCount = await prisma.trendingPick.count();
    if (trendingCount === 0) {
      await prisma.trendingPick.createMany({ data: DEFAULT_TRENDING_PICKS });
    }
  } catch {
    // 推荐库表可能尚未同步，不阻塞首页选项与设置页的基础加载。
  }
}

function scoreContent(text: string, bannedWords: string[]) {
  let compliance = 92;
  for (const w of bannedWords) {
    if (w && text.includes(w)) compliance -= 18;
  }
  compliance = clamp(compliance, 40, 100);

  const quality = clamp(55 + Math.floor(Math.random() * 40), 40, 100);
  const convert = clamp(50 + Math.floor(Math.random() * 45), 40, 100);
  const total = Math.round((compliance * 0.35 + quality * 0.35 + convert * 0.3) * 10) / 10;
  return { compliance, quality, convert, total };
}

type Draft = {
  accountId: string;
  categoryId: string;
  accountName: string;
  accountPlatform: string;
  categoryName: string;
  objective: GenerationObjective;
  contentFormat: ContentFormat;
  copyTitle: string;
  copyBody: string;
  imagePrompt: string;
  videoScript: string;
  scoreCompliance: number;
  scoreQuality: number;
  scoreConvert: number;
  scoreTotal: number;
  hasAdvancedHints: boolean;
};

type ValidationResult = {
  pass: boolean;
  fixes: string[];
};

type Benchmark = {
  title: string;
  body: string;
  url: string;
  objectiveTags?: GenerationObjective[];
};

const BENCHMARK_POOL: Record<string, Benchmark[]> = {
  抖音: [
    {
      title: "15 秒结构化短视频",
      body: "0-3 秒钩子，3-10 秒卖点展示，10-15 秒 CTA，字幕保持短句。",
      url: "https://example.com/benchmark/douyin-1",
      objectiveTags: ["涨粉引流", "品牌曝光"],
    },
    {
      title: "互动型评论引导脚本",
      body: "结尾提出二选一问题，引导评论区互动，提升完播后互动率。",
      url: "https://example.com/benchmark/douyin-2",
      objectiveTags: ["互动种草", "带货转化"],
    },
  ],
  小红书: [
    {
      title: "高收藏笔记范式",
      body: "封面承诺结果，正文分步骤、分场景，减少夸张表达。",
      url: "https://example.com/benchmark/xhs-1",
      objectiveTags: ["互动种草", "涨粉引流"],
    },
    {
      title: "好物测评对比结构",
      body: "痛点引入—对比维度—结论与购买建议，语气真实克制。",
      url: "https://example.com/benchmark/xhs-2",
      objectiveTags: ["带货转化", "品牌曝光"],
    },
  ],
};

function pickBenchmark(platform: string, objective: GenerationObjective): Benchmark {
  const pool = BENCHMARK_POOL[platform] ?? BENCHMARK_POOL["小红书"]!;
  const byObjective = pool.filter((x) => !x.objectiveTags || x.objectiveTags.includes(objective));
  return randomPick(byObjective.length > 0 ? byObjective : pool);
}

function objectiveHint(objective: GenerationObjective): string {
  switch (objective) {
    case "涨粉引流":
      return "强调关注理由与系列感，首屏给清晰价值承诺";
    case "带货转化":
      return "突出卖点、对比与行动呼吁，减少空泛形容词";
    case "品牌曝光":
      return "强化记忆点、调性与场景联想，适度重复核心符号";
    case "互动种草":
      return "用提问与共鸣引导评论，降低决策门槛";
    default:
      return "保持信息清晰与行动引导";
  }
}

function formatHint(format: ContentFormat): string {
  switch (format) {
    case "图文笔记":
      return "封面句 + 小标题 + 分点，适配信息流浏览";
    case "短视频脚本":
      return "按镜头时长写台词，短句分行，前 3 秒给结论";
    case "口播文案":
      return "口语化分段，可直接对着镜头念";
    case "合集系列":
      return "开篇总览 + 本期亮点 + 与系列其它期的呼应";
    default:
      return "通用内容结构";
  }
}

function parseCharLimit(contentLength: string | undefined): number | null {
  if (!contentLength) return null;
  const m = contentLength.match(/(\d+)\s*字内/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clampTextByChars(input: string, maxChars: number): string {
  if (maxChars <= 0) return input;
  const clean = input.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return clean.slice(0, maxChars);
}

function objectiveClosing(objective: GenerationObjective): string {
  switch (objective) {
    case "涨粉引流":
      return "关注我，后面持续更同赛道干货。";
    case "带货转化":
      return "需要链接或优惠说明可留言，理性下单。";
    case "品牌曝光":
      return "欢迎收藏转发给同频朋友，一起记住这个品牌。";
    case "互动种草":
      return "你更心动哪一款？评论区聊聊。";
    default:
      return "喜欢这类内容可以关注我，后续持续更新。";
  }
}

function makeBodyByFormatAndObjective(
  format: ContentFormat,
  objective: GenerationObjective,
  baseBody: string
): string {
  if (format === "口播文案") {
    return `${baseBody}\n【口播】语气像面对面聊天，短句换气。\n${objectiveClosing(objective)}`;
  }
  if (format === "短视频脚本") {
    return `${baseBody}\n【字幕建议】短句分行，前3秒给结论。\n${objectiveClosing(objective)}`;
  }
  if (format === "合集系列") {
    return `${baseBody}\n【合集】开篇说明系列主题，本期亮点单独一段。\n【配图建议】封面统一风格，内页保持系列识别度。\n${objectiveClosing(objective)}`;
  }
  return `${baseBody}\n【配图建议】首图放核心卖点，次图放细节对比。\n${objectiveClosing(objective)}`;
}

function enforceFormatAssets(
  format: ContentFormat,
  imageUrl: string,
  videoUrl: string
): { imageUrl: string; videoUrl: string; fixes: string[] } {
  const fixes: string[] = [];
  if (format === "图文笔记" || format === "合集系列") {
    if (!imageUrl) fixes.push("补齐图文图片素材");
    if (videoUrl) fixes.push("图文任务移除视频素材");
    return { imageUrl: imageUrl || placeholderImage("图文素材"), videoUrl: "", fixes };
  }
  if (format === "短视频脚本") {
    if (!videoUrl) fixes.push("补齐视频素材");
    if (imageUrl) fixes.push("视频任务移除图片素材");
    return { imageUrl: "", videoUrl: videoUrl || placeholderVideo("视频素材"), fixes };
  }
  if (format === "口播文案") {
    if (imageUrl || videoUrl) fixes.push("口播文案任务移除多媒体素材");
    return { imageUrl: "", videoUrl: "", fixes };
  }
  if (imageUrl || videoUrl) fixes.push("纯文字任务移除多媒体素材");
  return { imageUrl: "", videoUrl: "", fixes };
}

function validateAndFixOutput(params: {
  title: string;
  body: string;
  objective: GenerationObjective;
  format: ContentFormat;
  contentLength?: string;
  imageUrl: string;
  videoUrl: string;
}): {
  title: string;
  body: string;
  imageUrl: string;
  videoUrl: string;
  validation: ValidationResult;
} {
  const fixes: string[] = [];
  const charLimit = parseCharLimit(params.contentLength);

  let nextTitle = params.title;
  let nextBody = params.body;
  if (charLimit) {
    const oldTitle = nextTitle;
    nextTitle = clampTextByChars(nextTitle, charLimit);
    if (nextTitle !== oldTitle) fixes.push(`标题长度裁切至${charLimit}字内`);
    const oldBody = nextBody;
    nextBody = clampTextByChars(nextBody, charLimit);
    if (nextBody !== oldBody) fixes.push(`正文长度裁切至${charLimit}字内`);
  }

  // 目标导向补句：与所选「内容目标」语义一致
  const closing = objectiveClosing(params.objective);
  if (!nextBody.includes(closing)) {
    nextBody = `${nextBody}\n${closing}`.trim();
    fixes.push(`补齐“${params.objective}”目标导向语句`);
  }
  if (charLimit) {
    const oldBody2 = nextBody;
    nextBody = clampTextByChars(nextBody, charLimit);
    if (oldBody2 !== nextBody) fixes.push(`目标语句合并后再次裁切至${charLimit}字内`);
  }

  const assets = enforceFormatAssets(params.format, params.imageUrl, params.videoUrl);
  fixes.push(...assets.fixes);

  return {
    title: nextTitle,
    body: nextBody,
    imageUrl: assets.imageUrl,
    videoUrl: assets.videoUrl,
    validation: { pass: true, fixes },
  };
}

export async function runDailyBatch(options?: RunOptions): Promise<PipelineResult> {
  await ensureSeedData();

  const settings = await prisma.appSettings.findUniqueOrThrow({ where: { id: "singleton" } });
  const banned = JSON.parse(settings.bannedWords || "[]") as string[];

  const storedUserLink = options?.benchmarkUser?.link?.trim() || "";
  let storedUserImage = (options?.benchmarkUser?.imageDataUrl || "").trim();
  if (storedUserImage.length > MAX_STORED_USER_IMAGE) {
    storedUserImage = storedUserImage.slice(0, MAX_STORED_USER_IMAGE);
  }

  let linkPreview = "";
  if (storedUserLink) {
    const sig = await fetchUrlPageSignals(storedUserLink, 7000);
    linkPreview = [
      sig.ogTitle && `【OG标题】${sig.ogTitle}`,
      sig.ogDescription && `【OG摘要】${sig.ogDescription}`,
      sig.plainPreview?.length ? `【正文摘录】${sig.plainPreview}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8000);
  }

  let userBenchmarkSummary: string | null = null;
  if (storedUserLink || storedUserImage) {
    userBenchmarkSummary = await analyzeBenchmarkForMimic({
      link: storedUserLink || undefined,
      linkPreview: linkPreview || undefined,
      imageDataUrl: storedUserImage || undefined,
    });
    if (!userBenchmarkSummary) {
      userBenchmarkSummary = [
        storedUserLink ? `用户对标链接：${storedUserLink}` : "",
        linkPreview ? `链接正文摘录（前段）：\n${linkPreview.slice(0, 2500)}` : "",
        storedUserImage ? "用户已上传对标截图（当前环境无可用多模态模型时，请配置支持视觉的模型）。" : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
  }

  const fromContext = options?.advancedContext
    ? Object.entries(options.advancedContext)
        .filter(([, v]) => !!v)
        .map(([k, v]) => `${k}:${v}`)
        .join("\n")
    : "";
  const advancedHintsForAi = fromContext;

  const accountList = await prisma.account.findMany();
  const categoryList = await prisma.category.findMany();
  if (accountList.length === 0 || categoryList.length === 0) {
    return { created: 0, message: "缺少账号或品类，请先完成初始化" };
  }

  const count = options?.count ?? settings.dailyCount;
  const premiumSlots = Math.min(settings.premiumSlots, count);

  const selectedCategory = options
    ? await prisma.category.findUnique({ where: { id: options.categoryId } })
    : null;

  let selectedAccount: { id: string; name: string; platform: string } | null = null;
  if (options?.accountId) {
    selectedAccount = await prisma.account.findUnique({ where: { id: options.accountId } });
  } else if (options?.platform) {
    selectedAccount = await prisma.account.findFirst({
      where: { platform: options.platform },
      orderBy: { createdAt: "asc" },
    });
  }

  if (options && (!selectedAccount || !selectedCategory)) {
    return { created: 0, message: "所选账号或分类不存在，请重新选择或检查平台配置" };
  }

  const targetObjective: GenerationObjective = options?.objective ?? "涨粉引流";
  const targetFormat: ContentFormat = options?.contentFormat ?? "图文笔记";
  const selectedLength = options?.advancedContext?.["内容长度"];
  const randomizePerItem = options?.randomizePerItem === true;
  const OBJ_POOL: GenerationObjective[] = [...CONTENT_GOALS];
  const FMT_POOL: ContentFormat[] = [...CONTENT_FORMATS];

  const drafts: Draft[] = [];
  for (let i = 0; i < count; i++) {
    const account = selectedAccount ?? randomPick(accountList);
    const category = selectedCategory ?? randomPick(categoryList);
    const rowObjective = randomizePerItem ? randomPick(OBJ_POOL) : targetObjective;
    const rowFormat = randomizePerItem ? randomPick(FMT_POOL) : targetFormat;
    const copy = mockCopy(account.name, category.name);
    const fromCtx = options?.advancedContext
      ? Object.entries(options.advancedContext)
          .filter(([, v]) => !!v)
          .map(([k, v]) => `【${k}】${v}`)
          .join("\n")
      : "";
    const advancedHints = fromCtx;
    const composed = makeBodyByFormatAndObjective(
      rowFormat,
      rowObjective,
      `${copy.body}\n【目标】${objectiveHint(rowObjective)}\n【格式】${formatHint(rowFormat)}${
        advancedHints ? `\n${advancedHints}` : ""
      }`
    );
    const combined = `${copy.title}\n${composed}`;
    const { compliance, quality, convert, total } = scoreContent(combined, banned);
    drafts.push({
      accountId: account.id,
      categoryId: category.id,
      accountName: account.name,
      accountPlatform: account.platform,
      categoryName: category.name,
      objective: rowObjective,
      contentFormat: rowFormat,
      copyTitle: copy.title,
      copyBody: composed,
      imagePrompt: mockImagePrompt(category.name),
      videoScript: mockVideoScript(category.name),
      scoreCompliance: compliance,
      scoreQuality: quality,
      scoreConvert: convert,
      scoreTotal: total,
      hasAdvancedHints: !!advancedHints,
    });
  }

  const order = drafts
    .map((d, idx) => ({ idx, total: d.scoreTotal }))
    .sort((a, b) => b.total - a.total);
  const premiumIdx = new Set(order.slice(0, premiumSlots).map((x) => x.idx));

  let created = 0;
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]!;
    const tier = premiumIdx.has(i) ? "premium" : "standard";

    let title = d.copyTitle;
    let body = d.copyBody;
    let imgUrl = placeholderImage(d.categoryName);
    let vidUrl = placeholderVideo(d.categoryName);
    let imagePrompt = d.imagePrompt;
    let videoScript = d.videoScript;
    let scoreCompliance = d.scoreCompliance;
    let scoreQuality = d.scoreQuality;
    let scoreConvert = d.scoreConvert;
    let scoreTotal = d.scoreTotal;

    if (userBenchmarkSummary) {
      const aiBundle = await generateTextBundleWithBenchmark({
        platform: d.accountPlatform,
        accountName: d.accountName,
        categoryName: d.categoryName,
        objective: d.objective,
        contentFormat: d.contentFormat,
        advancedHints: advancedHintsForAi,
        benchmarkSummary: userBenchmarkSummary,
      });
      if (aiBundle) {
        title = aiBundle.title;
        body = makeBodyByFormatAndObjective(d.contentFormat, d.objective, aiBundle.body);
        imagePrompt = aiBundle.imagePrompt;
        videoScript = aiBundle.videoScript;
        const combined = `${title}\n${body}`;
        const sc = scoreContent(combined, banned);
        scoreCompliance = sc.compliance;
        scoreQuality = sc.quality;
        scoreConvert = sc.convert;
        scoreTotal = sc.total;
      }
    }

    if (tier === "premium") {
      title = `${title} · Pro`;
      body = `${body}\n\n—— 精修版：语气更收敛、卖点更聚焦，强化${d.objective}目标`;
      imgUrl = placeholderImage(`${d.categoryName} Pro`);
    }

    const fixed = validateAndFixOutput({
      title,
      body,
      objective: d.objective,
      format: d.contentFormat,
      contentLength: selectedLength,
      imageUrl: imgUrl,
      videoUrl: vidUrl,
    });
    title = fixed.title;
    body = fixed.body;
    imgUrl = fixed.imageUrl;
    vidUrl = fixed.videoUrl;

    const benchmark = pickBenchmark(d.accountPlatform, d.objective);
    const benchmarkTitle = userBenchmarkSummary ? "对标（用户提交·AI理解）" : benchmark.title;
    const benchmarkBody = userBenchmarkSummary
      ? userBenchmarkSummary.slice(0, 800)
      : benchmark.body;
    const benchmarkUrl = storedUserLink || benchmark.url;

    await prisma.task.create({
      data: {
        accountId: d.accountId,
        categoryId: d.categoryId,
        status: "review_ready",
        tier,
        objective: d.objective,
        contentFormat: d.contentFormat,
        copyTitle: title,
        copyBody: body,
        imagePrompt,
        imageUrl: imgUrl,
        videoScript,
        videoUrl: vidUrl,
        benchmarkTitle,
        benchmarkBody,
        benchmarkUrl,
        benchmarkUserLink: storedUserLink,
        benchmarkUserImage: storedUserImage,
        scoreCompliance,
        scoreQuality,
        scoreConvert,
        scoreTotal,
        processMemo: [
          randomizePerItem
            ? "随便生：对标链接仿写，每条随机目标/格式"
            : d.hasAdvancedHints
              ? "精准生：已应用高级约束字段"
              : "按平台规范与爆文结构自动生成",
          userBenchmarkSummary ? "对标：已解析用户链接/截图并参与仿写" : "对标：系统默认结构参考",
          `校验通过：格式=${d.contentFormat}，目标=${d.objective}${selectedLength ? `，长度=${selectedLength}` : ""}`,
          fixed.validation.fixes.length > 0 ? `自动修正：${fixed.validation.fixes.join("；")}` : "自动修正：无",
        ].join("｜"),
      },
    });
    created += 1;
  }

  return {
    created,
    message: randomizePerItem
      ? `随便生已完成：共 ${created} 条（对标仿写，每条随机目标/内容格式；${premiumSlots} 条 premium）`
      : `已按“${targetObjective} / ${targetFormat}”生成 ${created} 条任务（${premiumSlots} 条 premium）`,
  };
}

export async function regenerateTask(id: string, prompt: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { account: true, category: true },
  });
  if (!task) return null;

  const hint = prompt.trim() || "语气更简洁，卖点更突出";
  const updatedTitle = `${task.copyTitle} · 重生`;
  const updatedBody = `${task.copyBody}\n\n【AI重生指令】${hint}\n—— 已根据描述自动重写。`;
  const scores = scoreContent(updatedBody, []);

  return prisma.task.update({
    where: { id },
    data: {
      copyTitle: updatedTitle,
      copyBody: updatedBody,
      status: "pending_task",
      scoreCompliance: scores.compliance,
      scoreQuality: scores.quality,
      scoreConvert: scores.convert,
      scoreTotal: scores.total,
      processMemo: `自动重生：${hint}`,
    },
    include: { account: true, category: true },
  });
}
