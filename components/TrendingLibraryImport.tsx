"use client";

import { useState } from "react";
import { CATEGORY_TRACK_NAMES, PLATFORM_CHOICES } from "@/lib/content-taxonomy";

const TSV_HELP = `从 Excel 复制：共 9 列（制表符分隔），顺序为：
平台 | 内容赛道 | 标题 | 正文 | 标签 | 点赞 | 评论 | 收藏 | 链接
平台填「小红书」或「抖音」；内容赛道填「${CATEGORY_TRACK_NAMES.join("」「")}」之一。
也可每行只粘贴一个小红书/抖音分享链接（默认赛道：生活日常）。`;

export function TrendingLibraryImport() {
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function doImport() {
    if (!raw.trim()) {
      setMsg("请先粘贴内容");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/trending/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const j = (await r.json()) as { error?: string; imported?: number };
      if (!r.ok) {
        setMsg(j.error || "导入失败");
        return;
      }
      setMsg(`已导入 ${j.imported ?? 0} 条`);
      setRaw("");
    } catch {
      setMsg("网络异常");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-[hsl(var(--muted))]">{TSV_HELP}</p>
      <p className="text-xs text-[hsl(var(--muted))]">
        示例：在 Excel 中填好 9 列后整行复制；列与列之间为「Tab 制表符」。标签列可用英文逗号分隔多个话题（如 #通勤,#口红）。
      </p>
      <textarea
        className="biz-control min-h-[180px] w-full resize-y !h-auto py-2 font-mono text-xs"
        placeholder={`或每行一个链接，例如：\nhttps://www.douyin.com/video/...\nhttps://www.xiaohongshu.com/explore/...`}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="biz-primary-btn" disabled={busy} onClick={() => void doImport()}>
          {busy ? "导入中…" : "一键导入推荐库"}
        </button>
        <span className="text-xs text-[hsl(var(--muted))]">
          {`支持 Excel 复制 TSV；平台限「${PLATFORM_CHOICES.join("、")}」`}
        </span>
      </div>
      {msg ? <div className="text-sm text-[hsl(var(--accent))]">{msg}</div> : null}
    </div>
  );
}
