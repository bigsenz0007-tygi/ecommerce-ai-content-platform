export type Area = { x: number; y: number; width: number; height: number };

/**
 * 根据 Cropper 选区在原图中裁切并缩放到目标像素，导出为 PNG Blob。
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  targetWidth: number,
  targetHeight: number
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas 上下文");

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const sx = pixelCrop.x;
  const sy = pixelCrop.y;
  const sw = pixelCrop.width;
  const sh = pixelCrop.height;

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("导出失败"));
      },
      "image/png",
      1
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = src;
  });
}
