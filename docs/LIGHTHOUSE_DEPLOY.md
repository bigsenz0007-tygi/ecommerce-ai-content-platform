# 腾讯云轻量应用服务器部署（Next standalone）

目标：整站（页面 + `app/api/*`）由同一 Next 进程提供，数据库白名单只加轻量机公网 IP；EdgeOne 第一版可不做反代，域名 A 记录直解析到轻量机即可。

## 1. 服务器准备

- 安装 **Node.js 22 LTS**（与本地开发主版本一致即可）。
- 安全组放行 **80 / 443**（若直接暴露 Node 则放行 **3100**；推荐前面加 Nginx 反代到本机 3100）。
- 在云数据库控制台将 **轻量机公网 IP** 加入白名单（勿再依赖个人办公网 IP）。

## 2. 获取代码与依赖

```bash
cd /var/www   # 示例路径
git clone <你的仓库> ecommerce-ai-content-platform
cd ecommerce-ai-content-platform
npm ci
```

## 3. 生产环境变量

```bash
cp .env.production.example .env.production
# 编辑 .env.production：DATABASE_URL、DOUBAO_* 等
chmod 600 .env.production
```

**注意**：模型与数据库密钥仅放在 `.env.production`（或 systemd `EnvironmentFile`），不要使用 `NEXT_PUBLIC_` 前缀。

## 4. 构建与 standalone 资源

```bash
npm run build
npm run release:prepare
```

`release:prepare` 会把 `.next/static` 复制到 `.next/standalone`（若仓库根目录存在 `public` 则一并复制；无 `public` 时会创建空目录）。否则线上 CSS/JS 会 404。

**Prisma**：`schema.prisma` 已配置 `binaryTargets`（含 Debian/RHEL OpenSSL 3），便于在 macOS 上构建后部署到常见腾讯云 x86_64 镜像。若轻量机为 **ARM 架构**，请在 `generator client` 中增加 `linux-arm64-openssl-3.0.x` 后重新 `npm run build`。

## 5. 数据库迁移（在能连库的机器上执行一次）

```bash
# 确保 DATABASE_URL 已指向生产库且当前 IP 在白名单内
npm run db:push
npm run db:seed   # 若需要初始数据
```

## 6. 用 pm2 守护（推荐）

```bash
chmod +x scripts/run-standalone.sh scripts/prepare-standalone.sh
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup    # 按提示执行一次，实现开机自启
```

默认监听 `PORT=3100`（可在 `.env.production` 修改）。监听地址使用 `NEXT_BIND_HOST`（默认 `0.0.0.0`），**不要**依赖 shell 里的 `HOSTNAME`。

## 7. systemd 替代方案（可选）

`/etc/systemd/system/tygi-next.service` 示例：

```ini
[Unit]
Description=Next.js ecommerce-ai-content-platform (standalone)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ecommerce-ai-content-platform
EnvironmentFile=/var/www/ecommerce-ai-content-platform/.env.production
ExecStart=/usr/bin/bash /var/www/ecommerce-ai-content-platform/scripts/run-standalone.sh
Restart=always
RestartSec=4

[Install]
WantedBy=multi-user.target
```

然后：`sudo systemctl daemon-reload && sudo systemctl enable --now tygi-next`。

## 8. Nginx 反代（可选）

将 `server_name` 指向你的域名，`proxy_pass http://127.0.0.1:3100;`，并配置 TLS（`certbot` 等）。

## 9. 上线后验证清单

1. 浏览器打开首页，样式与路由正常。
2. `curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/api/stats`（需登录态的接口可改用带 Cookie 的请求）。
3. 登录后在控制台执行一次 **`/api/run`**（「立即生成」「精准生成」），确认 200 且豆包有正文返回。
4. 云数据库监控/慢查询无持续连接失败。

## 10. EdgeOne（推荐形态：国内加速 + 源站轻量）

- **前端体验**：EdgeOne 作为 **CDN / 反向代理入口**，静态与首包在国内访问更快（与「域名直绑轻量机」相比多一层配置，但符合常见生产形态）。
- **后端**：**不要**把核心业务（数据库、豆包 Key、`/api/*`）放在 EdgeOne Pages **边缘函数 / 边缘运行时**里；统一由 **轻量机上的 Node 进程**（本项目为 **Next.js standalone**，无需再拆一套 Express/Nest）处理。
- **源站**：回源地址填轻量机 **Nginx 的 443/80** 或直连 **本机监听端口**（如 `3100`，视你是否前置 Nginx 而定）。
- **第一版**：若 EdgeOne 配置暂不熟，可仍用 **域名 A 记录 → 轻量机**，上线后再切 CDN。

## 11. 发版流程摘要

```bash
git pull
npm ci
npm run build
npm run release:prepare
pm2 reload ecosystem.config.cjs
```
