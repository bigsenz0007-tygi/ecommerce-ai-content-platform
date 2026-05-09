"use client";

import { useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import type { ContentTask } from "@/components/ContentList";
import { PLATFORMS, type PlatformId } from "@/lib/platform-specs";
import { getCroppedImageBlob } from "@/lib/crop-image";

function mapPlatformId(platform: string): PlatformId {
  if (platform.includes("淘宝")) return "taobao";
  if (platform.includes("抖音")) return "douyin";
  if (platform.includes("小红书")) return "xiaohongshu";
  return "jd";
}

export function TaskEditModal({
  task,
  saving,
  onClose,
  onSave,
}: {
  task: ContentTask;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { copyTitle: string; copyBody: string; imageUrl: string; videoUrl: string }) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(task.copyTitle || "");
  const [body, setBody] = useState(task.copyBody || "");
  const [imageUrls, setImageUrls] = useState<string[]>(parseImageUrls(task.imageUrl));
  const [videoUrl, setVideoUrl] = useState(task.videoUrl || "");

  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageIdx, setCropImageIdx] = useState<number>(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);

  const [platformId, setPlatformId] = useState<PlatformId>(mapPlatformId(task.account.platform));
  const activePlatform = useMemo(() => PLATFORMS.find((p) => p.id === platformId) ?? PLATFORMS[0]!, [platformId]);
  const [presetId, setPresetId] = useState(activePlatform.presets[0]!.id);
  const activePreset = useMemo(
    () => activePlatform.presets.find((p) => p.id === presetId) ?? activePlatform.presets[0]!,
    [activePlatform, presetId]
  );

  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);

  useEffect(() => {
    setPresetId(activePlatform.presets[0]!.id);
  }, [activePlatform]);

  async function onApplyCrop() {
    if (!imageUrls[cropImageIdx] || !croppedPixels) return;
    const blob = await getCroppedImageBlob(
      imageUrls[cropImageIdx],
      croppedPixels,
      activePreset.width,
      activePreset.height
    );
    const url = URL.createObjectURL(blob);
    setImageUrls((prev) => prev.map((x, i) => (i === cropImageIdx ? url : x)));
    setCropOpen(false);
  }

  function onImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImageUrls((prev) => {
      const remain = Math.max(0, 8 - prev.length);
      const incoming = Array.from(files).slice(0, remain).map((f) => URL.createObjectURL(f));
      return [...prev, ...incoming];
    });
  }

  function onVideoUpload(file: File | null) {
    if (!file) return;
    setVideoUrl(URL.createObjectURL(file));
  }

  function appendEmoji(emoji: string) {
    setBody((prev) => `${prev}${emoji}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="glass w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl p-4">
        <div className="mb-3 fs-16 font-semibold">编辑内容</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[hsl(var(--border)/0.45)] p-3">
            <div className="fs-12 text-[hsl(var(--muted))]">标题：xxxx</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="biz-control mt-2 w-full" />
            <div className="mt-3 fs-12 text-[hsl(var(--muted))]">正文：xxxx</div>
            <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="biz-control mt-2 w-full !h-auto py-2" />
            <div className="mt-2 flex flex-wrap gap-2">
              {["😀", "🔥", "✨", "🎉", "💡", "❤️", "👍", "📌"].map((emoji) => (
                <button key={emoji} type="button" onClick={() => appendEmoji(emoji)} className="btn-secondary rounded-lg px-2 py-1 fs-12 h-auto">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[hsl(var(--border)/0.45)] p-3 space-y-3">
            <div>
              <div className="fs-12 text-[hsl(var(--muted))]">配图：xxxx</div>
              {imageUrls.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
                  <div className="flex min-w-max gap-2 pr-2">
                    {imageUrls.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative h-36 w-36 shrink-0 rounded-lg border border-[hsl(var(--border)/0.45)] bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`配图${idx + 1}`} className="h-full w-full rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute right-1 top-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.9)] px-1.5 py-0.5 text-[10px]"
                        >
                          删
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2 fs-12 text-[hsl(var(--muted))]">暂无图片</div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="fs-12 text-[hsl(var(--muted))] self-center">已上传 {imageUrls.length}/8</div>
                <label className={`btn-secondary rounded-lg px-3 py-1.5 fs-12 h-auto cursor-pointer ${imageUrls.length >= 8 ? "opacity-40 pointer-events-none" : ""}`}>
                  上传（超过8个不支持上传）
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onImageUpload(e.target.files)}
                    disabled={imageUrls.length >= 8}
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary rounded-lg px-3 py-1.5 fs-12 h-auto"
                  onClick={() => setCropOpen((v) => !v)}
                  disabled={imageUrls.length === 0}
                >
                  在线裁剪
                </button>
              </div>
            </div>
            <div>
              <div className="fs-12 text-[hsl(var(--muted))]">视频：xxxx</div>
              {videoUrl ? (
                <div className="relative mt-2">
                  <video src={videoUrl} controls className="max-h-48 w-full rounded-lg border border-[hsl(var(--border)/0.45)] bg-black/30" />
                  <button
                    type="button"
                    onClick={() => setVideoUrl("")}
                    className="absolute right-2 top-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-raised)/0.9)] px-2 py-0.5 text-[10px]"
                  >
                    删除
                  </button>
                </div>
              ) : (
                <div className="mt-2 fs-12 text-[hsl(var(--muted))]">暂无视频</div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="btn-secondary rounded-lg px-3 py-1.5 fs-12 h-auto cursor-pointer">
                  重新上传
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => onVideoUpload(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>
        </div>
        {cropOpen && imageUrls.length > 0 ? (
          <div className="mt-4 rounded-xl border border-[hsl(var(--border)/0.45)] p-3">
            <div className="fs-12 text-[hsl(var(--muted))]">
              平台推荐尺寸：{activePlatform.label} / {activePreset.name}（{activePreset.width}x{activePreset.height}）
            </div>
            <div className="mt-2 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {imageUrls.map((u, idx) => (
                  <button
                    key={`${u}-${idx}-pick`}
                    type="button"
                    onClick={() => setCropImageIdx(idx)}
                    className={`rounded-lg border px-2 py-1 fs-12 ${cropImageIdx === idx ? "border-[hsl(var(--accent))]" : "border-[hsl(var(--border))]"}`}
                  >
                    第{idx + 1}张
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              <select className="biz-control" value={platformId} onChange={(e) => setPlatformId(e.target.value as PlatformId)}>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <select className="biz-control md:col-span-2" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                {activePlatform.presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}（{p.width}x{p.height}）</option>
                ))}
              </select>
            </div>
            <div className="relative mt-3 h-72 w-full overflow-hidden rounded-xl bg-black/25">
              <Cropper
                image={imageUrls[cropImageIdx]}
                crop={crop}
                zoom={zoom}
                aspect={activePreset.width / activePreset.height}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, px) => setCroppedPixels(px)}
              />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
              <button type="button" onClick={() => void onApplyCrop()} className="btn-primary rounded-lg px-3 py-1.5 fs-12 h-auto">应用裁剪</button>
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary rounded-xl" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn-primary rounded-xl"
            onClick={() => void onSave({ copyTitle: title, copyBody: body, imageUrl: imageUrls.join("||"), videoUrl })}
            disabled={saving}
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function parseImageUrls(raw: string): string[] {
  if (!raw) return [];
  if (!raw.includes("||")) return [raw];
  return raw.split("||").map((s) => s.trim()).filter(Boolean);
}
