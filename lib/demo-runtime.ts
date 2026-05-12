import {
  CATEGORY_TRACK_NAMES,
  CONTENT_FORMATS,
  CONTENT_GOALS,
  type PlatformChoice,
} from "@/lib/content-taxonomy";

type DemoSettings = {
  id: string;
  dailyCount: number;
  premiumSlots: number;
  scheduleHour: number;
  bannedWords: string[];
  maxConcurrentTask: number;
  maxPublishPerHour: number;
  minScoreForPublish: number;
  autoDeleteRejected: boolean;
  complianceLevel: string;
  rejectedCount: number;
};

type DemoAccount = {
  id: string;
  name: string;
  platform: string;
  tone: string;
  createdAt: Date;
};

type DemoCategory = {
  id: string;
  name: string;
  keywords: string;
  createdAt: Date;
};

type DemoConnection = {
  id: string;
  platform: string;
  accountName: string;
  connected: boolean;
  tokenMask: string;
  updatedAt: Date;
};

type DemoLinkedAccount = {
  id: string;
  platform: string;
  username: string;
  passwordMask: string;
  connected: boolean;
  lastTestStatus: string;
  lastTestAt: Date;
};

type DemoTask = {
  id: string;
  accountId: string;
  categoryId: string;
  status: string;
  tier: string;
  objective: string;
  contentFormat: string;
  copyTitle: string;
  copyBody: string;
  imagePrompt: string;
  imageUrl: string;
  videoScript: string;
  videoUrl: string;
  benchmarkTitle: string;
  benchmarkBody: string;
  benchmarkUrl: string;
  benchmarkUserLink: string;
  benchmarkUserImage: string;
  qualityLabel: "好" | "中" | "差";
  processMemo: string;
  scoreCompliance: number;
  scoreQuality: number;
  scoreConvert: number;
  scoreTotal: number;
  adopted: boolean;
  archived: boolean;
  failReason: string;
  createdAt: Date;
  updatedAt: Date;
};

type DemoState = {
  nextId: number;
  settings: DemoSettings;
  accounts: DemoAccount[];
  categories: DemoCategory[];
  connections: DemoConnection[];
  linkedAccounts: DemoLinkedAccount[];
  tasks: DemoTask[];
};

type TaskFilters = {
  status?: string | null;
  adopted?: string | null;
  objective?: string | null;
  contentFormat?: string | null;
  qualityLabel?: string | null;
  platform?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  minScore?: string | null;
  maxScore?: string | null;
  efficiency?: string | null;
};

declare global {
  var __tygiDemoState: DemoState | undefined;
}

