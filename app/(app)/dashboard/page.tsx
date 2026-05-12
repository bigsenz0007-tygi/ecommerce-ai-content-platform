"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { BizDropdown } from "@/components/BizDropdown";
import { PLATFORM_CHOICES } from "@/lib/content-taxonomy";
import { DailyViralPicks } from "@/components/DailyViralPicks";
import {
  inferBenchmarkPlatform,
  isAllowedBenchmarkUrl,
  normalizeBenchmarkUrl,
} from "@/lib/benchmark-link";

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
  platforms: ("小红书" | "抖音")[];
  platformChoices?: ("抖音" | "小红书")[];
  accounts: { id: string; name: string; platform: string }[];
  categories: { id: string; name: string }[];
  objectives: string[];
  formats: string[];
  contentStyles?: string[];
};

type RunPayload =
  | {
      mode: "random";
      platform: "小红书" | "抖音";
      categoryId: string;
      count: number;
      benchmarkUser: { link: string };
    }
  | {
      mode: "precise";
      accountId: string;
      categoryId: string;
      objective: string;
      contentFormat: string;
      count: number;
      advancedContext: { 内容风格: string };
      benchmarkUser?: { link: string };
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
  const [preciseStyle, setPreciseStyle] = useState("");
  const [countInput, setCountInput] = useState("3");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    title: string;
    desc: string;
    actionLabel: string;
    actionHref: string;
  } | null>(null);
  const [benchmarkLink, setBenchmarkLink] = useState("");

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
      try {
        const r = await fetch("/api/options");
        if (!r.ok) throw new Error("load_options_failed");
        const j = (await r.json()) as OptionData;
        setOptions(j);
      } catch {
        setMsg("选项加载失败，请刷新重试；若刚改过推荐库结构，请同步数据库后再试。");
      }
    }
    void loadOptions();
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

  useEffect(() => {
    if (!options) return;
    if (!platform) {
      setPlatform(options.platformChoices?.[0] || options.platforms?.[0] || PLATFORM_CHOICES[0]);
    }
    if (!categoryId && options.categories[0]?.id) {
      setCategoryId(options.categories[0].id);
    }
    if (!objective && options.objectives[0]) {
      setObjective(options.objectives[0]);
    }
    if (!contentFormat && options.formats[0]) {
      setContentFormat(options.formats[0]);
    }
    if (!preciseStyle && options.contentStyles?.[0]) {
      setPreciseStyle(options.contentStyles[0]);
    }
  }, [options, platform, categoryId, objective, contentFormat, preciseStyle]);

  useEffect(() => {
    if (mode !== "random" || !benchmarkLink.trim()) return;
    const inferred = inferBenchmarkPlatform(benchmarkLink.trim());
    if (inferred) setPlatform(inferred);
  }, [benchmarkLink, mode]);

  async function submitGenerate(
    payload: RunPayload,
    options: {
      platform: string;
      objective?: string;
      successMessage?: string;
    }
  ) {
    const safeCount = payload.count;
    const heavy = payload.mode === "precise" ? safeCount >= 8 : safeCount >= 7;
    const reviewHref = buildReviewHref(options.platform, payload.mode === "precise" ? (options.objective ?? "") : "");
    const contentHref = buildContentHref(options.platform);

    setLoading(true);
    setMsg("");
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
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { message?: string; error?: string };
      if (!r.ok) {
        setDialog(null);
        emitToast(j.error || "生成失败，请检查筛选项后重试", "继续填写", "/dashboard");
        return;
      }
      const successMessage = options.successMessage || j.message || "已生成";
      setMsg(successMessage);
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
        emitToast(successMessage, "去审核", reviewHref);
      }
      emitGlobalToast(successMessage, "去审核", reviewHref);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function runGenerate() {
    const normalizedLink = normalizeBenchmarkUrl(benchmarkLink.trim());
    if (mode === "random") {
      if (!benchmarkLink.trim() || !platform || !categoryId) {
        emitToast("请填写对标链接并选择平台与分类", "继续填写", "/dashboard");
        return;
      }
      if (!isAllowedBenchmarkUrl(normalizedLink)) {
        emitToast("请输入小红书或抖音的有效笔记/视频链接", "继续填写", "/dashboard");
        return;
      }
      const inferred = inferBenchmarkPlatform(normalizedLink);
      if (inferred && platform && inferred !== platform) {
        emitToast("链接所属平台与所选平台不一致，请检查", "继续填写", "/dashboard");
        return;
      }
    } else if (!platform || !accountId || !categoryId || !objective || !contentFormat || !preciseStyle) {
      emitToast("请完整填写精准生筛选项（含内容风格）", "继续填写", "/dashboard");
      return;
    }
    const parsedCount = Number(countInput || 0);
    if (!parsedCount || parsedCount < 1) {
      emitToast("请输入数量", "继续填写", "/dashboard");
      return;
    }
    const safeCount = mode === "random" ? Math.max(1, Math.min(10, parsedCount)) : Math.max(1, Math.min(50, parsedCount));
    const payload: RunPayload =
      mode === "random"
        ? {
            mode: "random",
            platform: platform as "小红书" | "抖音",
            categoryId,
            count: safeCount,
            benchmarkUser: {
              link: normalizedLink,
            },
          }
        : {
            mode: "precise",
            accountId,
            categoryId,
            objective,
            contentFormat,
            count: safeCount,
            advancedContext: {
              内容风格: preciseStyle,
            },
            benchmarkUser: benchmarkLink.trim()
              ? {
                  link: normalizeBenchmarkUrl(benchmarkLink.trim()),
                }
              : undefined,
          };
    await submitGenerate(payload, {
      platform,
      objective,
      successMessage: "生成任务已完成，速速去审核",
    });
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="biz-section-title">Happy Tygi</h1>
        <p className="biz-inline-note mt-2 max-w-3xl">
          今天又是搞钱的一天，发发发，Tygi！
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { title: "1. 先选推荐或直接开生", desc: "首页完成平台、赛道和对标链接输入。", href: "/dashboard" },
          { title: "2. 去待审核挑可用内容", desc: "编辑、打标、采纳或驳回，沉淀可复用内容。", href: "/review" },
          { title: "3. 去待发布做预览", desc: "确认平台连接后生成发布草稿。", href: "/publish" },
          { title: "4. 去策略配置补规则", desc: "维护推荐库、连接状态和平台规则。", href: "/settings#connections" },
        ].map((item) => (
          <a
            key={item.title}
            href={item.href}
            className="glass rounded-2xl p-4 transition hover:bg-[hsl(var(--surface-raised)/0.55)]"
          >
            <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</div>
            <div className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted))]">{item.desc}</div>
          </a>
        ))}
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

      <DailyViralPicks
        categories={options?.categories || []}
        replicating={loading}
        onReplicate={async ({ url, platform: pf, trackName }) => {
          if (loading) return;
          const normalizedUrl = normalizeBenchmarkUrl(url);
          if (!isAllowedBenchmarkUrl(normalizedUrl)) {
            emitToast("复刻链接无效，请更换后重试", "继续填写", "/dashboard");
            return;
          }
          const cat = options?.categories?.find((c) => c.name === trackName);
          if (!cat) {
            emitToast("该推荐内容未匹配到标准赛道，请先在策略配置中校准赛道", "去配置", "/settings");
            return;
          }
          setMode("random");
          setBenchmarkLink(normalizedUrl);
          setPlatform(pf);
          setCategoryId(cat.id);
          setCountInput("1");
          await submitGenerate(
            {
              mode: "random",
              platform: pf as "小红书" | "抖音",
              categoryId: cat.id,
              count: 1,
              benchmarkUser: {
                link: normalizedUrl,
              },
            },
            {
              platform: pf,
              successMessage: "已按该爆款内容直接复刻 1 条，速速去审核",
            }
          );
        }}
      />

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
        <div className="mb-2 fs-12 text-[hsl(var(--muted))]">
          当前为直接体验模式：随便生与精准生都可填写平台链接生成内容。
        </div>
        <div className="biz-panel ring-glow">
          {mode === "random" ? (
            <div className="mb-3 space-y-2">
              <label className="block fs-12">
                <span className="text-[hsl(var(--muted))]">
                  <span className="text-[hsl(var(--accent))]">*</span> 对标链接（小红书 / 抖音）
                </span>
                <input
                  className="biz-control mt-1 w-full"
                  placeholder="粘贴笔记或分享链接，如 xiaohongshu.com / douyin.com …"
                  value={benchmarkLink}
                  onChange={(e) => setBenchmarkLink(e.target.value)}
                />
              </label>
              <p className="fs-12 text-[hsl(var(--muted))]">
                AI 将抓取链接可访问的正文摘要并仿照风格生成内容；未配置模型 Key 时使用本地模板兜底。
              </p>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <FieldRow label="内容平台" required>
              <BizDropdown
                className="w-full"
                value={platform}
                placeholder="请选择"
                options={(mode === "random" ? options?.platformChoices ?? [...PLATFORM_CHOICES] : options?.platforms || []).map(
                  (p) => ({ label: p, value: p })
                )}
                onChange={setPlatform}
              />
            </FieldRow>
            {mode === "precise" ? (
              <FieldRow label="发布账号" required>
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
            ) : (
              <div className="hidden md:block" aria-hidden />
            )}
            <FieldRow label="内容赛道" required>
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
                <FieldRow label="内容目标" required>
                  <BizDropdown
                    className="w-full"
                    value={objective}
                    placeholder="请选择"
                    options={(options?.objectives || []).map((o) => ({ label: o, value: o }))}
                    onChange={setObjective}
                  />
                </FieldRow>
                <FieldRow label="内容格式" required>
                  <BizDropdown
                    className="w-full"
                    value={contentFormat}
                    placeholder="请选择"
                    options={(options?.formats || []).map((f) => ({ label: f, value: f }))}
                    onChange={setContentFormat}
                  />
                </FieldRow>
                <FieldRow label="内容风格" required>
                  <BizDropdown
                    className="w-full"
                    value={preciseStyle}
                    placeholder="请选择"
                    options={(options?.contentStyles || []).map((s) => ({ label: s, value: s }))}
                    onChange={setPreciseStyle}
                  />
                </FieldRow>
                <FieldRow label="内容数量" required>
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
                <FieldRow label="内容数量" required>
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
            <div className="mt-3 border-t border-[hsl(var(--border)/0.35)] pt-3">
              <div className="mb-2 fs-13 font-medium text-[hsl(var(--foreground))]">平台链接（可选）</div>
              <p className="mb-2 fs-12 text-[hsl(var(--muted))]">
                粘贴小红书 / 抖音链接，便于模型对齐风格；不填则仅按品类与平台规则生成。
              </p>
              <div className="grid gap-3 md:grid-cols-1">
                <label className="block fs-12">
                  <span className="text-[hsl(var(--muted))]">平台链接</span>
                  <input
                    className="biz-control mt-1 w-full"
                    placeholder="粘贴 xiaohongshu.com / douyin.com 链接"
                    value={benchmarkLink}
                    onChange={(e) => setBenchmarkLink(e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : null}
          <div className="mt-2 fs-12 text-[hsl(var(--muted))]">
            {mode === "random"
              ? "随便生：基于对标链接解析风格，每条随机「内容目标 + 内容格式」，一次 1～10 条；无需选择账号。"
              : "精准生：按内容平台、赛道、目标、格式、风格与数量定向生成；可选平台链接强化仿写。"}
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
