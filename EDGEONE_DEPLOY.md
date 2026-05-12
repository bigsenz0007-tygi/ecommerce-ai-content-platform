# EdgeOne Pages 迁移清单

本项目已整理为可直接迁移到 EdgeOne Pages 的 Next.js 全栈项目。

## 仓库内已完成

- 新增 `edgeone.json`
- 新增 `.env.example`
- README 已切换为 EdgeOne Pages 部署说明

## EdgeOne 控制台建议配置

### 1. 基础构建

- Framework: `Next.js`
- Root Directory: `./`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `.next`
- Node Version: `22.11.0`

如果控制台已自动识别 `edgeone.json`，以仓库配置为准即可。

### 2. 环境变量

必填：

- `DATABASE_URL`

按需填写：

- `DOUBAO_API_KEY`
- `DOUBAO_MODEL`
- `DOUBAO_BASE_URL`
- `DOUBAO_VISION`
- `KIMI_API_KEY`
- `KIMI_MODEL`
- `KIMI_BASE_URL`
- `KIMI_VISION`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `DEEPSEEK_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `OPENAI_VISION`

说明：

- 当前项目在无可用数据库时会自动切到演示模式，但若要线上持久化、导入推荐库、发布连接状态等功能可用，必须配置真实 `DATABASE_URL`。
- 推荐使用 PostgreSQL（例如 TencentDB / Supabase / Neon）。

### 3. 数据库初始化

首次上线后执行：

```bash
DATABASE_URL="postgresql://..." npm run db:push
DATABASE_URL="postgresql://..." npm run db:seed
```

再重新触发一次部署。

### 4. 域名迁移

- 从 Vercel 切换时，先移除旧 DNS 记录
- 按 EdgeOne 项目里提供的新记录值配置域名
- 若要在中国大陆正式对外提供服务，请确认域名备案状态满足接入要求

## 直接部署方式

### 方式一：Git 导入

1. 登录 EdgeOne Pages
2. 连接 GitHub
3. 选择仓库 `bigsenz0007-tygi/ecommerce-ai-content-platform`
4. 检查构建配置和环境变量
5. 点击部署

### 方式二：CLI 直传

浏览器登录：

```bash
npx -y --registry=https://registry.npmmirror.com edgeone@latest login
npx -y --registry=https://registry.npmmirror.com edgeone@latest pages deploy -n ecommerce-ai-content-platform
```

Token 部署：

```bash
npx -y --registry=https://registry.npmmirror.com edgeone@latest pages deploy -n ecommerce-ai-content-platform -t $EDGEONE_API_TOKEN
```

## 兼容性说明

- Next.js 15 App Router: 支持
- SSR / Route Handlers: 支持
- Prisma: 需要真实 `DATABASE_URL`
- `next.config.ts` 当前无需为 EdgeOne 额外修改
- 若后续新增 Next.js `redirects` / `rewrites`，建议优先迁移到 `edgeone.json`
