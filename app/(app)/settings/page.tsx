"use client";

import { useCallback, useEffect, useState } from "react";

type RuleSource = "auto" | "manual" | "mixed";

type PlatformRuleDraft = {
  platform: string;
  source: RuleSource;
  maxTitleLen: number;
  maxBodyLen: number;
  mediaPolicy: "text_only" | "image_only" | "video_only" | "mixed";
  bannedKeywords: string;
  requiresHashtag: boolean;
  requiresDisclaimer: boolean;
  publishWindow: string;
  notes: string;
};

const DEFAULT_RULES: PlatformRuleDraft[] = [
  {
    platform: "淘宝",
    source: "mixed",
    maxTitleLen: 20,
    maxBodyLen: 500,
    mediaPolicy: "mixed",
    bannedKeywords: "最, 第一, 国家级",
    requiresHashtag: false,
    requiresDisclaimer: true,
    publishWindow: "09:00-22:00",
    notes: "优先图文详情节奏，避免夸张承诺",
  },
  {
    platform: "京东",
    source: "mixed",
    maxTitleLen: 22,
    maxBodyLen: 600,
    mediaPolicy: "mixed",
    bannedKeywords: "包治百病, 绝对",
    requiresHashtag: false,
    requiresDisclaimer: true,
    publishWindow: "09:00-23:00",
    notes: "参数与保障优先，弱化情绪化表达",
  },
  {
    platform: "小红书",
    source: "mixed",
    maxTitleLen: 20,
    maxBodyLen: 1000,
    mediaPolicy: "mixed",
    bannedKeywords: "医疗级, 药效",
    requiresHashtag: true,
    requiresDisclaimer: true,
    publishWindow: "08:00-23:00",
    notes: "强调体验与场景，鼓励收藏互动",
  },
  {
    platform: "抖音",
    source: "mixed",
    maxTitleLen: 30,
    maxBodyLen: 300,
    mediaPolicy: "video_only",
    bannedKeywords: "永久有效, 无风险",
    requiresHashtag: true,
    requiresDisclaimer: true,
    publishWindow: "10:00-24:00",
    notes: "短句节奏，前3秒给结果钩子",
  },
];

