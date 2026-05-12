# Trending Worker

这个 worker 负责：

1. 用 `Playwright` 保持登录态访问小红书 / 抖音
2. 定时采集候选内容
3. 抽取标题、正文、标签、点赞、评论、收藏、封面图、图片、视频、原始链接
4. 调用模型做赛道分类、风格总结、结构总结、复刻摘要
5. 通过主站的 `/api/trending/ingest` 写入 PostgreSQL，并同步合格内容到推荐库

## 1. 安装

```bash
cd worker
npm install
npx playwright install chromium
```

## 2. 配置

复制一份环境变量：

```bash
cp .env.example .env
```

至少要填：

- `TRENDING_INGEST_ENDPOINT`
- `TRENDING_INGEST_TOKEN`

建议同时填模型 Key（`DOUBAO_*` / `KIMI_*` / `OPENAI_*` / `DEEPSEEK_*`）。

## 3. 首次登录

```bash
npm run login
```

浏览器打开后手动登录小红书 / 抖音，关闭浏览器即可。登录态会保存在 `WORKER_PROFILE_DIR`。

## 4. 单次采集

```bash
npm run crawl
```

## 5. 定时运行

```bash
npm run schedule
```

更推荐在 CVM / 容器里用系统级调度：

- Linux `crontab`
- `systemd`
- Supervisor / PM2

## 6. 推荐阈值

默认阈值：

- 点赞 > `1000`
- 收藏 > `50`
- 评论 > `100`

超过阈值的内容会被同步到主站推荐库。
