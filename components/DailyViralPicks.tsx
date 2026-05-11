"use client";

import { useState } from "react";
import { BizDropdown } from "@/components/BizDropdown";
import { PLATFORM_CHOICES } from "@/lib/content-taxonomy";
import {
  TRENDING_CONTENT_PREVIEW_LEN,
  TRENDING_TAG_DISPLAY_MAX,
} from "@/lib/trending-constants";

export type TrendingRecommendItem = {
  id: string;
  platform: string;
  category: string;
  title: string;
  contentBody: string;
  tags: string[];
  likes: number;
  comments: number;
  favorites: number;
  url: string;
};

type CategoryOpt = { id: string; name: string };

function previewText(body: string): string {
  const t = (body || "").trim();
  if (t.length <= TRENDING_CONTENT_PREVIEW_LEN) return t || "（暂无正文摘要）";
  return `${t.slice(0, TRENDING_CONTENT_PREVIEW_LEN)}…`;
}

function clipUrl(url: string, max = 36): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

export function DailyViralPicks({
  categories,
  onReplicate,
}: {
  categories: CategoryOpt[];
  onReplicate: (p: { url: string; platform: string; trackName: string }) => void;
}) {
  const [platform, setPlatform] = useState<(typeof PLATFORM_CHOICES)[number]>("抖音");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [emptyMsg, setEmptyMsg] = useState("");
  const [items, setItems] = useState<TrendingRecommendItem[] | null>(null);

  async function recommend() {
    if (!categoryId) {
      setErr("请先选择内容赛道（与下方随便生一致）");
      return;
    }
    setErr("");
    setEmptyMsg("");
    setItems(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ platform, categoryId });
      const r = await fetch(`/api/trending/recommend?${q}`);
      const j = (await r.json()) as {
        empty?: boolean;
        items?: TrendingRecommendItem[];
        message?: string;
        error?: string;
      };
      if (!r.ok) {
        setErr(j.error || "请求失败");
        return;
      }
      if (j.empty) {
        setEmptyMsg(j.message || "当前组合下素材不足，无法推荐。");
        setItems([]);
        return;
      }
      setItems(j.items || []);
    } catch {
      setErr("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="biz-panel ring-glow mb-6">
      <div className="mb-4">
        <div className="fs-20 font-semibold tracking-tight text-[hsl(var(--foreground))]">每日爆款推荐</div>
        <p className="mt-1 fs-13 text-[hsl(var(--muted))]">选择平台及内容赛道（与随便生相同），我将为您推荐内容</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1">
          <div className="mb-1 fs-12 text-[hsl(var(--muted))]">平台</div>
          <BizDropdown
            className="w-full"
            value={platform}
            placeholder="请选择"
            options={PLATFORM_CHOICES.map((p) => ({ label: p, value: p }))}
            onChange={(v) => setPlatform(v as (typeof PLATFORM_CHOICES)[number])}
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <div className="mb-1 fs-12 text-[hsl(var(--muted))]">内容赛道</div>
          <BizDropdown
            className="w-full"
            value={categoryId}
            placeholder="请选择"
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
            onChange={setCategoryId}
          />
        </div>
        <button
          type="button"
          className="biz-primary-btn shrink-0"
          disabled={loading || categories.length === 0}
          onClick={() => void recommend()}
        >
          {loading ? "推荐中…" : "立即推荐"}
        </button>
      </div>

      {err ? <div className="mb-3 fs-12 text-red-400">{err}</div> : null}
      {emptyMsg ? (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface)/0.4)] px-4 py-8 text-center fs-13 text-[hsl(var(--muted))]">
          {emptyMsg}
        </div>
      ) : null}

      {items && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {items.map((it) => {
            const tagShow = (it.tags || []).slice(0, TRENDING_TAG_DISPLAY_MAX);
            const hasCat = categories.some((c) => c.name === it.category);
            return (
              <article
                key={it.id}
                className="flex flex-col rounded-xl border border-[hsl(var(--border)/0.45)] bg-[hsl(var(--surface)/0.5)] p-3"
              >
                <div className="mb-1 fs-11 font-medium text-[hsl(var(--accent))]">{it.category}</div>
                <div className="fs-14 font-semibold leading-snug text-[hsl(var(--foreground))]">{it.title}</div>
                <p className="mt-2 line-clamp-3 flex-1 fs-12 leading-relaxed text-[hsl(var(--muted))]">
                  {previewText(it.contentBody)}
                </p>
                {tagShow.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tagShow.map((tg) => (
                      <span
                        key={tg}
                        className="rounded-md bg-[hsl(var(--surface-raised))] px-1.5 py-0.5 fs-11 text-[hsl(var(--muted))]"
                      >
                        {tg}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 fs-11 text-[hsl(var(--muted))]">（无话题标签）</div>
                )}
                <div className="mt-2 fs-11 text-[hsl(var(--muted))]">
                  点赞 {it.likes.toLocaleString()} · 评论 {it.comments.toLocaleString()} · 收藏 {it.favorites.toLocaleString()}
                </div>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 truncate fs-11 text-[hsl(var(--accent))]"
                  title={it.url}
                >
                  {clipUrl(it.url)}
                </a>
                <div className="mt-3">
                  <button
                    type="button"
                    className="biz-primary-btn w-full !py-2 !fs-12"
                    onClick={() =>
                      onReplicate({
                        url: it.url,
                        platform: it.platform,
                        trackName: it.category,
                      })
                    }
                  >
                    立即复刻
                  </button>
                </div>
                {!hasCat ? (
                  <div className="mt-2 fs-11 text-amber-400/90">库中无「{it.category}」赛道，请同步品类或导入时改为标准赛道名。</div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
