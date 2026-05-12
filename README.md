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

## EdgeOne Pages 部署（当前推荐）

项目根目录已补齐 `edgeone.json`，EdgeOne Pages 导入仓库后可直接识别以下关键参数：

- `installCommand`: `npm ci`
- `buildCommand`: `npm run build`
- `outputDirectory`: `.next`
- `nodeVersion`: `22.11.0`

### A. 先准备生产环境变量

至少配置以下变量：

```bash
DATABASE_URL="postgresql://生产库连接串"
```

如需接入真实模型，再按 `.env.example` 补充 `DOUBAO_*`、`KIMI_*`、`DEEPSEEK_*`、`OPENAI_*`。

### B. 代码在 GitHub 的 `main` 上

在本地项目目录执行：

```bash
git checkout main
git push origin main
```

打开 GitHub 仓库，确认能看到 `package.json`、`app/`、`edgeone.json` 等文件。

### C. 在 EdgeOne Pages 创建项目

1. 打开 [EdgeOne Pages](https://edgeone.ai/pages/new?s_url=https://console.tencentcloud.com/edgeone/pages)。
2. 选择 GitHub 仓库 `bigsenz0007-tygi/ecommerce-ai-content-platform`。
3. Framework 选择 `Next.js`，Root Directory 保持 `./`。
4. 若控制台未自动读到配置，手动填写：
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Node Version: `22.11.0`
5. 在环境变量中添加 `DATABASE_URL`，若要接真模型，再补充对应供应商密钥。
6. 点击部署，等待首个生产部署完成。

### D. 给线上数据库建表 + 种子（只做一次）

在你本机（或任何能上网的终端），**用线上的同一条 `DATABASE_URL`**：

```bash
cd ecommerce-ai-content-platform
DATABASE_URL="postgresql://同上" npm run db:push
DATABASE_URL="postgresql://同上" npm run db:seed
```

然后在 EdgeOne 控制台重新触发一次部署，确保运行时代码与数据库结构对齐。

### E. 自定义域名切换

如果之前域名还指向 Vercel，需要把旧的 A / AAAA / CNAME 记录删除，再按 EdgeOne 提供的新记录值切过去。

### F. 直接上传部署（CLI，可选）

如果你不想走 Git 导入，也可以本机直接部署：

```bash
npx -y --registry=https://registry.npmmirror.com edgeone@latest login
npx -y --registry=https://registry.npmmirror.com edgeone@latest pages deploy -n ecommerce-ai-content-platform
```

如果是 CI/CD 或无浏览器环境，改用 API Token：

```bash
npx -y --registry=https://registry.npmmirror.com edgeone@latest pages deploy -n ecommerce-ai-content-platform -t $EDGEONE_API_TOKEN
```

---

## Vercel 说明（历史）

之前的 Vercel 部署说明保留仅作历史参考；当前默认部署目标已切到 EdgeOne Pages。

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
