import { prisma } from "@/lib/db";

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
export type GenerationObjective = "涨粉" | "互动" | "关注" | "分享";
export type ContentFormat = "图文" | "视频文字" | "纯文字";

export type RunOptions = {
  accountId: string;
  categoryId: string;
  objective: GenerationObjective;
  contentFormat: ContentFormat;
  count?: number;
  advancedContext?: Record<string, string>;
};

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
    { name: "旗舰店-A", platform: "淘宝", tone: "克制专业、少感叹号" },
    { name: "内容号-B", platform: "抖音", tone: "短句、强节奏、口语化" },
    { name: "京东店-C", platform: "京东", tone: "参数清晰、信任优先" },
    { name: "小红书号-D", platform: "小红书", tone: "生活化表达、强调体验" },
  ];
  for (const seed of accountSeeds) {
    const exists = await prisma.account.findFirst({ where: { name: seed.name, platform: seed.platform } });
    if (!exists) {
      await prisma.account.create({ data: seed });
    }
  }

  const categorySeeds = [
    { name: "美妆个护", keywords: "护肤 彩妆 清洁 香氛" },
    { name: "宠物生活", keywords: "猫狗 养护 玩具 零食" },
    { name: "美食点心", keywords: "烘焙 零食 甜品 茶饮" },
    { name: "恋爱生活", keywords: "情感 礼物 约会 仪式感" },
    { name: "ai创造", keywords: "AI 效率 创作 工具" },
  ];
  for (const seed of categorySeeds) {
    const exists = await prisma.category.findFirst({ where: { name: seed.name } });
    if (!exists) {
      await prisma.category.create({ data: seed });
    }
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
  淘宝: [
    {
      title: "同类热销款：3 秒卖点直达",
      body: "标题强调“场景 + 核心利益点”，首屏放主图细节对比，降低理解成本。",
      url: "https://example.com/benchmark/taobao-1",
      objectiveTags: ["涨粉", "关注"],
    },
    {
      title: "高转化详情节奏",
      body: "先场景痛点，再参数和服务承诺，结尾加入明确行动引导。",
      url: "https://example.com/benchmark/taobao-2",
      objectiveTags: ["分享", "关注"],
    },
  ],
  抖音: [
    {
      title: "15 秒结构化短视频",
      body: "0-3 秒钩子，3-10 秒卖点展示，10-15 秒 CTA，字幕保持短句。",
      url: "https://example.com/benchmark/douyin-1",
      objectiveTags: ["涨粉", "关注"],
    },
    {
      title: "互动型评论引导脚本",
      body: "结尾提出二选一问题，引导评论区互动，提升完播后互动率。",
      url: "https://example.com/benchmark/douyin-2",
      objectiveTags: ["互动", "分享"],
    },
  ],
  小红书: [
    {
      title: "高收藏笔记范式",
      body: "封面承诺结果，正文分步骤、分场景，减少夸张表达。",
      url: "https://example.com/benchmark/xhs-1",
      objectiveTags: ["分享", "关注"],
    },
  ],
  京东: [
    {
      title: "参数与信任优先",
      body: "首段给出适用人群与参数卖点，随后补充服务和保障信息。",
      url: "https://example.com/benchmark/jd-1",
      objectiveTags: ["关注", "涨粉"],
    },
  ],
};

function pickBenchmark(platform: string, objective: GenerationObjective): Benchmark {
  const pool = BENCHMARK_POOL[platform] ?? BENCHMARK_POOL["淘宝"]!;
  const byObjective = pool.filter((x) => !x.objectiveTags || x.objectiveTags.includes(objective));
  return randomPick(byObjective.length > 0 ? byObjective : pool);
}

function objectiveHint(objective: GenerationObjective): string {
  switch (objective) {
    case "涨粉":
      return "首屏强调差异化价值，提高关注意愿";
    case "互动":
      return "加入可回答问题，鼓励评论参与";
    case "关注":
      return "强化账号价值与长期订阅理由";
    case "分享":
      return "内容结构简洁，便于用户二次传播";
    default:
      return "保持信息清晰与行动引导";
  }
}

function formatHint(format: ContentFormat): string {
  switch (format) {
    case "图文":
      return "文案按封面句 + 三点卖点组织";
    case "视频文字":
      return "输出镜头脚本与字幕短句";
    case "纯文字":
      return "输出无图依赖的可发布文本";
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
    case "互动":
      return "评论区告诉我你的选择，我会继续更新。";
    case "关注":
      return "点个关注，后续持续更新同类实测内容。";
    case "分享":
      return "如果有帮助，转发给需要的朋友。";
    case "涨粉":
    default:
      return "喜欢这类内容可以关注我，后续持续更新。";
  }
}

