"use client";

import { useCallback, useMemo, useState } from "react";
import {
  isImageLikeContentFormat,
  isTextOnlyContentFormat,
  isVideoLikeContentFormat,
} from "@/lib/format-display";

export type ContentTask = {
  id: string;
  status: string;
  tier: string;
  objective: string;
  contentFormat: string;
  copyTitle: string;
  copyBody: string;
  imageUrl: string;
  videoScript: string;
  videoUrl: string;
  benchmarkTitle: string;
  benchmarkBody: string;
  benchmarkUrl: string;
  benchmarkUserLink?: string;
  benchmarkUserImage?: string;
  scoreTotal: number;
  adopted: boolean;
  qualityLabel: "好" | "中" | "差";
  processMemo: string;
  createdAt: string;
  account: { name: string; platform: string };
  category: { name: string };
};

export function ContentList({
  tasks,
  onRefresh,
  allowReviewActions = false,
  allowPublishActions = false,
  allowTaskActions = false,
  allowCloneActions = false,
  publishPlatforms = [],
}: {
  tasks: ContentTask[];
  onRefresh: () => Promise<void> | void;
  allowReviewActions?: boolean;
  allowPublishActions?: boolean;
  allowTaskActions?: boolean;
  allowCloneActions?: boolean;
  publishPlatforms?: string[];
}) {
  const [busy, setBusy] = useState<string>("");

  const indexed = useMemo(() => tasks.map((t, i) => ({ ...t, index: i + 1 })), [tasks]);

  const patchTask = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setBusy(id);
      try {
        await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        await onRefresh();
      } finally {
        setBusy("");
      }
    },
    [onRefresh]
  );

  const publishTask = useCallback(
    async (taskId: string, platform: string) => {
      setBusy(taskId);
      try {
        const r = await fetch("/api/publish/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, platform }),
        });
        const j = (await r.json()) as { draftUrl?: string; error?: string };
        if (!r.ok) throw new Error(j.error || "推送草稿失败");
        if (j.draftUrl) window.open(j.draftUrl, "_blank", "noopener,noreferrer");
        await onRefresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "推送草稿失败");
      } finally {
        setBusy("");
      }
    },
    [onRefresh]
  );

  return (
    <div className="overflow-auto rounded-2xl border border-[hsl(var(--border)/0.5)]">
      <table className="biz-table w-full min-w-[1220px] table-fixed text-left fs-14">
        <thead className="bg-[hsl(var(--surface-raised)/0.7)] fs-12 text-[hsl(var(--muted))]">
          <tr>
            <th className="w-[70px] px-3 py-2">序号</th>
            <th className="w-[90px] px-3 py-2">平台</th>
            <th className="w-[90px] px-3 py-2">格式</th>
            <th className="w-[90px] px-3 py-2">目标</th>
            <th className="w-[420px] px-3 py-2">内容详情</th>
            <th className="w-[160px] px-3 py-2">对标内容</th>
            <th className="w-[170px] px-3 py-2">生成时间</th>
            <th className="w-[90px] px-3 py-2">系统评分</th>
            <th className="w-[90px] px-3 py-2">有效率</th>
            <th className="w-[90px] px-3 py-2">状态</th>
            <th className="w-[240px] px-3 py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {indexed.map((t) => (
            <tr key={t.id} className="border-t border-[hsl(var(--border)/0.35)] align-top">
              <td className="px-3 py-3 whitespace-nowrap">#{t.index}</td>
              <td className="px-3 py-3 whitespace-nowrap">{t.account.platform}</td>
              <td className="px-3 py-3 whitespace-nowrap">{t.contentFormat}</td>
              <td className="px-3 py-3 whitespace-nowrap" title={t.objective}>{clipText(t.objective)}</td>
              <td className="biz-wrap px-3 py-3">
                <details>
                  <summary className="cursor-pointer text-[hsl(var(--foreground))]" title={t.copyTitle}>
                    {clipText(t.copyTitle)}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="biz-wrap rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-2 py-1.5 text-xs">
                      标题：{t.copyTitle}
                    </div>
                    <div className="biz-wrap rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-2 py-1.5 text-xs whitespace-pre-wrap break-all">
                      正文：{t.copyBody}
                    </div>
                    {isImageLikeContentFormat(t.contentFormat) ? (
                      <div className="rounded-lg border border-[hsl(var(--border)/0.45)] p-2">
                        <div className="text-[10px] text-[hsl(var(--muted))]">图片预览</div>
                        {firstImage(t.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstImage(t.imageUrl)}
                            alt={t.copyTitle || "图文素材"}
                            className="mt-1 max-h-40 w-full rounded-md object-contain"
                          />
                        ) : (
                          <div className="mt-1 text-xs text-[hsl(var(--muted))]">暂无图片，可在发布编辑中上传</div>
                        )}
                      </div>
                    ) : null}
                    {isVideoLikeContentFormat(t.contentFormat) ? (
                      <div className="rounded-lg border border-[hsl(var(--border)/0.45)] p-2">
                        <div className="text-[10px] text-[hsl(var(--muted))]">视频预览</div>
                        {t.videoUrl ? (
                          <video
                            src={t.videoUrl}
                            controls
                            className="mt-1 max-h-48 w-full rounded-md bg-black/30"
                          />
                        ) : (
                          <div className="mt-1 text-xs text-[hsl(var(--muted))]">暂无视频，可在发布编辑中上传</div>
                        )}
                        {t.videoScript ? (
                          <div className="mt-2 text-xs text-[hsl(var(--muted))]">视频脚本：{t.videoScript}</div>
                        ) : null}
                      </div>
                    ) : null}
                    {isTextOnlyContentFormat(t.contentFormat) ? (
                      <div className="rounded-lg border border-[hsl(var(--border)/0.45)] p-2 text-xs text-[hsl(var(--muted))]">
                        口播/纯文案：无配图预览，可直接以正文为准录制或发布。
                      </div>
                    ) : null}
                  </div>
                </details>
              </td>
              <td className="px-3 py-3">
                <div className="fs-12" title={t.benchmarkTitle || "暂无"}>{clipText(t.benchmarkTitle || "暂无")}</div>
                {t.benchmarkUrl ? (
                  <a href={t.benchmarkUrl} target="_blank" rel="noreferrer" className="fs-12 text-[hsl(var(--accent))]">
                    参考链接
                  </a>
                ) : null}
                {t.benchmarkUserLink?.trim() ? (
                  <div className="mt-1 space-y-1">
                    <div className="fs-11 text-[hsl(var(--muted))]">用户对标</div>
                    <a
                      href={t.benchmarkUserLink}
                      target="_blank"
                      rel="noreferrer"
                      className="fs-12 break-all text-[hsl(var(--accent))]"
                    >
                      {clipText(t.benchmarkUserLink, 40)}
                    </a>
                  </div>
                ) : null}
                {t.benchmarkUserImage?.trim() ? (
                  <div className="mt-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.benchmarkUserImage}
                      alt="用户对标截图"
                      className="max-h-24 max-w-[120px] rounded border border-[hsl(var(--border)/0.45)] object-contain"
                    />
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-3 fs-12 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
              <td className="px-3 py-3 whitespace-nowrap">{t.scoreTotal}</td>
              <td className="px-3 py-3 whitespace-nowrap" title={efficiencyText(t)}>{efficiencyText(t)}</td>
              <td className="px-3 py-3 whitespace-nowrap" title={statusText(t.status)}>{statusText(t.status)}</td>
              <td className="px-3 py-3">
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-1">
                    {allowCloneActions && (t.status === "published" || t.status === "pending_publish") ? (
                      <button
                        disabled={busy === t.id}
                        onClick={() => void patchTask(t.id, { action: "clone_task" })}
                        className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                      >
                        复制并创建
                      </button>
                    ) : null}
                    {allowTaskActions && (t.status === "pending_task" || t.status === "generating") ? (
                      <button
                        disabled={busy === t.id}
                        onClick={() => void patchTask(t.id, { action: "pause_task" })}
                        className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                      >
                        暂停任务
                      </button>
                    ) : null}
                    {allowTaskActions &&
                    (t.status === "pending_task" || t.status === "generating" || t.status === "paused") ? (
                      <button
                        disabled={busy === t.id}
                        onClick={() => void patchTask(t.id, { action: "end_task" })}
                        className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                      >
                        结束任务
                      </button>
                    ) : null}
                    {allowReviewActions ? (
                      <>
                        <button
                          disabled={busy === t.id}
                          onClick={() => void patchTask(t.id, { action: "label", qualityLabel: "好" })}
                          className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                        >
                          好
                        </button>
                        <button
                          disabled={busy === t.id}
                          onClick={() => void patchTask(t.id, { action: "label", qualityLabel: "中" })}
                          className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                        >
                          中
                        </button>
                        <button
                          disabled={busy === t.id}
                          onClick={() => void patchTask(t.id, { action: "label", qualityLabel: "差" })}
                          className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                        >
                          差
                        </button>
                        {t.status === "review_ready" ? (
                          <>
                            <button
                              disabled={busy === t.id}
                              onClick={() => void patchTask(t.id, { action: "adopt" })}
                              className="btn-primary whitespace-nowrap rounded-lg px-2 py-1 fs-12 font-medium h-auto"
                            >
                              采用
                            </button>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {allowPublishActions ? (
                      <>
                        {publishPlatforms.length === 0 ? (
                          <div className="rounded-lg border border-amber-500/45 px-2 py-1 text-xs text-amber-300">
                            未连接账号
                          </div>
                        ) : (
                          publishPlatforms.map((platform) => (
                            <button
                              key={`${t.id}-${platform}`}
                              disabled={busy === t.id}
                              onClick={() => void publishTask(t.id, platform)}
                              className="btn-primary whitespace-nowrap rounded-lg px-2 py-1 fs-12 font-medium h-auto"
                            >
                              发布{platform}
                            </button>
                          ))
                        )}
                      </>
                    ) : null}
                    {(t.status === "paused" || t.status === "rejected") ? (
                      <button
                        disabled={busy === t.id}
                        onClick={() => void patchTask(t.id, { action: "delete" })}
                        className="btn-secondary whitespace-nowrap rounded-lg px-2 py-1 fs-12 h-auto"
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted))]">记录：{t.processMemo || "暂无"}</div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {indexed.length === 0 ? <div className="p-8 text-sm text-[hsl(var(--muted))]">暂无数据。</div> : null}
    </div>
  );
}

function clipText(text: string, max = 12) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function firstImage(raw: string) {
  if (!raw) return "";
  if (raw.includes("||")) return raw.split("||")[0] || "";
  return raw;
}

function statusText(status: string) {
  if (status === "review_ready") return "待审核";
  if (status === "pending_task") return "待完成";
  if (status === "pending_publish") return "待发布";
  if (status === "completed") return "待发布";
  if (status === "generating") return "生成中";
  if (status === "published") return "已发布";
  if (status === "paused") return "已暂停";
  if (status === "rejected") return "已驳回";
  return status;
}

function efficiencyText(t: ContentTask) {
  if (t.adopted) return "采纳";
  if (t.status === "rejected") return "驳回";
  return "处理中";
}
