"use client";

import { useCallback, useEffect, useState } from "react";

type Task = {
  id: string;
  copyTitle: string;
  copyBody: string;
  imageUrl: string;
  videoUrl: string;
  tier: string;
  createdAt: string;
  account: { name: string; platform: string };
  category: { name: string };
};

export default function ArchivePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>(["png", "zip"]);

  const load = useCallback(async () => {
    const r = await fetch("/api/tasks?adopted=true");
    const j = (await r.json()) as { tasks: Task[] };
    setTasks(j.tasks);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-archive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadByFormat() {
    const picked = tasks.filter((t) => selectedIds.includes(t.id));
    if (picked.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const t of picked) {
      const base = `${t.id}-${sanitizeName(t.copyTitle)}`;
      if (formats.includes("png")) zip.file(`${base}.png`, `image placeholder from ${t.imageUrl}`);
      if (formats.includes("jpg")) zip.file(`${base}.jpg`, `jpg placeholder from ${t.imageUrl}`);
      if (formats.includes("pdf")) zip.file(`${base}.pdf`, `pdf placeholder for ${t.copyTitle}`);
      if (formats.includes("gif")) zip.file(`${base}.gif`, `gif placeholder for ${t.copyTitle}`);
      if (formats.includes("apng")) zip.file(`${base}.apng`, `apng placeholder for ${t.copyTitle}`);
      if (formats.includes("mp4")) zip.file(`${base}.mp4`, `video placeholder from ${t.videoUrl}`);
      if (formats.includes("mov")) zip.file(`${base}.mov`, `video placeholder from ${t.videoUrl}`);
      zip.file(`${base}.txt`, `${t.copyTitle}\n\n${t.copyBody}`);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-archive-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">素材归档</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted))]">
          已采纳内容列表；可导出 JSON 作为演示包（后续可换 ZIP 含真实素材）。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--surface-raised)/0.6)]"
        >
          刷新
        </button>
        <button
          type="button"
          onClick={downloadJson}
          disabled={tasks.length === 0}
          className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-[hsl(222_47%_6%)] disabled:opacity-40"
        >
          下载 JSON 包
        </button>
        <button
          type="button"
          onClick={() => void downloadByFormat()}
          disabled={selectedIds.length === 0}
          className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-[hsl(225_45%_8%)] disabled:opacity-40"
        >
          按格式批量下载 ZIP
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {["png", "jpg", "mp4", "gif", "mov", "apng", "pdf", "zip"].map((f) => (
          <label key={f} className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border)/0.5)] px-2 py-1">
            <input
              type="checkbox"
              checked={formats.includes(f)}
              onChange={(e) =>
                setFormats((prev) =>
                  e.target.checked ? [...new Set([...prev, f])] : prev.filter((x) => x !== f)
                )
              }
            />
            {f}
          </label>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-[hsl(var(--muted))]">
          暂无已采纳内容。请在审核台点击「采纳」。
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border)/0.55)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[hsl(var(--border)/0.45)] bg-[hsl(var(--surface)/0.65)] text-xs uppercase tracking-wide text-[hsl(var(--muted))]">
              <tr>
                <th className="px-4 py-3 font-medium">选择</th>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">账号 / 品类</th>
                <th className="px-4 py-3 font-medium">档位</th>
                <th className="px-4 py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-[hsl(var(--border)/0.25)] last:border-0 hover:bg-[hsl(var(--surface-raised)/0.35)]"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked ? [...new Set([...prev, t.id])] : prev.filter((id) => id !== t.id)
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{t.copyTitle}</td>
                  <td className="px-4 py-3 text-[hsl(var(--muted))]">
                    {t.account.name} · {t.category.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-[hsl(var(--border))] px-2 py-0.5 text-xs">
                      {t.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums text-[hsl(var(--muted))]">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function sanitizeName(input: string): string {
  return input.replace(/[^\w\-]+/g, "_").slice(0, 24);
}
