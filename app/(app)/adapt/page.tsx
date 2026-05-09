import { AdaptStudio } from "@/components/AdaptStudio";

export default function AdaptPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">素材适配</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[hsl(var(--muted))]">
          按淘宝、抖音、小红书、京东常见素材规格锁定比例，支持多平台勾选后一键适配与 ZIP 打包下载。适配过程会进行核心区域覆盖校验提示，帮助你在发布前发现裁切风险。
        </p>
      </div>
      <AdaptStudio />
    </div>
  );
}
