import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { CRITICAL_INLINE_CSS } from "@/lib/critical-inline-css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Aura Content Ops | 电商 AI 内容工厂",
  description: "按计划生成文案、图片与短视频，质检与审核闭环",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        {/* 外链 CSS 偶发 404 时避免「白底纯文本」误判为断网；完整样式仍由 globals.css 提供 */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_INLINE_CSS }} />
        {children}
      </body>
    </html>
  );
}
