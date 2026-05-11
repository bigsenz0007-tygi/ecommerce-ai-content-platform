"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContentList, type ContentTask } from "@/components/ContentList";
import { BizDropdown } from "@/components/BizDropdown";

function ContentPageInner() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<ContentTask[]>([]);

  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("");
  const [efficiency, setEfficiency] = useState("");
  const [minScore, setMinScore] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const s = searchParams.get("status");
    const p = searchParams.get("platform");
    setStatus(s ?? "");
    setPlatform(p ?? "");
  }, [searchParams]);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (platform) q.set("platform", platform);
    if (status) q.set("status", status);
    if (efficiency) q.set("efficiency", efficiency);
    if (minScore) q.set("minScore", minScore);
    if (startDate) q.set("startDate", startDate);
    if (endDate) q.set("endDate", `${endDate}T23:59:59.000Z`);
    return q.toString();
  }, [platform, status, efficiency, minScore, startDate, endDate]);

  const workload = useMemo(
    () => ({
      total: tasks.length,
      generating: tasks.filter((t) => t.status === "generating").length,
      pendingTask: tasks.filter((t) => t.status === "pending_task").length,
      paused: tasks.filter((t) => t.status === "paused").length,
    }),
    [tasks]
  );

  const load = useCallback(async () => {
    const r = await fetch(`/api/tasks${query ? `?${query}` : ""}`);
    const j = (await r.json()) as { tasks: ContentTask[] };
    setTasks(j.tasks);
  }, [query]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">全部内容 / 任务</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          融合历史内容与进行中任务：支持筛选查看、复制创建、暂停或结束任务。
        </p>
        {!loggedIn ? (
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">体验模式仅查看，不支持操作。</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat title="当前列表总数" value={workload.total} />
        <MiniStat title="生成中" value={workload.generating} />
        <MiniStat title="待完成任务" value={workload.pendingTask} />
        <MiniStat title="已暂停" value={workload.paused} />
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="biz-filter-row">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="biz-control"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="biz-control"
          />
          <BizDropdown
            value={platform}
            onChange={setPlatform}
            placeholder="平台（全部）"
            options={[
              { value: "", label: "平台（全部）" },
              { value: "淘宝", label: "淘宝" },
              { value: "抖音", label: "抖音" },
              { value: "小红书", label: "小红书" },
              { value: "京东", label: "京东" },
            ]}
          />
          <input
            placeholder="最低评分"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            className="biz-control"
          />
          <BizDropdown
            value={efficiency}
            onChange={setEfficiency}
            placeholder="有效率（全部）"
            options={[
              { value: "", label: "有效率（全部）" },
              { value: "采纳", label: "采纳" },
              { value: "驳回", label: "驳回" },
              { value: "处理中", label: "处理中" },
            ]}
          />
          <BizDropdown
            value={status}
            onChange={setStatus}
            className="md:col-span-2"
            placeholder="状态（全部）"
            options={[
              { value: "", label: "状态（全部）" },
              { value: "generating", label: "生成中" },
              { value: "pending_task", label: "待完成" },
              { value: "review_ready", label: "待审核" },
              { value: "pending_publish", label: "待发布" },
              { value: "published", label: "已发布" },
            ]}
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPlatform("");
                setMinScore("");
                setEfficiency("");
                setStatus("");
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

      <ContentList
        tasks={tasks}
        onRefresh={load}
        allowCloneActions={loggedIn}
        allowTaskActions={loggedIn}
      />
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1200px] px-4 py-10 text-sm text-[hsl(var(--muted))]">加载中…</div>
      }
    >
      <ContentPageInner />
    </Suspense>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-[hsl(var(--muted))]">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