function demoImage(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="100%" height="100%" fill="#140f25"/><rect x="36" y="36" width="888" height="648" rx="32" fill="#1f1833" stroke="#7c3aed" stroke-opacity="0.6"/><text x="60" y="110" font-family="system-ui,sans-serif" font-size="36" fill="#f5f3ff">${label}</text><text x="60" y="170" font-family="system-ui,sans-serif" font-size="22" fill="#b6a7df">Tygi 演示素材</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function demoVideo(taskId: string) {
  return `demo://video/${encodeURIComponent(taskId)}`;
}

function createInitialState(): DemoState {
  const settings: DemoSettings = {
    id: "singleton",
    dailyCount: 10,
    premiumSlots: 2,
    scheduleHour: 9,
    bannedWords: ["最", "第一", "国家级"],
    maxConcurrentTask: 20,
    maxPublishPerHour: 30,
    minScoreForPublish: 70,
    autoDeleteRejected: true,
    complianceLevel: "strict",
    rejectedCount: 1,
  };

  const categories: DemoCategory[] = CATEGORY_TRACK_NAMES.map((name, index) => ({
    id: name,
    name,
    keywords: `演示赛道-${index + 1}`,
    createdAt: new Date(Date.now() - (index + 1) * 3600_000),
  }));

  const accounts: DemoAccount[] = [
    {
      id: "fallback-xhs-account",
      name: "小红书号-D",
      platform: "小红书",
      tone: "生活化表达、强调体验",
      createdAt: new Date(Date.now() - 8 * 3600_000),
    },
    {
      id: "fallback-dy-account",
      name: "内容号-B",
      platform: "抖音",
      tone: "短句、强节奏、口语化",
      createdAt: new Date(Date.now() - 7 * 3600_000),
    },
  ];

  const connections: DemoConnection[] = [
    {
      id: "conn-dy",
      platform: "抖音",
      accountName: "内容号-B",
      connected: true,
      tokenMask: "tok_demo_***",
      updatedAt: new Date(),
    },
    {
      id: "conn-xhs",
      platform: "小红书",
      accountName: "小红书号-D",
      connected: true,
      tokenMask: "tok_demo_***",
      updatedAt: new Date(),
    },
    {
      id: "conn-taobao",
      platform: "淘宝",
      accountName: "",
      connected: false,
      tokenMask: "",
      updatedAt: new Date(0),
    },
    {
      id: "conn-jd",
      platform: "京东",
      accountName: "",
      connected: false,
      tokenMask: "",
      updatedAt: new Date(0),
    },
  ];

  const linkedAccounts: DemoLinkedAccount[] = [
    {
      id: "linked-xhs",
      platform: "小红书",
      username: "xiaohongshu_demo",
      passwordMask: "******",
      connected: true,
      lastTestStatus: "ok",
      lastTestAt: new Date(),
    },
    {
      id: "linked-dy",
      platform: "抖音",
      username: "douyin_demo",
      passwordMask: "******",
      connected: true,
      lastTestStatus: "ok",
      lastTestAt: new Date(),
    },
  ];

  const now = Date.now();
  const taskSeed = [
    {
      id: "demo-task-1",
      accountId: "fallback-xhs-account",
      categoryId: "美妆穿搭",
      status: "review_ready",
      tier: "A",
      objective: "互动种草",
      contentFormat: "图文笔记",
      copyTitle: "黄皮通勤妆 3 支口红就够了",
      copyBody: "先说结论：黄皮上班通勤别再盲买。今天这 3 支颜色覆盖开会、约会、日常通勤三种场景，预算也能控制住。\n\n1. 裸豆沙，最稳不出错\n2. 低饱和砖红，拍照显气色\n3. 微醺莓果，晚上聚会更提气\n\n评论区留你肤色，我给你补色号。",
      imagePrompt: "办公室通勤妆，口红试色拼图",
      imageUrl: demoImage("美妆穿搭 · 图文笔记"),
      videoScript: "",
      videoUrl: "",
      benchmarkTitle: "小红书爆款口红试色",
      benchmarkBody: "多场景试色对比，评论互动强。",
      benchmarkUrl: "https://www.xiaohongshu.com/explore/demo-beauty",
      benchmarkUserLink: "",
      benchmarkUserImage: "",
      qualityLabel: "中" as const,
      processMemo: "演示数据：等待审核采纳",
      scoreCompliance: 92,
      scoreQuality: 88,
      scoreConvert: 84,
      scoreTotal: 88,
      adopted: false,
      archived: false,
      failReason: "",
      createdAt: new Date(now - 1 * 3600_000),
      updatedAt: new Date(now - 1 * 3600_000),
    },
    {
      id: "demo-task-2",
      accountId: "fallback-dy-account",
      categoryId: "生活日常",
      status: "review_ready",
      tier: "A",
      objective: "涨粉引流",
      contentFormat: "短视频脚本",
      copyTitle: "打工人下班 30 分钟回血流程",
      copyBody: "开头 3 秒直接给结果：我现在下班回家只做 3 件事，人没那么累了。\n第一镜：回家先换衣服\n第二镜：热饭和洗脸同步\n第三镜：拉伸 5 分钟\n结尾：你们回家第一件事做什么？",
      imagePrompt: "",
      imageUrl: "",
      videoScript: "镜头1：电梯口回家；镜头2：餐桌热饭；镜头3：客厅拉伸；结尾问答互动。",
      videoUrl: demoVideo("demo-task-2"),
      benchmarkTitle: "抖音下班回血短视频",
      benchmarkBody: "生活感强，节奏快。",
      benchmarkUrl: "https://www.douyin.com/video/demo-life",
      benchmarkUserLink: "https://www.douyin.com/video/demo-life-user",
      benchmarkUserImage: "",
      qualityLabel: "中" as const,
      processMemo: "演示数据：等待审核采纳",
      scoreCompliance: 95,
      scoreQuality: 90,
      scoreConvert: 83,
      scoreTotal: 89.2,
      adopted: false,
      archived: false,
      failReason: "",
      createdAt: new Date(now - 2 * 3600_000),
      updatedAt: new Date(now - 2 * 3600_000),
    },
    {
      id: "demo-task-3",
      accountId: "fallback-xhs-account",
      categoryId: "知识干货",
      status: "pending_publish",
      tier: "A",
      objective: "品牌曝光",
      contentFormat: "合集系列",
      copyTitle: "Excel 提效 5 个最常用技巧合集",
      copyBody: "这一篇给你收齐最常用的 5 个 Excel 技巧：冻结窗格、条件格式、数据透视表、快捷填充、TEXT 函数。",
      imagePrompt: "Excel 技巧合集封面",
      imageUrl: demoImage("知识干货 · 合集系列"),
      videoScript: "",
      videoUrl: "",
      benchmarkTitle: "Excel 干货合集",
      benchmarkBody: "保存率高，适合知识干货赛道。",
      benchmarkUrl: "https://www.xiaohongshu.com/explore/demo-excel",
      benchmarkUserLink: "",
      benchmarkUserImage: "",
      qualityLabel: "好" as const,
      processMemo: "已审核通过，进入待发布队列",
      scoreCompliance: 96,
      scoreQuality: 92,
      scoreConvert: 86,
      scoreTotal: 91.4,
      adopted: true,
      archived: false,
      failReason: "",
      createdAt: new Date(now - 5 * 3600_000),
      updatedAt: new Date(now - 4 * 3600_000),
    },
    {
      id: "demo-task-4",
      accountId: "fallback-dy-account",
      categoryId: "好物种草",
      status: "published",
      tier: "A",
      objective: "带货转化",
      contentFormat: "口播文案",
      copyTitle: "桌面收纳神器真的能提升效率吗",
      copyBody: "别听玄学，我自己用了一周，最值的是桌面终于不会乱到影响开工。适合工位、宿舍、租房桌面。",
      imagePrompt: "",
      imageUrl: "",
      videoScript: "",
      videoUrl: "",
      benchmarkTitle: "桌面收纳种草",
      benchmarkBody: "口播结论先行，适合转化。",
      benchmarkUrl: "https://www.douyin.com/video/demo-desk",
      benchmarkUserLink: "",
      benchmarkUserImage: "",
      qualityLabel: "好" as const,
      processMemo: "已推送 抖音 草稿，账号：内容号-B",
      scoreCompliance: 93,
      scoreQuality: 87,
      scoreConvert: 90,
      scoreTotal: 89.5,
      adopted: true,
      archived: false,
      failReason: "",
      createdAt: new Date(now - 24 * 3600_000),
      updatedAt: new Date(now - 22 * 3600_000),
    },
    {
      id: "demo-task-5",
      accountId: "fallback-xhs-account",
      categoryId: "情感文案",
      status: "pending_task",
      tier: "B",
      objective: "互动种草",
      contentFormat: "图文笔记",
      copyTitle: "写给总是懂事的那个人",
      copyBody: "你不是不累，只是习惯先照顾别人。真正的自洽，是允许自己有情绪、有边界，也允许自己被理解。",
      imagePrompt: "情绪共鸣文案卡片",
      imageUrl: demoImage("情感文案 · 图文笔记"),
      videoScript: "",
      videoUrl: "",
      benchmarkTitle: "情绪共鸣文案",
      benchmarkBody: "评论共鸣高。",
      benchmarkUrl: "https://www.xiaohongshu.com/explore/demo-emotion",
      benchmarkUserLink: "",
      benchmarkUserImage: "",
      qualityLabel: "中" as const,
      processMemo: "演示数据：待继续处理",
      scoreCompliance: 90,
      scoreQuality: 82,
      scoreConvert: 76,
      scoreTotal: 82.4,
      adopted: false,
      archived: false,
      failReason: "",
      createdAt: new Date(now - 30 * 60_000),
      updatedAt: new Date(now - 30 * 60_000),
    },
    {
      id: "demo-task-6",
      accountId: "fallback-dy-account",
      categoryId: "职场创业",
      status: "generating",
      tier: "B",
      objective: "涨粉引流",
      contentFormat: "短视频脚本",
      copyTitle: "面试反问 HR 的 3 个高分问题",
      copyBody: "生成中：正在补全镜头脚本与互动结尾。",
      imagePrompt: "",
      imageUrl: "",
      videoScript: "生成中",
      videoUrl: "",
      benchmarkTitle: "面试高分反问",
      benchmarkBody: "收藏率高。",
      benchmarkUrl: "https://www.douyin.com/video/demo-job",
      benchmarkUserLink: "",
      benchmarkUserImage: "",
      qualityLabel: "中" as const,
      processMemo: "演示数据：正在生成",
      scoreCompliance: 88,
      scoreQuality: 80,
      scoreConvert: 78,
      scoreTotal: 82,
      adopted: false,
      archived: false,
      failReason: "",
      createdAt: new Date(now - 10 * 60_000),
      updatedAt: new Date(now - 10 * 60_000),
    },
    {
      id: "demo-task-7",
      accountId: "fallback-xhs-account",
      categoryId: "美食探店",
      status: "rejected",
      tier: "C",
      objective: "互动种草",
      contentFormat: "图文笔记",
      copyTitle: "商场负一层隐藏小吃清单",
      copyBody: "内容角度重复，缺少价格与位置，已驳回。",
      imagePrompt: "",
      imageUrl: demoImage("美食探店 · 驳回样例"),
      videoScript: "",
      videoUrl: "",
      benchmarkTitle: "商场小吃测评",
      benchmarkBody: "需要更清楚的价格信息。",
      benchmarkUrl: "https://www.xiaohongshu.com/explore/demo-food",
      benchmarkUserLink: "",
      benchmarkUserImage: "",
      qualityLabel: "差" as const,
      processMemo: "低质内容：进入自动优化策略，后续降低同类模板权重",
      scoreCompliance: 86,
      scoreQuality: 66,
      scoreConvert: 60,
      scoreTotal: 70.1,
      adopted: false,
      archived: false,
      failReason: "信息密度不足",
      createdAt: new Date(now - 48 * 3600_000),
      updatedAt: new Date(now - 47 * 3600_000),
    },
  ] satisfies DemoTask[];

  return {
    nextId: 100,
    settings,
    accounts,
    categories,
    connections,
    linkedAccounts,
    tasks: taskSeed,
  };
}

export function getDemoState(): DemoState {
  if (!globalThis.__tygiDemoState) {
    globalThis.__tygiDemoState = createInitialState();
  }
  return globalThis.__tygiDemoState;
}

function nextId(prefix: string) {
  const state = getDemoState();
  state.nextId += 1;
  return `${prefix}-${state.nextId}`;
}

function withRelations(task: DemoTask, state = getDemoState()) {
  const account = state.accounts.find((item) => item.id === task.accountId);
  const category = state.categories.find((item) => item.id === task.categoryId);
  return {
    ...task,
    account: account
      ? { name: account.name, platform: account.platform }
      : { name: "演示账号", platform: "抖音" },
    category: category ? { name: category.name } : { name: task.categoryId },
  };
}

export function listDemoTasks(filters: TaskFilters) {
  const state = getDemoState();
  let tasks = [...state.tasks];
  if (filters.status) tasks = tasks.filter((t) => t.status === filters.status);
  if (filters.adopted === "true") tasks = tasks.filter((t) => t.adopted);
  if (filters.adopted === "false") tasks = tasks.filter((t) => !t.adopted);
  if (filters.objective) tasks = tasks.filter((t) => t.objective === filters.objective);
  if (filters.contentFormat) tasks = tasks.filter((t) => t.contentFormat === filters.contentFormat);
  if (filters.qualityLabel) tasks = tasks.filter((t) => t.qualityLabel === filters.qualityLabel);
  if (filters.platform) {
    const accountIds = state.accounts
      .filter((item) => item.platform === filters.platform)
      .map((item) => item.id);
    tasks = tasks.filter((t) => accountIds.includes(t.accountId));
  }
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    tasks = tasks.filter((t) => t.createdAt >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    tasks = tasks.filter((t) => t.createdAt <= end);
  }
  if (filters.minScore) {
    const min = Number(filters.minScore);
    tasks = tasks.filter((t) => t.scoreTotal >= min);
  }
  if (filters.maxScore) {
    const max = Number(filters.maxScore);
    tasks = tasks.filter((t) => t.scoreTotal <= max);
  }
  if (filters.efficiency === "采纳") tasks = tasks.filter((t) => t.adopted);
  if (filters.efficiency === "驳回") tasks = tasks.filter((t) => t.status === "rejected");
  if (filters.efficiency === "处理中") {
    tasks = tasks.filter((t) => !t.adopted && t.status !== "rejected");
  }
  tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return tasks.map((task) => withRelations(task, state));
}

export function getDemoStats() {
  const state = getDemoState();
  const total = state.tasks.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = state.tasks.filter((t) => t.createdAt >= today).length;
  const pendingReview = state.tasks.filter((t) => t.status === "review_ready" && !t.adopted).length;
  const adopted = state.tasks.filter((t) => t.adopted).length;
  const rejected = state.tasks.filter((t) => t.status === "rejected").length;
  const published = state.tasks.filter((t) => t.status === "published").length;
  const pendingTask = state.tasks.filter((t) => t.status === "pending_task").length;
  const pendingPublish = state.tasks.filter((t) => ["pending_publish", "completed"].includes(t.status)).length;
  return {
    totalTasks: total,
    todayGenerated: todayCount,
    pendingReview,
    pendingTask,
    pendingPublish,
    adopted,
    rejected,
    published,
    adoptionRate: total === 0 ? 0 : Number(((adopted / total) * 100).toFixed(1)),
    rejectionRate: total === 0 ? 0 : Number(((rejected / total) * 100).toFixed(1)),
    accounts: state.accounts.length,
    categories: state.categories.length,
    dailyTarget: state.settings.dailyCount,
    premiumSlots: state.settings.premiumSlots,
    scheduleHour: state.settings.scheduleHour,
    fallback: true,
  };
}

export function getDemoReviewStats() {
  const state = getDemoState();
  const pendingReview = state.tasks.filter((t) => t.status === "review_ready").length;
  const adopted = state.tasks.filter((t) => t.adopted).length;
  const aiAdopted = state.tasks.filter((t) => t.adopted && t.scoreTotal >= 80).length;
  const aiRecommendedTotal = state.tasks.filter((t) => t.scoreTotal >= 80).length;
  const reviewed = adopted + state.settings.rejectedCount;
  return {
    reviewed,
    pendingReview,
    rejected: state.settings.rejectedCount,
    adoptionRate: reviewed === 0 ? 0 : Number(((adopted / reviewed) * 100).toFixed(1)),
    aiRecommendAdoptionRate:
      aiRecommendedTotal === 0 ? 0 : Number(((aiAdopted / aiRecommendedTotal) * 100).toFixed(1)),
    aiAdoptedCount: aiAdopted,
    fallback: true,
  };
}

export function getDemoConnections() {
  return { connections: [...getDemoState().connections], fallback: true };
}

export function upsertDemoConnection(platform: string, accountName: string, connected: boolean) {
  const state = getDemoState();
  const existing = state.connections.find((item) => item.platform === platform);
  if (existing) {
    existing.accountName = accountName;
    existing.connected = connected;
    existing.tokenMask = connected ? "tok_demo_***" : "";
    existing.updatedAt = new Date();
    return existing;
  }
  const created: DemoConnection = {
    id: nextId("conn"),
    platform,
    accountName,
    connected,
    tokenMask: connected ? "tok_demo_***" : "",
    updatedAt: new Date(),
  };
  state.connections.push(created);
  return created;
}

export function listDemoLinkedAccounts() {
  const state = getDemoState();
  return state.linkedAccounts.map((item) => ({
    ...item,
    lastTestAt: item.lastTestAt.toISOString(),
  }));
}

export function createDemoLinkedAccount(platform: string, username: string) {
  const state = getDemoState();
  const existing = state.linkedAccounts.find((item) => item.platform === platform && item.username === username);
  const now = new Date();
  if (existing) {
    existing.connected = true;
    existing.lastTestStatus = "ok";
    existing.lastTestAt = now;
  } else {
    state.linkedAccounts.unshift({
      id: nextId("linked"),
      platform,
      username,
      passwordMask: "******",
      connected: true,
      lastTestStatus: "ok",
      lastTestAt: now,
    });
  }
  upsertDemoConnection(platform, username, true);
}

export function setDemoDefaultLinkedAccount(platform: string, username: string) {
  upsertDemoConnection(platform, username, true);
}

export function deleteDemoLinkedAccount(id: string) {
  const state = getDemoState();
  const index = state.linkedAccounts.findIndex((item) => item.id === id);
  if (index < 0) return false;
  state.linkedAccounts.splice(index, 1);
  return true;
}

export function publishDemoTask(taskId: string, platform: string) {
  const state = getDemoState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error("任务不存在");
  const conn = state.connections.find((item) => item.platform === platform);
  if (!conn?.connected) throw new Error(`${platform} 账号未连接`);
  task.status = "published";
  task.processMemo = `已推送 ${platform} 草稿，账号：${conn.accountName || `${platform}默认账号`}`;
  task.updatedAt = new Date();
  return {
    ok: true,
    draftUrl: `https://draft.example.com/${encodeURIComponent(platform)}/${task.id}`,
    message: `已生成 ${platform} 草稿，请人工预览并保存`,
  };
}

export function patchDemoTask(
  id: string,
  body: {
    action?: string;
    copyTitle?: string;
    copyBody?: string;
    imageUrl?: string;
    videoUrl?: string;
    videoScript?: string;
    prompt?: string;
    qualityLabel?: "好" | "中" | "差";
  }
) {
  const state = getDemoState();
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return { error: "任务不存在", status: 404 as const };

  if (body.action === "adopt") {
    task.adopted = true;
    task.archived = false;
    task.status = "pending_publish";
    task.processMemo = "已审核通过，进入待发布队列";
    task.updatedAt = new Date();
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "reject") {
    task.status = "rejected";
    task.adopted = false;
    task.processMemo = "已驳回，等待后续优化";
    task.updatedAt = new Date();
    state.settings.rejectedCount += 1;
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "save_edit") {
    task.copyTitle = body.copyTitle ?? task.copyTitle;
    task.copyBody = body.copyBody ?? task.copyBody;
    task.imageUrl = body.imageUrl ?? task.imageUrl;
    task.videoUrl = body.videoUrl ?? task.videoUrl;
    task.videoScript = body.videoScript ?? task.videoScript;
    task.processMemo = "人工编辑并保存";
    task.updatedAt = new Date();
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "regenerate") {
    task.copyTitle = `${task.copyTitle}（优化版）`;
    task.copyBody = `${task.copyBody}\n\n补充优化：${body.prompt || "已按最新要求优化表达节奏与结构。"}`;
    task.processMemo = "演示模式：已重新生成并覆盖";
    task.updatedAt = new Date();
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "label") {
    const qualityLabel = body.qualityLabel ?? "中";
    task.qualityLabel = qualityLabel;
    task.processMemo =
      qualityLabel === "好"
        ? "优质内容：记录模型与流程作为可复用模板"
        : qualityLabel === "差"
          ? "低质内容：进入自动优化策略，后续降低同类模板权重"
          : "中等内容：保留并等待迭代优化";
    task.updatedAt = new Date();
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "publish") {
    task.status = "published";
    task.processMemo = "已配置平台发布草稿，待人工确认发布";
    task.updatedAt = new Date();
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "delete" || body.action === "end_task") {
    state.tasks = state.tasks.filter((item) => item.id !== id);
    return { ok: true, status: 200 as const };
  }
  if (body.action === "pause_task") {
    task.status = "paused";
    task.processMemo = "任务已暂停，等待继续或结束";
    task.updatedAt = new Date();
    return { task: withRelations(task, state), status: 200 as const };
  }
  if (body.action === "clone_task") {
    const cloned: DemoTask = {
      ...task,
      id: nextId("task"),
      status: "pending_task",
      copyTitle: `${task.copyTitle} · 复制`,
      processMemo: "基于优质内容复制并创建新任务",
      adopted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    state.tasks.unshift(cloned);
    return { task: withRelations(cloned, state), status: 200 as const };
  }
  return { error: "未知操作", status: 400 as const };
}

export function createDemoTasksFromRun(input: {
  platform: PlatformChoice;
  categoryId: string;
  objective: string;
  contentFormat: string;
  count: number;
  benchmarkLink?: string;
}) {
  const state = getDemoState();
  const account =
    state.accounts.find((item) => item.platform === input.platform) ?? state.accounts[0]!;
  const category =
    state.categories.find((item) => item.id === input.categoryId || item.name === input.categoryId) ??
    state.categories[0]!;
  const created: DemoTask[] = [];
  for (let index = 0; index < input.count; index += 1) {
    const contentFormat =
      input.contentFormat || CONTENT_FORMATS[index % CONTENT_FORMATS.length] || "图文笔记";
    const objective =
      input.objective || CONTENT_GOALS[index % CONTENT_GOALS.length] || "涨粉引流";
    const taskId = nextId("task");
    const title = `${category.name}${index + 1}号选题：${objective}`;
    const body =
      input.platform === "小红书"
        ? `这是一条为「${category.name}」赛道生成的小红书内容，目标是「${objective}」。\n\n先给结论，再给场景，再补充清单式细节，末尾抛问题引导评论。`
        : `这是一条为「${category.name}」赛道生成的抖音内容，目标是「${objective}」。\n\n前 3 秒给结果，中段给方法，结尾给互动问题，适合短视频节奏。`;
    const isImage = contentFormat === "图文笔记" || contentFormat === "合集系列";
    const isVideo = contentFormat === "短视频脚本";
    const task: DemoTask = {
      id: taskId,
      accountId: account.id,
      categoryId: category.id,
      status: "review_ready",
      tier: "A",
      objective,
      contentFormat,
      copyTitle: title,
      copyBody: body,
      imagePrompt: isImage ? `${category.name}演示封面` : "",
      imageUrl: isImage ? demoImage(`${category.name} · ${contentFormat}`) : "",
      videoScript: isVideo ? "开场结论 -> 中段步骤 -> 结尾互动问题" : "",
      videoUrl: isVideo ? demoVideo(taskId) : "",
      benchmarkTitle: input.benchmarkLink ? "用户粘贴对标链接" : `${category.name}演示对标`,
      benchmarkBody: input.benchmarkLink ? "已根据用户提供的链接做演示生成。" : "演示模式对标说明",
      benchmarkUrl: input.benchmarkLink || "",
      benchmarkUserLink: input.benchmarkLink || "",
      benchmarkUserImage: "",
      qualityLabel: "中",
      processMemo: "演示模式生成，等待审核",
      scoreCompliance: 92,
      scoreQuality: 86,
      scoreConvert: 84,
      scoreTotal: 87.4,
      adopted: false,
      archived: false,
      failReason: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    created.push(task);
  }
  state.tasks = [...created, ...state.tasks];
  return created.map((task) => withRelations(task, state));
}