export default function SettingsPage() {
  const [dailyCount, setDailyCount] = useState(10);
  const [premiumSlots, setPremiumSlots] = useState(2);
  const [scheduleHour, setScheduleHour] = useState(9);
  const [bannedWords, setBannedWords] = useState("最, 第一, 国家级");
  const [maxConcurrentTask, setMaxConcurrentTask] = useState(20);
  const [maxPublishPerHour, setMaxPublishPerHour] = useState(30);
  const [minScoreForPublish, setMinScoreForPublish] = useState(70);
  const [autoDeleteRejected, setAutoDeleteRejected] = useState(true);
  const [complianceLevel, setComplianceLevel] = useState("strict");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connections, setConnections] = useState<
    { platform: string; connected: boolean; accountName: string; tokenMask: string }[]
  >([]);
  const [accountPool, setAccountPool] = useState<
    { id: string; platform: string; username: string; connected: boolean; lastTestStatus: string; lastTestAt: string }[]
  >([]);
  const [loginForm, setLoginForm] = useState<Record<string, { username: string; password: string }>>({});
  const [rules, setRules] = useState<PlatformRuleDraft[]>(DEFAULT_RULES);
  const [activePlatform, setActivePlatform] = useState("淘宝");
  const [autoFillMode, setAutoFillMode] = useState<"auto_only" | "manual_override">("manual_override");
  const [failureAlertThreshold, setFailureAlertThreshold] = useState(15);
  const [humanReviewSampleRate, setHumanReviewSampleRate] = useState(20);
  const [publishRetry, setPublishRetry] = useState(1);
  const [publishCooldownMins, setPublishCooldownMins] = useState(10);

  const load = useCallback(async () => {
    const r = await fetch("/api/settings");
    const j = (await r.json()) as {
      dailyCount: number;
      premiumSlots: number;
      scheduleHour: number;
      bannedWords: string[];
      maxConcurrentTask: number;
      maxPublishPerHour: number;
      minScoreForPublish: number;
      autoDeleteRejected: boolean;
      complianceLevel: string;
    };
    setDailyCount(j.dailyCount);
    setPremiumSlots(j.premiumSlots);
    setScheduleHour(j.scheduleHour);
    setBannedWords(j.bannedWords.join(", "));
    setMaxConcurrentTask(j.maxConcurrentTask);
    setMaxPublishPerHour(j.maxPublishPerHour);
    setMinScoreForPublish(j.minScoreForPublish);
    setAutoDeleteRejected(j.autoDeleteRejected);
    setComplianceLevel(j.complianceLevel);
    const c = await fetch("/api/connections");
    const cj = (await c.json()) as {
      connections: { platform: string; connected: boolean; accountName: string; tokenMask: string }[];
    };
    setConnections(cj.connections);
    const poolRes = await fetch("/api/connections/accounts");
    const poolJson = (await poolRes.json()) as {
      accounts: { id: string; platform: string; username: string; connected: boolean; lastTestStatus: string; lastTestAt: string }[];
    };
    setAccountPool(poolJson.accounts || []);
    setRules((prev) =>
      prev.map((r) => ({
        ...r,
        source: cj.connections.find((c) => c.platform === r.platform)?.connected ? r.source : "manual",
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    const words = bannedWords
      .split(/[，,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyCount,
          premiumSlots,
          scheduleHour,
          bannedWords: words,
          maxConcurrentTask,
          maxPublishPerHour,
          minScoreForPublish,
          autoDeleteRejected,
          complianceLevel,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function toggleConnection(platform: string, connect: boolean) {
    await fetch("/api/connections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        action: connect ? "connect" : "disconnect",
      }),
    });
    await load();
  }

  async function loginAndTest(platform: string) {
    const f = loginForm[platform];
    if (!f?.username || !f?.password) return;
    const r = await fetch("/api/connections/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        username: f.username,
        password: f.password,
      }),
    });
    const j = (await r.json()) as { error?: string };
    if (!r.ok) {
      alert(j.error || "登录测试失败");
      return;
    }
    setLoginForm((prev) => ({ ...prev, [platform]: { username: "", password: "" } }));
    await load();
  }

  async function setDefaultAccount(platform: string, username: string) {
    await fetch("/api/connections/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_default", platform, username }),
    });
    await load();
  }

  async function removeAccount(id: string) {
    await fetch(`/api/connections/accounts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    await load();
  }

  const activeRule = rules.find((r) => r.platform === activePlatform) ?? rules[0]!;

  function updateActiveRule<K extends keyof PlatformRuleDraft>(key: K, value: PlatformRuleDraft[K]) {
    setRules((prev) => prev.map((r) => (r.platform === activePlatform ? { ...r, [key]: value } : r)));
  }

  if (loading) {
    return (
      <div className="text-sm text-[hsl(var(--muted))]">加载配置…</div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">策略配置</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          该页面决定内容“能不能稳定产出、是否符合平台规则、能不能顺利发布”。建议由运营负责人定期复盘并维护。
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-base font-semibold">一、平台账号接入（生产/发布前置）</h2>
            <p className="text-xs text-[hsl(var(--muted))]">
              支持多平台多账号登录：输入账号密码后进行登录测试，成功后加入账号池，并可设置“发布默认账号”。
            </p>
            <div className="space-y-2">
              {connections.map((item) => (
                <div
                  key={item.platform}
                  className="rounded-xl border border-[hsl(var(--border)/0.45)] px-3 py-2"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm">{item.platform}</div>
                      <div className="text-xs text-[hsl(var(--muted))]">
                        当前发布默认账号：
                        {item.connected ? `${item.accountName}` : "未设置"}
                      </div>
                    </div>
                    <button
                      onClick={() => void toggleConnection(item.platform, !item.connected)}
                      className="btn-secondary rounded-lg px-3 py-1.5 text-xs h-auto"
                    >
                      {item.connected ? "断开发布默认" : "启用发布默认"}
                    </button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_120px]">
                    <input
                      className="biz-control"
                      placeholder="输入账号"
                      value={loginForm[item.platform]?.username || ""}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          [item.platform]: {
                            username: e.target.value,
                            password: prev[item.platform]?.password || "",
                          },
                        }))
                      }
                    />
                    <input
                      className="biz-control"
                      type="password"
                      placeholder="输入密码"
                      value={loginForm[item.platform]?.password || ""}
                      onChange={(e) =>
                        setLoginForm((prev) => ({
                          ...prev,
                          [item.platform]: {
                            username: prev[item.platform]?.username || "",
                            password: e.target.value,
                          },
                        }))
                      }
                    />
                    <button
                      className="btn-primary rounded-xl"
                      onClick={() => void loginAndTest(item.platform)}
                    >
                      登录测试
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {accountPool
                      .filter((x) => x.platform === item.platform)
                      .map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border)/0.4)] px-2 py-1.5 text-xs">
                          <div>
                            {row.username} · {row.lastTestStatus === "ok" ? "登录可用" : "登录失败"} · {new Date(row.lastTestAt).toLocaleString()}
                          </div>
                          <div className="flex gap-1">
                            <button className="btn-secondary rounded-lg px-2 py-1 text-[11px] h-auto" onClick={() => void setDefaultAccount(item.platform, row.username)}>
                              设为默认
                            </button>
                            <button className="btn-secondary rounded-lg px-2 py-1 text-[11px] h-auto" onClick={() => void removeAccount(row.id)}>
                              移除
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-base font-semibold">二、生产与发布主策略</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">每日生成条数</span>
                <input type="number" min={1} max={50} value={dailyCount} onChange={(e) => setDailyCount(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">Premium 槽位</span>
                <input type="number" min={0} max={dailyCount} value={premiumSlots} onChange={(e) => setPremiumSlots(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">最大并发任务数</span>
                <input type="number" min={1} max={200} value={maxConcurrentTask} onChange={(e) => setMaxConcurrentTask(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">每小时最大发布量</span>
                <input type="number" min={1} max={500} value={maxPublishPerHour} onChange={(e) => setMaxPublishPerHour(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">发布最低评分阈值</span>
                <input type="number" min={0} max={100} value={minScoreForPublish} onChange={(e) => setMinScoreForPublish(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">计划生成时刻（0-23）</span>
                <input type="number" min={0} max={23} value={scheduleHour} onChange={(e) => setScheduleHour(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">发布失败重试次数</span>
                <input type="number" min={0} max={5} value={publishRetry} onChange={(e) => setPublishRetry(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">重试冷却（分钟）</span>
                <input type="number" min={0} max={180} value={publishCooldownMins} onChange={(e) => setPublishCooldownMins(Number(e.target.value))} className="biz-control mt-2 w-full" />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-[hsl(var(--muted))]">合规审查级别</span>
                <select value={complianceLevel} onChange={(e) => setComplianceLevel(e.target.value)} className="biz-control mt-2 w-full">
                  <option value="strict">strict（严格）</option>
                  <option value="balanced">balanced（平衡）</option>
                  <option value="loose">loose（宽松）</option>
                </select>
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-[hsl(var(--muted))]">禁入词（逗号分隔）</span>
                <textarea value={bannedWords} onChange={(e) => setBannedWords(e.target.value)} rows={3} className="biz-control mt-2 w-full !h-auto py-2" />
              </label>
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={autoDeleteRejected} onChange={(e) => setAutoDeleteRejected(e.target.checked)} />
                <span className="text-[hsl(var(--muted))]">驳回后自动删除（符合当前流程）</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-base font-semibold">三、平台规则中心（自动填充 + 手动覆盖）</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">当前平台</span>
                <select className="biz-control mt-2 w-full" value={activePlatform} onChange={(e) => setActivePlatform(e.target.value)}>
                  {rules.map((r) => (
                    <option key={r.platform} value={r.platform}>
                      {r.platform}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">规则填充策略</span>
                <select className="biz-control mt-2 w-full" value={autoFillMode} onChange={(e) => setAutoFillMode(e.target.value as "auto_only" | "manual_override")}>
                  <option value="auto_only">仅自动规则（可拉取则拉取）</option>
                  <option value="manual_override">自动 + 人工覆盖（推荐）</option>
                </select>
              </label>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border)/0.45)] p-3">
              <div className="mb-2 text-xs text-[hsl(var(--muted))]">规则来源</div>
              <div className="text-sm">
                {activeRule.source === "auto"
                  ? "自动拉取"
                  : activeRule.source === "manual"
                    ? "人工配置"
                    : "自动 + 人工覆盖"}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">标题最大长度</span>
                <input className="biz-control mt-2 w-full" type="number" min={1} max={120} value={activeRule.maxTitleLen} onChange={(e) => updateActiveRule("maxTitleLen", Number(e.target.value))} />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">正文最大长度</span>
                <input className="biz-control mt-2 w-full" type="number" min={1} max={3000} value={activeRule.maxBodyLen} onChange={(e) => updateActiveRule("maxBodyLen", Number(e.target.value))} />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">媒体限制</span>
                <select className="biz-control mt-2 w-full" value={activeRule.mediaPolicy} onChange={(e) => updateActiveRule("mediaPolicy", e.target.value as PlatformRuleDraft["mediaPolicy"])}>
                  <option value="mixed">图文/视频均可</option>
                  <option value="text_only">仅纯文字</option>
                  <option value="image_only">仅图文</option>
                  <option value="video_only">仅视频</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">发布时间窗</span>
                <input className="biz-control mt-2 w-full" value={activeRule.publishWindow} onChange={(e) => updateActiveRule("publishWindow", e.target.value)} placeholder="如 09:00-22:00" />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-[hsl(var(--muted))]">平台禁用词</span>
                <input className="biz-control mt-2 w-full" value={activeRule.bannedKeywords} onChange={(e) => updateActiveRule("bannedKeywords", e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={activeRule.requiresHashtag} onChange={(e) => updateActiveRule("requiresHashtag", e.target.checked)} />
                <span className="text-[hsl(var(--muted))]">强制话题标签</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={activeRule.requiresDisclaimer} onChange={(e) => updateActiveRule("requiresDisclaimer", e.target.checked)} />
                <span className="text-[hsl(var(--muted))]">强制风险免责声明</span>
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="text-[hsl(var(--muted))]">规则备注</span>
                <textarea className="biz-control mt-2 w-full !h-auto py-2" rows={3} value={activeRule.notes} onChange={(e) => updateActiveRule("notes", e.target.value)} />
              </label>
            </div>
          </div>

          <div className="glass space-y-4 rounded-2xl p-6">
            <h2 className="text-base font-semibold">四、质量回流与告警</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">失败告警阈值（%）</span>
                <input className="biz-control mt-2 w-full" type="number" min={1} max={100} value={failureAlertThreshold} onChange={(e) => setFailureAlertThreshold(Number(e.target.value))} />
              </label>
              <label className="block text-sm">
                <span className="text-[hsl(var(--muted))]">人工抽检比例（%）</span>
                <input className="biz-control mt-2 w-full" type="number" min={0} max={100} value={humanReviewSampleRate} onChange={(e) => setHumanReviewSampleRate(Number(e.target.value))} />
              </label>
            </div>
            <div className="rounded-xl border border-[hsl(var(--border)/0.45)] p-3 text-xs text-[hsl(var(--muted))]">
              推荐机制：当平台发布失败率超过阈值时，自动将该平台规则来源切换为“人工优先”，并提醒运营复核禁用词和长度限制。
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 z-20 flex justify-end gap-2">
        <button type="button" onClick={() => void load()} className="btn-secondary rounded-xl">
          还原配置
        </button>
        <button
          type="button"
          onClick={() => void save()}
          className="btn-primary rounded-xl"
        >
          {saving ? "保存中..." : saved ? "已保存" : "保存策略配置"}
        </button>
      </div>
    </div>
  );
}
