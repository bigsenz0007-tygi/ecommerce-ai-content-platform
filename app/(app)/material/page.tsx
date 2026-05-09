import { AdaptStudio } from "@/components/AdaptStudio";

export default function MaterialPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">素材处理页</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[hsl(var(--muted))]">
          统一处理图文/视频素材的裁剪、平台尺寸适配、格式导出与打包下载。建议在发布前先完成本页处理，再回待发布执行预览与投放。
        </p>
      </div>
      <AdaptStudio />
    </div>
  );
}
