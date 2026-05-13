import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 若出现 `_next/static/css/app/layout.css` 404 导致页面无样式，请执行 `npm run dev:clean` 或手动 `rm -rf .next` 后重启 dev。 */
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  /** Prisma schema 需打进 standalone 产物，避免线上缺文件 */
  outputFileTracingIncludes: {
    "/api/**/*": ["./prisma/**/*"],
  },
};

export default nextConfig;
