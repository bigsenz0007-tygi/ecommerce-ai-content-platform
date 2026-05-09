"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { BizDropdown } from "@/components/BizDropdown";

type Stats = {
  totalTasks: number;
  todayGenerated: number;
  pendingReview: number;
  pendingTask: number;
  pendingPublish: number;
  adopted: number;
  rejected: number;
  published: number;
  adoptionRate: number;
  rejectionRate: number;
  accounts: number;
  categories: number;
  dailyTarget: number;
  premiumSlots: number;
  scheduleHour: number;
};

type OptionData = {
  platforms: ("淘宝" | "京东" | "小红书" | "抖音")[];
  accounts: { id: string; name: string; platform: string }[];
  categories: { id: string; name: string }[];
  objectives: ("涨粉" | "互动" | "关注" | "分享")[];
  formats: ("图文" | "视频文字" | "纯文字")[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [options, setOptions] = useState<OptionData | null>(null);
  const [mode, setMode] = useState<"random" | "precise">("random");
  const [platform, setPlatform] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [objective, setObjective] = useState("");
  const [contentFormat, setContentFormat] = useState("");
  const [countInput, setCountInput] = useState("");
  const [accountPersona, setAccountPersona] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [productStage, setProductStage] = useState("");
  const [contentScenario, setContentScenario] = useState("");
  const [sellingFocus, setSellingFocus] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("");
  const [publishNode, setPublishNode] = useState("");
  const [contentLength, setContentLength] = useState("");
  const [toneStrength, setToneStrength] = useState("");
  const [competitiveBenchmark, setCompetitiveBenchmark] = useState("");
  const [contentStyle, setContentStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [auth, setAuth] = useState<{ loggedIn: boolean }>({ loggedIn: false });
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    desc: string;
    actionLabel: string;
    actionHref: string;
  } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/stats");
    const j = (await r.json()) as Stats;
    setStats(j);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadOptions() {
      const r = await fetch("/api/options");
      const j = (await r.json()) as OptionData;
      setOptions(j);
    }
    void loadOptions();
  }, []);

  useEffect(() => {
    async function loadAuth() {
      const r = await fetch("/api/auth/me");
      const j = (await r.json()) as { loggedIn: boolean };
      setAuth({ loggedIn: !!j.loggedIn });
    }
    void loadAuth();
  }, []);

  useEffect(() => {
    if (!options) return;
    if (!platform) {
      setAccountId("");
      return;
    }
    const inPlatform = options.accounts.some((a) => a.id === accountId && a.platform === platform);
    if (!inPlatform) setAccountId("");
  }, [platform, options, accountId]);

  async function runGenerate() {
    if (!platform || !accountId || !categoryId || (mode === "precise" && (!objective || !contentFormat))) {
      emitToast("请选择内容", "继续填写", "/dashboard");
      return;
    }
    const parsedCount = Number(countInput || 0);
    if (!parsedCount || parsedCount < 1) {
      emitToast("请输入数量", "继续填写", "/dashboard");
      return;
    }
    setLoading(true);
    setMsg("");
    const safeCount = mode === "random" ? Math.max(1, Math.min(10, parsedCount)) : Math.max(1, Math.min(50, parsedCount));
    if (!auth.loggedIn && mode !== "random") {
      emitToast("请先登录后使用精准生", "去登录", "/login?next=/dashboard");
      return;
    }
    if (!auth.loggedIn && safeCount > 3) {
      emitToast("未登录最多生成3条图文", "去登录", "/login?next=/dashboard");
      return;
    }
    const heavy = mode === "precise" ? safeCount >= 8 : safeCount >= 7;
    const reviewHref = buildReviewHref(platform, mode === "precise" ? objective : "");
    const contentHref = buildContentHref(platform);
    if (heavy) {
      setDialog({
        open: true,
        title: "正在生！",
        desc: "阁下可以稍作休息，我一会儿通知您，也可以去全部任务页查看进度。",
        actionLabel: "去查看",
        actionHref: contentHref,
      });
    }
    const start = Date.now();
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          accountId,
          categoryId,
          objective,
          contentFormat,
          count: safeCount,
          advancedContext:
            mode === "precise"
              ? {
                  账号人设: accountPersona,
                  目标人群: targetAudience,
                  产品阶段: productStage,
                  内容场景: contentScenario,
                  卖点侧重: sellingFocus,
                  合规过滤: complianceFilter,
                  发布节点: publishNode,
                  内容长度: contentLength,
                  语气强度: toneStrength,
                  竞品对标: competitiveBenchmark,
                  内容风格: contentStyle,
                }
              : {},
        }),
      });
      const j = (await r.json()) as { message?: string; error?: string };
      if (!r.ok) {
        setDialog(null);
        emitToast(j.error || "生成失败，请检查筛选项后重试", "继续填写", "/dashboard");
        return;
      }
      setMsg(j.message || "已生成");
      const elapsed = Date.now() - start;
      const doneFast = !heavy && elapsed < 2500;
      if (doneFast) {
        setDialog({
          open: true,
          title: "已生完！",
          desc: "阁下请移步至审核界面进行审核。",
          actionLabel: "去审核",
          actionHref: reviewHref,
        });
      } else {
        emitToast("生成任务已完成，速速去审核", "去审核", reviewHref);
      }
      emitGlobalToast("生成任务已完成，速速去审核", "去审核", reviewHref);
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="biz-section-title">Happy Tygi</h1>
        <p className="biz-inline-note mt-2 max-w-3xl">
          今天又是搞钱的一天，发发发，Tygi！
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="生成总数" value={stats?.totalTasks ?? "—"} actionHref="/content" actionLabel="去查看" />
        <StatCard
          label="待完成任务数"
          value={stats?.pendingTask ?? "—"}
          actionHref="/content?status=pending_task"
          actionLabel="去查看"
        />
        <StatCard
          label="待审核"
          value={stats?.pendingReview ?? "—"}
          actionHref="/review"
          actionLabel="去审核"
        />
        <StatCard
          label="待发布"
          value={stats?.pendingPublish ?? "—"}
          actionHref="/publish"
          actionLabel="去发布"
        />
      </div>

      <div>
        <div className="mb-3 fs-20 font-semibold tracking-tight text-[hsl(var(--foreground))]">
          Tygi！立即开干吧！
        </div>
        <div className="mb-3 flex justify-start gap-3">
          <button
            type="button"
            onClick={() => setMode("random")}
            className={`rounded-xl px-8 py-2 fs-14 border transition active:scale-[0.98] ${mode === "random" ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.24)] shadow-[0_0_24px_-10px_hsl(var(--accent)/0.65)]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-raised)/0.75)]"}`}
          >
            随便生
          </button>
          <button
            type="button"
            onClick={() => setMode("precise")}
            className={`rounded-xl px-8 py-2 fs-14 border transition active:scale-[0.98] ${mode === "precise" ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.24)] shadow-[0_0_24px_-10px_hsl(var(--accent)/0.65)]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--surface-raised)/0.75)]"}`}
          >
            精准生
          </button>
        </div>
        {!auth.loggedIn ? (
          <div className="mb-2 fs-12 text-[hsl(var(--muted))]">
            当前为体验模式：仅支持随便生，最多3条图文。完整功能请先登录。
          </div>
        ) : null}
        <div className="biz-panel ring-glow">
          <div className="grid gap-3 md:grid-cols-3">
            <FieldRow label="平台" required>
              <BizDropdown
                className="w-full"
                value={platform}
                placeholder="请选择"
                options={(options?.platforms || []).map((p) => ({ label: p, value: p }))}
                onChange={setPlatform}
              />
            </FieldRow>
            <FieldRow label="账号" required>
              <BizDropdown
                className="w-full"
                value={accountId}
                placeholder="请选择"
                onChange={setAccountId}
                options={(options?.accounts || [])
                  .filter((a) => a.platform === platform)
                  .map((a) => ({ label: a.name, value: a.id }))}
              />
            </FieldRow>
            <FieldRow label="品类" required>
              <BizDropdown
                className="w-full"
                value={categoryId}
                placeholder="请选择"
                options={(options?.categories || []).map((c) => ({ label: c.name, value: c.id }))}
                onChange={setCategoryId}
              />
            </FieldRow>
            {mode === "precise" ? (
              <>
                <FieldRow label="目标" required>
                  <BizDropdown
                    className="w-full"
                    value={objective}
                    placeholder="请选择"
                    options={(options?.objectives || []).map((o) => ({ label: o, value: o }))}
                    onChange={setObjective}
                  />
                </FieldRow>
                <FieldRow label="格式" required>
                  <BizDropdown
                    className="w-full"
                    value={contentFormat}
                    placeholder="请选择"
                    options={(options?.formats || []).map((f) => ({ label: f, value: f }))}
                    onChange={setContentFormat}
                  />
                </FieldRow>
                <FieldRow label="数量" required>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    placeholder="请输入1-50"
                    className="biz-control w-full"
                  />
                </FieldRow>
              </>
            ) : (
              <>
                <FieldRow label="数量" required>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    placeholder="请输入1-10"
                    className="biz-control w-full"
                  />
                </FieldRow>
              </>
            )}
          </div>
          {mode === "precise" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <FieldRow label="账号人设"><BizDropdown placeholder="请选择" value={accountPersona} onChange={setAccountPersona} options={["专业测评官","软萌种草博主","高冷极简风","平价学生党","职场精致党","宝妈分享家","硬核技术流"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="目标人群"><BizDropdown placeholder="请选择" value={targetAudience} onChange={setTargetAudience} options={["学生党","职场女性","敏感肌人群","宝妈群体","银发族","健身爱好者","预算敏感用户"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="产品阶段"><BizDropdown placeholder="请选择" value={productStage} onChange={setProductStage} options={["新品首发","日常在售","爆款维护","清仓促销","预售预热","联名限定"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="内容场景"><BizDropdown placeholder="请选择" value={contentScenario} onChange={setContentScenario} options={["日常使用分享","节日促销种草","痛点解决方案","竞品对比测评","场景化搭配推荐","干货科普"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="卖点侧重"><BizDropdown placeholder="请选择" value={sellingFocus} onChange={setSellingFocus} options={["功效效果","成分安全","性价比","颜值设计","口碑背书","功能实用性"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="合规过滤"><BizDropdown placeholder="请选择" value={complianceFilter} onChange={setComplianceFilter} options={["禁用极限词","禁用医疗宣称","禁用平台敏感词","无过滤"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="发布节点"><BizDropdown placeholder="请选择" value={publishNode} onChange={setPublishNode} options={["日常通用","618","双11","女神节","开学季","年货节","618预售","双11预热"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="内容长度"><BizDropdown placeholder="请选择" value={contentLength} onChange={setContentLength} options={["短标题（15字内）","短句（30字内）","短笔记（300字内）","中长笔记（300-800字）","长详情（800字以上）"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="语气强度"><BizDropdown placeholder="请选择" value={toneStrength} onChange={setToneStrength} options={["温和种草","客观测评","强力安利","理性分析","幽默接地气"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="竞品对标"><BizDropdown placeholder="请选择" value={competitiveBenchmark} onChange={setCompetitiveBenchmark} options={["不对标","对标品类TOP10","对标指定竞品"].map((v)=>({label:v,value:v}))} /></FieldRow>
              <FieldRow label="内容风格"><BizDropdown placeholder="请选择" value={contentStyle} onChange={setContentStyle} options={["日系清新","韩系ins风","欧美极简风","国潮国风","小众文艺风","硬核科技风"].map((v)=>({label:v,value:v}))} /></FieldRow>
            </div>
          ) : null}
          <div className="mt-2 fs-12 text-[hsl(var(--muted))]">
            {mode === "random"
              ? "随便生：不限制图文/视频/纯文类型，自动按平台基础规范与爆文结构随机生成。"
              : "精准生：按基础字段 + 高级约束字段定向生产，更适合投放和复盘。"}
          </div>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => void runGenerate()}
            disabled={loading || !options}
            className="biz-primary-btn min-w-[220px]"
          >
            {loading ? "生成中…" : "好！开生！"}
          </button>
        </div>
        {msg ? <div className="mt-2 fs-12 text-[hsl(var(--accent))]">{msg}</div> : null}
      </div>
      {dialog?.open ? (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/45 p-4">
          <div className="glass w-full max-w-md rounded-2xl p-4">
            <div className="fs-18 font-semibold">{dialog.title}</div>
            <div className="mt-2 fs-14 text-[hsl(var(--muted))]">{dialog.desc}</div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 fs-14">
                稍后
              </button>
              <a href={dialog.actionHref} className="biz-primary-btn inline-flex items-center justify-center">
                {dialog.actionLabel}
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldRow({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="biz-label w-20 shrink-0 text-right">
        {required ? <span className="mr-0.5 text-[hsl(var(--accent))]">*</span> : null}
        {label}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function buildReviewHref(platform: string, objective: string) {
  const q = new URLSearchParams();
  if (platform) q.set("platform", platform);
  if (objective) q.set("objective", objective);
  return `/review${q.toString() ? `?${q.toString()}` : ""}`;
}

function buildContentHref(platform: string) {
  const q = new URLSearchParams();
  if (platform) q.set("platform", platform);
  return `/content${q.toString() ? `?${q.toString()}` : ""}`;
}

function emitToast(message: string, actionLabel?: string, actionHref?: string) {
  if (typeof window === "undefined") return;
  const detail = { id: `${Date.now()}`, message, actionLabel, actionHref };
  window.dispatchEvent(new CustomEvent("tygi:toast", { detail }));
}

function emitGlobalToast(message: string, actionLabel?: string, actionHref?: string) {
  if (typeof window === "undefined") return;
  const payload = { id: `${Date.now()}`, message, actionLabel, actionHref };
  localStorage.setItem("tygi_global_toast", JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("tygi:toast", { detail: payload }));
}
