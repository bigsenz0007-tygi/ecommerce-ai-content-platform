"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { BizDropdown } from "@/components/BizDropdown";
import { PLATFORM_CHOICES } from "@/lib/content-taxonomy";
import { DailyViralPicks } from "@/components/DailyViralPicks";
import { isAllowedBenchmarkUrl } from "@/lib/benchmark-link";

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
  const [countInput, setCountInput] = useState("");
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
  const [benchmarkLink, setBenchmarkLink] = useState("");
  const [benchmarkImageDataUrl, setBenchmarkImageDataUrl] = useState("");

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

  useEffect(() => {
    if (mode !== "random" || !benchmarkLink.trim()) return;
    const inferred = inferPlatformFromUrl(benchmarkLink.trim());
    if (inferred) setPlatform(inferred);
  }, [benchmarkLink, mode]);

  async function runGenerate() {
    if (mode === "random") {
      if (!benchmarkLink.trim() || !platform || !categoryId) {
        emitToast("请填写对标链接并选择平台与分类", "继续填写", "/dashboard");
        return;
      }
      if (!isAllowedBenchmarkUrl(benchmarkLink.trim())) {
        emitToast("请输入小红书或抖音的有效笔记/视频链接", "继续填写", "/dashboard");
        return;
      }
      const inferred = inferPlatformFromUrl(benchmarkLink.trim());
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
    if (mode !== "random" && !auth.loggedIn) {
      emitToast("请先登录后使用精准生", "去登录", "/login?next=/dashboard");
      return;
    }
    setLoading(true);
    setMsg("");
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
      const payload =
        mode === "random"
          ? {
              mode: "random" as const,
              platform: platform as "小红书" | "抖音",
              categoryId,
              count: safeCount,
              benchmarkUser: {
                link: benchmarkLink.trim(),
              },
            }
          : {
              mode: "precise" as const,
              accountId,
              categoryId,
              objective,
              contentFormat,
              count: safeCount,
              advancedContext: {
                内容风格: preciseStyle,
              },
              benchmarkUser:
                benchmarkLink.trim() || benchmarkImageDataUrl
                  ? {
                      link: benchmarkLink.trim() || undefined,
                      imageDataUrl: benchmarkImageDataUrl || undefined,
                    }
                  : undefined,
            };
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

      <DailyViralPicks
        categories={options?.categories || []}
        onReplicate={({ url, platform: pf, trackName }) => {
          setBenchmarkLink(url);
          setPlatform(pf);
          const cat = options?.categories?.find((c) => c.name === trackName);
          if (cat) setCategoryId(cat.id);
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 420, behavior: "smooth" });
          }
          emitToast(
            cat ? "已填入复刻链接、平台与内容赛道，可调整数量后开生。" : "已填入复刻链接与平台；请手动选择内容赛道。",
            "好的",
            "/dashboard",
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
        {!auth.loggedIn ? (
          <div className="mb-2 fs-12 text-[hsl(var(--muted))]">
            随便生无需登录：填写对标链接并选择平台与分类即可 1～10 条。精准生需先登录本系统账号。
          </div>
        ) : null}
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
              <div className="mb-2 fs-13 font-medium text-[hsl(var(--foreground))]">对标内容（可选）</div>
              <p className="mb-2 fs-12 text-[hsl(var(--muted))]">
                粘贴链接或上传截图，便于模型对齐风格；不填则仅按品类与平台规则生成。
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block fs-12">
                  <span className="text-[hsl(var(--muted))]">对标链接</span>
                  <input
                    className="biz-control mt-1 w-full"
                    placeholder="https://..."
                    value={benchmarkLink}
                    onChange={(e) => setBenchmarkLink(e.target.value)}
                  />
                </label>
                <label className="block fs-12">
                  <span className="text-[hsl(var(--muted))]">对标截图</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="biz-control mt-1 w-full !py-2 fs-12"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) {
                        setBenchmarkImageDataUrl("");
                        return;
                      }
                      if (f.size > 2 * 1024 * 1024) {
                        emitToast("截图请小于 2MB", "确定", "/dashboard");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => setBenchmarkImageDataUrl(String(reader.result || ""));
                      reader.readAsDataURL(f);
                    }}
                  />
                  {benchmarkImageDataUrl ? (
                    <button
                      type="button"
                      className="mt-1 fs-12 text-[hsl(var(--accent))]"
                      onClick={() => setBenchmarkImageDataUrl("")}
                    >
                      清除截图
                    </button>
                  ) : null}
                </label>
              </div>
            </div>
          ) : null}
          <div className="mt-2 fs-12 text-[hsl(var(--muted))]">
            {mode === "random"
              ? "随便生：基于对标链接解析风格，每条随机「内容目标 + 内容格式」，一次 1～10 条；无需选择账号。"
              : "精准生：按内容平台、赛道、目标、格式、风格与数量定向生成；可选对标链接/截图强化仿写。"}
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

function inferPlatformFromUrl(url: string): "" | "小红书" | "抖音" {
  try {
    const h = new URL(url.trim()).hostname.toLowerCase();
    if (h.includes("xiaohongshu.com") || h.includes("xhslink.com") || h.includes("xhs.cn")) return "小红书";
    if (h.includes("douyin.com") || h.includes("iesdouyin.com") || h.includes("amemv.com")) return "抖音";
    return "";
  } catch {
    return "";
  }
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
