/**
 * pm2 守护 Next standalone。部署目录填为服务器上本仓库绝对路径。
 * 用法：在仓库根目录放置 .env.production 后执行
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 */
const path = require("path");

const root = __dirname;

module.exports = {
  apps: [
    {
      name: "ecommerce-ai-content-platform",
      cwd: root,
      script: path.join(root, "scripts/run-standalone.sh"),
      interpreter: "bash",
      autorestart: true,
      max_restarts: 30,
      min_uptime: "10s",
      restart_delay: 4000,
      exp_backoff_restart_delay: 2000,
      time: true,
    },
  ],
};
