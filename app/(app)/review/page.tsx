"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentTask } from "@/components/ContentList";
import { BizDropdown } from "@/components/BizDropdown";
import { useSearchParams } from "next/navigation";
import { TaskEditModal } from "@/components/TaskEditModal";

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [stats, setStats] = useState<{
    reviewed: number;
    pendingReview: number;
    rejected: number;
    adoptionRate: number;
    aiRecommendAdoptionRate: number;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [editingTask, setEditingTask] = useState<ContentTask | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [platformFilter, setPlatformFilter] = useState("");
  const [objectiveFilter, setObjectiveFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const p = searchParams.get("platform");
    const o = searchParams.get("objective");
    if (p !== null) setPlatformFilter(p);
    if (o !== null) setObjectiveFilter(o);
  }, [searchParams]);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    q.set("status", "review_ready");
    if (platformFilter) q.set("platform", platformFilter);
    if (objectiveFilter) q.set("objective", objectiveFilter);
    if (formatFilter) q.set("contentFormat", formatFilter);
    if (labelFilter) q.set("qualityLabel", labelFilter);
    const r = await fetch(`/api/tasks?${q.toString()}`);
    const j = (await r.json()) as { tasks: ContentTask[] };
    const rows = j.tasks.filter((t) => !t.adopted);
    const filteredByKeyword = keyword
      ? rows.filter((t) => t.copyTitle.includes(keyword) || t.copyBody.includes(keyword))
      : rows;
    setTasks(filteredByKeyword);
    const rs = await fetch("/api/review/stats");
    const sj = (await rs.json()) as {
      reviewed: number;
      pendingReview: number;
      rejected: number;
      adoptionRate: number;
      aiRecommendAdoptionRate: number;
    };
    setStats(sj);
  }, [platformFilter, objectiveFilter, formatFilter, labelFilter, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadAuth() {
      const r = await fetch("/api/auth/me");
      const j = (await r.json()) as { loggedIn: boolean };
      setLoggedIn(!!j.loggedIn);
    }
    void loadAuth();
  }, []);

  function openEdit(task: ContentTask) {
    if (!loggedIn) {
      alert("请先登录后再编辑");
      return;
    }
    setEditingTask(task);
  }

  async function patchTask(id: string, body: Record<string, unknown>) {
    if (!loggedIn) {
      alert("体验模式不支持操作，请先登录");
      return;
    }
    setBusy(id);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">审核台</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          审核支持：对标内容对比、人工编辑、人工打标。采纳后进入待发布。
        </p>
        {!loggedIn ? (
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">体验模式仅浏览，不支持审核操作。</p>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Card label="已审核" value={stats?.reviewed ?? 0} />
        <Card label="待审核" value={stats?.pendingReview ?? 0} />
        <Card label="已驳回" value={stats?.rejected ?? 0} />
        <Card label="采纳率" value={`${stats?.adoptionRate ?? 0}%`} />
        <Card label="AI推荐采纳率" value={`${stats?.aiRecommendAdoptionRate ?? 0}%`} />
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="grid gap-2 md:grid-cols-5">
          <BizDropdown
            value={platformFilter}
            onChange={setPlatformFilter}
            placeholder="平台（全部）"
            options={[
              { value: "", label: "平台（全部）" },
              { value: "淘宝", label: "淘宝" },
              { value: "抖音", label: "抖音" },
              { value: "小红书", label: "小红书" },
              { value: "京东", label: "京东" },
            ]}
          />
          <BizDropdown
            value={objectiveFilter}
            onChange={setObjectiveFilter}
            placeholder="目标（全部）"
            options={[
              { value: "", label: "目标（全部）" },
              { value: "涨粉", label: "涨粉" },
              { value: "互动", label: "互动" },
              { value: "关注", label: "关注" },
              { value: "分享", label: "分享" },
            ]}
          />
          <BizDropdown
            value={formatFilter}
            onChange={setFormatFilter}
            placeholder="格式（全部）"
            options={[
              { value: "", label: "格式（全部）" },
              { value: "图文", label: "图文" },
              { value: "视频文字", label: "视频文字" },
              { value: "纯文字", label: "纯文字" },
            ]}
          />
          <BizDropdown
            value={labelFilter}
            onChange={setLabelFilter}
            placeholder="人工打标（全部）"
            options={[
              { value: "", label: "人工打标（全部）" },
              { value: "好", label: "好" },
              { value: "中", label: "中" },
              { value: "差", label: "差" },
            ]}
          />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="biz-control"
            placeholder="请输入标题/正文关键词"
          />
          <div className="md:col-span-5 flex justify-end gap-2">
            <button
              onClick={() => {
                setPlatformFilter("");
                setObjectiveFilter("");
                setFormatFilter("");
                setLabelFilter("");
                setKeyword("");
              }}
              className="biz-filter-btn-reset"
            >
              重置
            </button>
            <button onClick={() => void load()} className="biz-filter-btn-query">
              查询
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-2xl border border-[hsl(var(--border)/0.5)]">
        <table className="biz-table w-full min-w-[1300px] table-fixed text-left text-sm">
          <thead className="bg-[hsl(var(--surface-raised)/0.7)] text-xs text-[hsl(var(--muted))]">
            <tr>
              <th className="w-[70px] px-3 py-2">序号</th>
              <th className="w-[90px] px-3 py-2">平台</th>
              <th className="w-[90px] px-3 py-2">格式</th>
              <th className="w-[90px] px-3 py-2">目标</th>
              <th className="w-[360px] px-3 py-2">内容详情</th>
              <th className="w-[170px] px-3 py-2">对标内容</th>
              <th className="w-[170px] px-3 py-2">生成时间</th>
              <th className="w-[90px] px-3 py-2">系统评分</th>
              <th className="w-[120px] px-3 py-2">打标</th>
              <th className="w-[170px] px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.id} className="border-t border-[hsl(var(--border)/0.35)] align-top">
                <td className="px-3 py-3">#{i + 1}</td>
                <td className="px-3 py-3" title={t.account.platform}>{clipText(t.account.platform)}</td>
                <td className="px-3 py-3" title={t.contentFormat}>{clipText(t.contentFormat)}</td>
                <td className="px-3 py-3" title={t.objective}>{clipText(t.objective)}</td>
                <td className="biz-wrap px-3 py-3">
                  <details>
                    <summary className="cursor-pointer text-[hsl(var(--foreground))]" title={t.copyTitle}>{clipText(t.copyTitle)}</summary>
                    <div className="mt-2 space-y-2">
                      <div className="whitespace-pre-wrap rounded-lg border border-[hsl(var(--border)/0.4)] p-2 text-xs">
                        {t.copyBody}
                      </div>
                      {t.contentFormat === "图文" ? (
                        <div className="text-xs text-[hsl(var(--muted))]" title={t.imageUrl || "无图片"}>
                          图文预览：{clipText(t.imageUrl || "无图片")}
                        </div>
                      ) : null}
                      {t.contentFormat === "视频文字" ? (
                        <div className="text-xs text-[hsl(var(--muted))]">
                          视频+文预览：{clipText(t.videoUrl || "无视频链接")} / {clipText(t.videoScript || "无脚本")}
                        </div>
                      ) : null}
                      {t.contentFormat === "纯文字" ? (
                        <div className="text-xs text-[hsl(var(--muted))]">纯文预览</div>
                      ) : null}
                    </div>
                  </details>
                </td>
                <td className="px-3 py-3">
                  <div className="text-xs" title={t.benchmarkTitle || "暂无"}>{clipText(t.benchmarkTitle || "暂无")}</div>
                  {t.benchmarkUrl ? (
                    <a href={t.benchmarkUrl} target="_blank" rel="noreferrer" className="text-xs text-[hsl(var(--accent))]">
                      链接
                    </a>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3">{t.scoreTotal}</td>
                <td className="px-3 py-3">
                  {isHumanLabeled(t) ? (
                    <span className="inline-flex items-center rounded-full border border-[hsl(var(--accent)/0.65)] bg-[hsl(var(--accent)/0.2)] px-2.5 py-1 text-xs">
                      {t.qualityLabel}
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => void patchTask(t.id, { action: "label", qualityLabel: "好" })} className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto">好</button>
                      <button onClick={() => void patchTask(t.id, { action: "label", qualityLabel: "中" })} className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto">中</button>
                      <button onClick={() => void patchTask(t.id, { action: "label", qualityLabel: "差" })} className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto">差</button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      disabled={busy === t.id}
                      onClick={() => openEdit(t)}
                      className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto"
                    >
                      编辑
                    </button>
                    <button
                      disabled={busy === t.id}
                      onClick={() => void patchTask(t.id, { action: "adopt" })}
                      className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto"
                    >
                      采纳
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingTask ? (
        <TaskEditModal
          task={editingTask}
          saving={savingEdit}
          onClose={() => setEditingTask(null)}
          onSave={async (payload) => {
            setSavingEdit(true);
            try {
              await patchTask(editingTask.id, {
                action: "save_edit",
                copyTitle: payload.copyTitle,
                copyBody: payload.copyBody,
                imageUrl: payload.imageUrl,
                videoUrl: payload.videoUrl,
              });
              setEditingTask(null);
            } finally {
              setSavingEdit(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function clipText(text: string, max = 12) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function isHumanLabeled(task: ContentTask) {
  if (!task.processMemo) return false;
  return (
    task.processMemo.includes("优质内容：记录模型与流程作为可复用模板") ||
    task.processMemo.includes("低质内容：进入自动优化策略，后续降低同类模板权重") ||
    task.processMemo.includes("中等内容：保留并等待迭代优化")
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-[hsl(var(--muted))]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