function makeBodyByFormatAndObjective(
  format: ContentFormat,
  objective: GenerationObjective,
  baseBody: string
): string {
  if (format === "纯文字") {
    return `${baseBody}\n${objectiveClosing(objective)}`;
  }
  if (format === "视频文字") {
    return `${baseBody}\n【字幕建议】短句分行，前3秒给结论。\n${objectiveClosing(objective)}`;
  }
  return `${baseBody}\n【配图建议】首图放核心卖点，次图放细节对比。\n${objectiveClosing(objective)}`;
}

function enforceFormatAssets(
  format: ContentFormat,
  imageUrl: string,
  videoUrl: string
): { imageUrl: string; videoUrl: string; fixes: string[] } {
  const fixes: string[] = [];
  if (format === "图文") {
    if (!imageUrl) fixes.push("补齐图文图片素材");
    if (videoUrl) fixes.push("图文任务移除视频素材");
    return { imageUrl: imageUrl || placeholderImage("图文素材"), videoUrl: "", fixes };
  }
  if (format === "视频文字") {
    if (!videoUrl) fixes.push("补齐视频素材");
    if (imageUrl) fixes.push("视频任务移除图片素材");
    return { imageUrl: "", videoUrl: videoUrl || placeholderVideo("视频素材"), fixes };
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

  // 目标导向补句：确保“互动/关注/分享/涨粉”语义与选择一致
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

  const accountList = await prisma.account.findMany();
  const categoryList = await prisma.category.findMany();
  if (accountList.length === 0 || categoryList.length === 0) {
    return { created: 0, message: "缺少账号或品类，请先完成初始化" };
  }

  const count = options?.count ?? settings.dailyCount;
  const premiumSlots = Math.min(settings.premiumSlots, count);

  const selectedAccount = options
    ? await prisma.account.findUnique({ where: { id: options.accountId } })
    : null;
  const selectedCategory = options
    ? await prisma.category.findUnique({ where: { id: options.categoryId } })
    : null;

  if (options && (!selectedAccount || !selectedCategory)) {
    return { created: 0, message: "所选账号或分类不存在，请重新选择" };
  }

  const targetObjective: GenerationObjective = options?.objective ?? "涨粉";
  const targetFormat: ContentFormat = options?.contentFormat ?? "图文";
  const selectedLength = options?.advancedContext?.["内容长度"];

  const drafts: Draft[] = [];
  for (let i = 0; i < count; i++) {
    const account = selectedAccount ?? randomPick(accountList);
    const category = selectedCategory ?? randomPick(categoryList);
    const copy = mockCopy(account.name, category.name);
    const advancedHints = options?.advancedContext
      ? Object.entries(options.advancedContext)
          .filter(([, v]) => !!v)
          .map(([k, v]) => `【${k}】${v}`)
          .join("\n")
      : "";
    const composed = makeBodyByFormatAndObjective(
      targetFormat,
      targetObjective,
      `${copy.body}\n【目标】${objectiveHint(targetObjective)}\n【格式】${formatHint(targetFormat)}${
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

    if (tier === "premium") {
      title = `${d.copyTitle} · Pro`;
      body = `${d.copyBody}\n\n—— 精修版：语气更收敛、卖点更聚焦，强化${targetObjective}目标`;
      imgUrl = placeholderImage(`${d.categoryName} Pro`);
    }

    const fixed = validateAndFixOutput({
      title,
      body,
      objective: targetObjective,
      format: targetFormat,
      contentLength: selectedLength,
      imageUrl: imgUrl,
      videoUrl: vidUrl,
    });
    title = fixed.title;
    body = fixed.body;
    imgUrl = fixed.imageUrl;
    vidUrl = fixed.videoUrl;

    const benchmark = pickBenchmark(d.accountPlatform, targetObjective);

    await prisma.task.create({
      data: {
        accountId: d.accountId,
        categoryId: d.categoryId,
        status: "review_ready",
        tier,
        objective: targetObjective,
        contentFormat: targetFormat,
        copyTitle: title,
        copyBody: body,
        imagePrompt: d.imagePrompt,
        imageUrl: imgUrl,
        videoScript: d.videoScript,
        videoUrl: vidUrl,
        benchmarkTitle: benchmark.title,
        benchmarkBody: benchmark.body,
        benchmarkUrl: benchmark.url,
        scoreCompliance: d.scoreCompliance,
        scoreQuality: d.scoreQuality,
        scoreConvert: d.scoreConvert,
        scoreTotal: d.scoreTotal,
        processMemo: [
          d.hasAdvancedHints ? "精准生：已应用高级约束字段" : "随便生：按平台规范与爆文结构自动生成",
          `校验通过：格式=${targetFormat}，目标=${targetObjective}${selectedLength ? `，长度=${selectedLength}` : ""}`,
          fixed.validation.fixes.length > 0 ? `自动修正：${fixed.validation.fixes.join("；")}` : "自动修正：无",
        ].join("｜"),
      },
    });
    created += 1;
  }

  return {
    created,
    message: `已按“${targetObjective} / ${targetFormat}”生成 ${created} 条任务（${premiumSlots} 条 premium）`,
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
