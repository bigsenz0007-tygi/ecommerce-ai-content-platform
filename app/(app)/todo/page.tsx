"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentList, type ContentTask } from "@/components/ContentList";

export default function TodoPage() {
  const [tasks, setTasks] = useState<ContentTask[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/tasks?status=pending_task");
    const j = (await r.json()) as { tasks: ContentTask[] };
    setTasks(j.tasks);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">待完成任务</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          这里展示重新生成后进入待完成池的内容，支持继续编辑、重生、删除。
        </p>
      </div>
      <ContentList tasks={tasks} onRefresh={load} />
    </div>
  );
}
