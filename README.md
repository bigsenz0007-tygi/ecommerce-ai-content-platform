# Aura Content Ops · 电商 AI 内容工厂（MVP）

独立新项目，与仓库内其他目录无依赖。技术栈：**Next.js 15 + React 19 + TypeScript + Tailwind + Prisma (SQLite)**。

## 本地运行

```bash
cd ecommerce-ai-content-platform
npm install
npm run db:push
npm run db:seed
npm run dev
```

浏览器打开：**http://localhost:3100**（根路径会重定向到 `/dashboard`）

（默认端口 `3100`，避免与常见 `3000` 冲突。）

### 页面打不开 / 一直转圈

1. 确认依赖已装全：`test -f node_modules/next/dist/bin/next && echo OK`  
   若显示缺失，执行：`rm -rf node_modules package-lock.json && npm install`
2. 确认开发服务在跑：终端里应出现 `▲ Next.js` 和 `Local: http://localhost:3100`  
3. 若提示 **port 3100 已被占用**（`EADDRINUSE`），结束旧进程或换端口：  
   `lsof -i :3100` 记下 PID 后 `kill <PID>`，或执行 `npm run dev:3101` 后打开 **http://localhost:3101**
4. 用 **http://127.0.0.1:3100** 试一次（排除部分环境对 `localhost` 解析问题）

## 可测功能

| 页面 | 说明 |
| --- | --- |
| 任务总览 | 查看统计，点击「运行今日批次」生成模拟内容（文案 / 占位图 / 脚本） |
| 审核台 | 待审核任务：采纳 / 驳回 |
| 策略配置 | 日产条数、Premium 槽位、计划时刻、禁入词 |
| 素材归档 | 已采纳列表，导出 JSON 演示包 |
| 素材适配 | 淘宝 / 抖音 / 小红书 / 京东常见尺寸预设，图片裁剪、缩放、预览与 PNG 导出 |

当前 **AI 调用均为前端演示用模拟数据**，接入真实模型时替换 `lib/pipeline.ts` 即可。

## 平台接入说明（摘要）

- **淘宝 / 天猫、抖音、京东、小红书**：商品与内容的「一键发布」依赖各平台**开放平台 / 商家后台接口**，通常需要主体资质、应用审核与权限范围，与本仓库的「规格适配 + 裁剪」属不同层级能力。
- **本页「素材适配」**：根据各平台常见**主图、笔记、竖屏短视频**等比例与像素参考值，在浏览器内完成裁剪与导出；规格数据见 `lib/platform-specs.ts`，请以官方最新规则为准并允许运营侧后续热更新。
- **视频**：成片转码、时长与码率规范可在后续接入 FFmpeg 或服务端队列；当前可先按竖屏分辨率导出封面帧（与图片流程相同）。

## 若出现 `next: command not found` 或依赖不完整

1. 删除依赖后重装：`rm -rf node_modules package-lock.json && npm install`  
2. 本项目脚本已改为直接通过 `node ./node_modules/...` 调用 CLI，避免未生成 `node_modules/.bin` 时找不到命令。  
3. `npm run dev` 使用端口 **3100**。

## 环境变量

复制 `.env.example` 为 `.env`（已内置 SQLite 默认路径）。生产环境请改用 PostgreSQL 等。

## 线上部署（给他人使用）

### 1) 建议架构

- 前端与 API：Vercel（或同类 Node 平台）
- 数据库：PostgreSQL（Neon / Supabase / RDS）
- 文件存储：OSS / S3（用于图片、视频）
- 域名：自定义域名 + HTTPS

### 2) 关键改造建议

- 将 `DATABASE_URL` 从 SQLite 切换到 PostgreSQL。
- 当前登录验证码为演示模式，需接入真实短信服务商（阿里云短信 / 腾讯云短信等）。
- 当前 `data/*.json` 文件存储（登录会话、平台账号池）仅适合本地演示；线上需迁移到数据库表。
- 生产环境关闭调试验证码展示（代码已默认在 production 不返回 `debugCode`）。

### 3) 最小上线流程

```bash
# 1. 安装并构建
npm install
npm run build

# 2. 初始化数据库
npm run db:push
npm run db:seed

# 3. 启动
npm start
```

Vercel 场景请在项目设置里配置环境变量并执行 Prisma 初始化命令。

## 新仓库初始化（本地）

```bash
git init
git add .
git commit -m "chore: bootstrap ecommerce ai content platform"
```

## 目录说明

- `app/` — 页面与 API Route
- `lib/pipeline.ts` — 批次生成与评分逻辑（模拟）
- `prisma/schema.prisma` — 数据模型
