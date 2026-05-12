import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[440px] items-center px-4 py-10">
      <div className="glass w-full rounded-2xl p-6 text-center">
        <div className="text-xl font-semibold">登录功能暂时隐藏</div>
        <div className="mt-2 text-sm text-[hsl(var(--muted))]">
          当前版本可直接体验主要流程，无需登录。
        </div>
        <div className="mt-4">
          <Link href="/dashboard" className="biz-primary-btn inline-flex items-center justify-center">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
