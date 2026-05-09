"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ContentList, type ContentTask } from "@/components/ContentList";

export default function TasksPage() {
  const [tasks, setTasks] = useState<ContentTask[]>([]);
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (platform) q.set("platform", platform);
    if (status) q.set("status", status);
    const r = await fetch(`/api/tasks${q.toString() ? `?${q.toString()}` : ""}`);
    const j = (await r.json()) as { tasks: ContentTask[] };
    const running = j.tasks.filter((t) =>
      ["generating", "pending_task", "review_ready", "pending_publish", "paused"].includes(t.status)
    );
    setTasks(running);
  }, [platform, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const workload = useMemo(
    () => ({
      total: tasks.length,
      generating: tasks.filter((t) => t.status === "generating").length,
      paused: tasks.filter((t) => t.status === "paused").length,
      review: tasks.filter((t) => t.status === "review_ready").length,
    }),
    [tasks]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">任务页</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          查看当前进行中的生产任务工作量，并支持任务暂停或结束。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat title="进行中任务" value={workload.total} />
        <Stat title="生成中" value={workload.generating} />
        <Stat title="待审核" value={workload.review} />
        <Stat title="已暂停" value={workload.paused} />
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="grid gap-2 md:grid-cols-3">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.5)] px-3 py-2 text-sm">
            <option value="">平台（全部）</option>
            <option>淘宝</option>
            <option>抖音</option>
            <option>小红书</option>
            <option>京东</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.5)] px-3 py-2 text-sm">
            <option value="">状态（全部）</option>
            <option value="generating">生成中</option>
            <option value="pending_task">待完成</option>
            <option value="review_ready">待审核</option>
            <option value="pending_publish">待发布</option>
            <option value="paused">已暂停</option>
          </select>
          <button onClick={() => void load()} className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm">
            查询
          </button>
        </div>
      </div>
      <ContentList tasks={tasks} onRefresh={load} allowTaskActions />
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-[hsl(var(--muted))]">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
