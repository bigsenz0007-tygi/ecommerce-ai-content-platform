"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentTask } from "@/components/ContentList";
import { BizDropdown } from "@/components/BizDropdown";
import { TaskEditModal } from "@/components/TaskEditModal";

export default function PublishPage() {
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingTask, setEditingTask] = useState<ContentTask | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    q.set("status", "pending_publish");
    if (platformFilter) q.set("platform", platformFilter);
    if (statusFilter) q.set("status", statusFilter);
    const r = await fetch(`/api/tasks?${q.toString()}`);
    const j = (await r.json()) as { tasks: ContentTask[] };
    setTasks(j.tasks);
  }, [platformFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadConnections() {
      const r = await fetch("/api/connections");
      const j = (await r.json()) as {
        connections: { platform: string; connected: boolean }[];
      };
      setConnectedPlatforms(j.connections.filter((x) => x.connected).map((x) => x.platform));
    }
    void loadConnections();
  }, []);

  useEffect(() => {
    if (!editingTask) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [editingTask]);

  async function publishPreview(task: ContentTask, platform: string) {
    if (!connectedPlatforms.includes(platform)) {
      window.location.href = "/settings#connections";
      return;
    }
    const r = await fetch("/api/publish/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, platform }),
    });
    const j = (await r.json()) as { draftUrl?: string; error?: string };
    if (!r.ok) {
      alert(j.error || "发布预览失败");
      return;
    }
    if (j.draftUrl) window.open(j.draftUrl, "_blank", "noopener,noreferrer");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">待发布</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          列表展示待发布内容，支持筛选；操作仅保留发布预览和编辑。
        </p>
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="biz-filter-row">
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
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="状态（全部）"
            options={[
              { value: "", label: "状态（全部）" },
              { value: "pending_publish", label: "待发布" },
              { value: "published", label: "已发布" },
            ]}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPlatformFilter("");
                setStatusFilter("");
              }}
              className="biz-filter-btn-reset"
            >
              重置
            </button>
            <button onClick={() => void load()} className="biz-filter-btn-query">
              查询
            </button>
          </div>
          <div className="text-xs text-[hsl(var(--muted))] self-center md:col-span-4">
            提示：当前为单条发布预览，不包含批量操作。
          </div>
        </div>
      </div>
      <div className="overflow-auto rounded-2xl border border-[hsl(var(--border)/0.5)]">
        <table className="biz-table w-full min-w-[1200px] table-fixed text-left text-sm">
          <thead className="bg-[hsl(var(--surface-raised)/0.7)] text-xs text-[hsl(var(--muted))]">
            <tr>
              <th className="w-[90px] px-3 py-2">平台</th>
              <th className="w-[120px] px-3 py-2">账号</th>
              <th className="w-[90px] px-3 py-2">目标</th>
              <th className="w-[340px] px-3 py-2">内容详情</th>
              <th className="w-[180px] px-3 py-2">生成时间</th>
              <th className="w-[90px] px-3 py-2">系统评分</th>
              <th className="w-[130px] px-3 py-2">状态</th>
              <th className="w-[150px] px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t border-[hsl(var(--border)/0.35)] align-top">
                <td className="px-3 py-3" title={t.account.platform}>{clipText(t.account.platform)}</td>
                <td className="px-3 py-3" title={t.account.name}>{clipText(t.account.name)}</td>
                <td className="px-3 py-3" title={t.objective}>{clipText(t.objective)}</td>
                <td className="biz-wrap px-3 py-3">
                  <details>
                    <summary className="cursor-pointer" title={t.copyTitle}>{clipText(t.copyTitle)}</summary>
                    <div className="mt-2 max-w-[320px] whitespace-pre-wrap break-all text-xs">{t.copyBody}</div>
                  </details>
                </td>
                <td className="px-3 py-3 text-xs">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-3 py-3">{t.scoreTotal}</td>
                <td className="px-3 py-3">{t.status}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {!connectedPlatforms.includes(t.account.platform) ? (
                      <button
                        onClick={() => {
                          window.location.href = "/settings#connections";
                        }}
                        className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto"
                      >
                        去配置
                      </button>
                    ) : (
                    <button
                      onClick={() => void publishPreview(t, t.account.platform)}
                      className="btn-primary rounded-lg px-2 py-1 text-xs font-medium h-auto"
                    >
                      发布预览
                    </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingTask(t);
                      }}
                      className="btn-secondary rounded-lg px-2 py-1 text-xs h-auto"
                    >
                      编辑
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
          saving={saving}
          onClose={() => setEditingTask(null)}
          onSave={async (payload) => {
            setSaving(true);
            try {
              await fetch(`/api/tasks/${editingTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "save_edit",
                  copyTitle: payload.copyTitle,
                  copyBody: payload.copyBody,
                  imageUrl: payload.imageUrl,
                  videoUrl: payload.videoUrl,
                }),
              });
              setEditingTask(null);
              await load();
            } finally {
              setSaving(false);
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
