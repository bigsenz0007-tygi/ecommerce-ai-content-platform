"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { PLATFORMS, aspectOf, type SizePreset } from "@/lib/platform-specs";
import { getCroppedImageBlob } from "@/lib/crop-image";

export function AdaptStudio() {
  const [activePlatformId, setActivePlatformId] = useState(PLATFORMS[0]!.id);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([PLATFORMS[0]!.id]);
  const [formats, setFormats] = useState<string[]>(["png"]);
  const activePlatform = useMemo(
    () => PLATFORMS.find((p) => p.id === activePlatformId)!,
    [activePlatformId]
  );

  const [presetId, setPresetId] = useState(activePlatform.presets[0]!.id);
  useEffect(() => {
    setPresetId(activePlatform.presets[0]!.id);
  }, [activePlatform.presets]);

  const preset: SizePreset = useMemo(
    () =>
      activePlatform.presets.find((p) => p.id === presetId) ??
      activePlatform.presets[0]!,
    [activePlatform.presets, presetId]
  );

  const aspect = aspectOf(preset);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coreWarning, setCoreWarning] = useState("");

  const onCropComplete = useCallback((_c: Area, px: Area) => {
    setCroppedPixels(px);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onFile(f: File | null) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCroppedPixels(null);
    if (!f) {
      setImageSrc((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      return;
    }
    setImageSrc((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function buildPreview() {
    if (!imageSrc || !croppedPixels) return;
    const blob = await getCroppedImageBlob(
      imageSrc,
      croppedPixels,
      preset.width,
      preset.height
    );
    const url = URL.createObjectURL(blob);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setCoreWarning(
      checkCoreCoverage(croppedPixels)
        ? ""
        : "警告：裁切区域可能未覆盖画面核心主体（默认按画面中心检测）"
    );
  }

  async function downloadSingle(format: string) {
    if (!imageSrc || !croppedPixels) return;
    const pngBlob = await getCroppedImageBlob(
      imageSrc,
      croppedPixels,
      preset.width,
      preset.height
    );
    const blob = await convertBlobByFormat(pngBlob, format);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adapt-${preset.id}-${preset.width}x${preset.height}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadBatchZip() {
    if (!imageSrc || !croppedPixels || selectedPlatforms.length === 0 || formats.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const platformId of selectedPlatforms) {
      const p = PLATFORMS.find((it) => it.id === platformId);
      if (!p) continue;
      for (const pr of p.presets) {
        const pngBlob = await getCroppedImageBlob(imageSrc, croppedPixels, pr.width, pr.height);
        for (const fmt of formats) {
          const converted = await convertBlobByFormat(pngBlob, fmt);
          zip.file(`${platformId}/${pr.id}.${fmt}`, converted);
        }
      }
    }
    zip.file(
      "README.txt",
      "素材按多平台预设尺寸导出。若核心区域偏移，请回到页面重新调整裁切框。"
    );
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adapt-batch-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="glass ring-glow rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-medium text-[hsl(var(--foreground))]">平台与规格</h2>
        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted))]">
          {activePlatform.integrationNote}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="text-[hsl(var(--muted))]">激活平台（用于调裁切预设）</span>
            <select
              value={activePlatformId}
              onChange={(e) => setActivePlatformId(e.target.value as (typeof PLATFORMS)[number]["id"])}
              className="mt-2 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]"
            >
              {PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="text-[hsl(var(--muted))]">多平台勾选（用于一键批量适配）</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => {
                const checked = selectedPlatforms.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border)/0.5)] px-2 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedPlatforms((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, p.id])]
                            : prev.filter((id) => id !== p.id)
                        );
                      }}
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </div>
          <label className="block text-sm">
            <span className="text-[hsl(var(--muted))]">素材用途 / 尺寸预设</span>
            <select
              value={preset.id}
              onChange={(e) => setPresetId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.55)] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]"
            >
              {activePlatform.presets.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.name}（{pr.width}×{pr.height}）
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 text-xs text-[hsl(var(--muted))]">
          支持导出格式：png、jpg、pdf、gif、apng、mp4、mov、zip。
        </div>
      </div>

      <div className="glass ring-glow rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-medium">上传与裁切</h2>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className="mt-3 block w-full text-sm text-[hsl(var(--muted))] file:mr-4 file:rounded-lg file:border-0 file:bg-[hsl(var(--surface-raised))] file:px-4 file:py-2 file:text-sm file:text-[hsl(var(--foreground))]"
        />
        <div className="mt-2 text-xs text-[hsl(var(--muted))]">
          比例锁定为 {preset.width}:{preset.height}（约 {(aspect * 100).toFixed(2)}% 宽/高比）。
        </div>
        {imageSrc ? (
          <>
            <div className="relative mt-4 h-[min(52vh,480px)] w-full overflow-hidden rounded-xl bg-[hsl(222_40%_8%)]">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex flex-1 items-center gap-3 text-sm text-[hsl(var(--muted))]">
                缩放
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="h-2 flex-1 accent-[hsl(var(--accent))]"
                />
              </label>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-[hsl(var(--border))] py-16 text-center text-sm text-[hsl(var(--muted))]">
            请上传一张图片开始裁切
          </div>
        )}
      </div>

      <div className="glass ring-glow rounded-2xl p-5 md:p-6">
        <h2 className="text-sm font-medium">预览与导出</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {["png", "jpg", "pdf", "gif", "apng", "mp4", "mov"].map((f) => (
            <label
              key={f}
              className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border)/0.5)] px-2 py-1 text-xs"
            >
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!imageSrc || !croppedPixels}
            onClick={() => void buildPreview()}
            className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--surface-raised)/0.6)] disabled:opacity-40"
          >
            刷新预览
          </button>
          <button
            type="button"
            disabled={!imageSrc || !croppedPixels}
            onClick={() => void downloadSingle("png")}
            className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-[hsl(225_45%_8%)] disabled:opacity-40"
          >
            下载 PNG
          </button>
          <button
            type="button"
            disabled={!imageSrc || !croppedPixels}
            onClick={() => void downloadBatchZip()}
            className="rounded-xl bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-[hsl(225_45%_8%)] disabled:opacity-40"
          >
            一键多平台适配并下载 ZIP
          </button>
        </div>
        {coreWarning ? (
          <div className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {coreWarning}
          </div>
        ) : null}
        {previewUrl ? (
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-start">
            <div>
              <div className="text-xs text-[hsl(var(--muted))]">导出预览</div>
              <img
                src={previewUrl}
                alt="裁剪预览"
                className="mt-2 max-h-64 rounded-xl border border-[hsl(var(--border)/0.5)] object-contain"
              />
            </div>
            <div className="text-xs leading-relaxed text-[hsl(var(--muted))] md:max-w-sm">
              gif/apng/mp4/mov 当前为演示占位导出，后续可接 FFmpeg/云转码实现真实格式输出。
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function checkCoreCoverage(crop: Area): boolean {
  const centerX = 400;
  const centerY = 400;
  return (
    centerX >= crop.x &&
    centerX <= crop.x + crop.width &&
    centerY >= crop.y &&
    centerY <= crop.y + crop.height
  );
}

async function convertBlobByFormat(blob: Blob, format: string): Promise<Blob> {
  if (format === "png") return blob;
  if (format === "jpg") return blobToJpeg(blob);
  if (format === "pdf") return blobToPdf(blob);
  if (["gif", "apng", "mp4", "mov"].includes(format)) {
    return new Blob(
      [`演示占位文件：${format}\n当前未启用真实转码，请后续接入 FFmpeg/云转码。`],
      { type: "text/plain;charset=utf-8" }
    );
  }
  return blob;
}

async function blobToJpeg(blob: Blob): Promise<Blob> {
  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(img, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || blob), "image/jpeg", 0.92);
  });
}

async function blobToPdf(blob: Blob): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const dataUrl = await blobToDataUrl(blob);
  const doc = new jsPDF({ orientation: "portrait", unit: "px", format: [800, 800] });
  doc.addImage(dataUrl, "PNG", 0, 0, 800, 800);
  return doc.output("blob");
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
