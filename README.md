# Aura Content Ops · 电商 AI 内容工厂（MVP）

独立新项目。技术栈：**Next.js 15 + React 19 + TypeScript + Tailwind + Prisma（PostgreSQL）**。

---

## 本地运行（一条线）

1. 在 [Neon](https://console.neon.tech) 或 Supabase 建一个 **PostgreSQL**，复制 **Connection string**（`postgresql://...`）。
2. 项目根目录创建 `.env`（可参考 `.env.example`）：

```bash
DATABASE_URL="postgresql://你的连接串"
```

3. 安装、建表、种子、启动：

```bash
cd ecommerce-ai-content-platform
npm install
npm run db:push
npm run db:seed
npm run dev
```

浏览器：**http://localhost:3100**（根路径会重定向到 `/dashboard`）

---

## 最后一次：Vercel 上线（按顺序做，不要跳步）

### A. 代码在 GitHub 的 `main` 上

在本地项目目录执行：

```bash
git checkout main
git push origin main
```

打开 GitHub 仓库，确认能看到 `package.json`、`app/` 等文件；**空仓库 Vercel 一定失败**。

### B. Vercel 只建 **一个** 项目

1. 打开 [vercel.com](https://vercel.com) → 用 GitHub 登录 → **Add New → Project**。
2. **Import** 仓库 `bigsenz0007-tygi/ecommerce-ai-content-platform`（或你的仓库名）。
3. **Project Name**：填一个全新名字（若提示已存在就换一个）。
4. **Framework Preset**：选 **Next.js**；Root Directory：**`./`**。
5. **Environment Variables**（先加再点 Deploy）：

| Key | Value |
|-----|--------|
| `DATABASE_URL` | 与 Neon 里 **同一条** `postgresql://...` |
| `NODE_ENV` | `production` |

6. 点击 **Deploy**，等变为 **Ready**。

### C. 给线上数据库建表 + 种子（只做一次）

在你本机（或任何能上网的终端），**用线上的同一条 `DATABASE_URL`**：

```bash
cd ecommerce-ai-content-platform
DATABASE_URL="postgresql://同上" npm run db:push
DATABASE_URL="postgresql://同上" npm run db:seed
```

然后到 Vercel → **Deployments** → **Redeploy** 一次（让运行时代码对齐）。

### D. 为什么之前会 404「没有 Production Deployment」？

常见原因：**连了仓库但从没往 Vercel 监控的生产分支推送过**，或推送的是别的分支。**推 `main`** 后会自动出新部署。

---

## 说明

- 验证码：**演示**，生产环境不会在接口里返回 `debugCode`；真短信需接运营商。
- 内容生成仍为 **mock**，接真模型改 `lib/pipeline.ts`。

## 常见问题

**port 占用**：`lsof -i :3100` 后 `kill` 对应 PID，或使用 `npm run dev:3101`。

**依赖不完整**：`rm -rf node_modules package-lock.json && npm install`。

## 目录

- `app/` — 页面与 API
- `lib/pipeline.ts` — 生成逻辑（模拟）
- `prisma/schema.prisma` — 数据模型
