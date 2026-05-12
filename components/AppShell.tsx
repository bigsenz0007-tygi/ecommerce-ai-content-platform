"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalToastCenter } from "@/components/GlobalToastCenter";

const primaryNav = [
  { href: "/dashboard", label: "首页总览" },
  { href: "/content", label: "全部内容/任务" },
  { href: "/review", label: "待审核" },
  { href: "/publish", label: "待发布" },
  { href: "/settings", label: "策略配置" },
];

const secondaryNav = [{ href: "/material", label: "发布前素材处理" }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] gap-6 px-4 py-6 md:px-8">
      <aside className="glass ring-glow hidden w-56 shrink-0 flex-col rounded-2xl p-4 md:flex">
        <div className="mb-8 px-2">
          <div className="text-xs font-medium uppercase tracking-widest text-[hsl(var(--muted))]">TYGI</div>
          <div className="mt-1 text-lg font-semibold text-gradient">Happy Tygi</div>
          <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted))]">
            智能内容生产与审核中台
          </p>
        </div>
        <div className="mb-2 px-2 text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
          主流程
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {primaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[hsl(var(--surface-raised))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-raised)/0.55)] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-4 mb-2 px-2 text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--muted))]">
            辅助工具
          </div>
          {secondaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[hsl(var(--surface-raised))] text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted))] hover:bg-[hsl(var(--surface-raised)/0.55)] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[hsl(var(--border)/0.45)] pt-4 text-[10px] leading-relaxed text-[hsl(var(--muted))]">
          <div>本地演示：内容均为模拟生成</div>
          <div className="mt-2">建议路径：首页生成 / 推荐 → 审核 → 待发布 → 策略配置。</div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="mb-6 flex items-center justify-between md:hidden">
          <span className="text-gradient text-lg font-semibold">Happy Tygi</span>
          <div className="flex items-center gap-2">
          <nav className="flex flex-wrap justify-end gap-2 text-xs">
            {[...primaryNav, ...secondaryNav].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-2 py-1 ${
                  pathname === item.href ? "bg-[hsl(var(--surface-raised))]" : "opacity-70"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          </div>
        </header>
        {children}
      </div>
      <GlobalToastCenter />
    </div>
  );
}
