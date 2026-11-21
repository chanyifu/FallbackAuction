# 云后端部署说明

把「本地 Hardhat 节点 + 六场并发演示 + 签名中继 + 静态页」打成一个常驻容器，部署到任意支持 Docker / Node 的免费后端。

## 架构

容器启动入口 `contracts/scripts/boot.sh`：

1. 启动内存链 Hardhat 节点（`127.0.0.1:8545`，仅容器内部）；
2. 等 RPC 就绪后跑 `scripts/demo-multi.js`，批量重建 6 场分钟级闪拍并生成 `web/demo-manifest.js`；
3. 前台启动 `scripts/demo-server.js`：托管静态页 + `/api/state` 只读 + `/api/act` 签名发交易。

链上状态只存在容器内存里，**不持久化**；容器重启后 boot 脚本会自动重建一轮演示，清单与节点保持一致。

## 本地验证

```bash
docker build -t fa-demo .
docker run --rm -p 8899:8899 fa-demo
# 打开 http://127.0.0.1:8899/
```

## Render（免费 Web Service）

仓库已是 public，可直接用「Public Git Repository」方式接入，无需安装 Render GitHub App。

1. 打开 https://dashboard.render.com 注册/登录；
2. New → Web Service，源码选择 **Public Git Repository**，粘贴：
   `https://github.com/chanyifu/FallbackAuction`
3. 配置：
   - Name: `fallback-auction-demo`（决定 `https://fallback-auction-demo.onrender.com`）
   - Branch: `main`
   - Language / Runtime: `Docker`
   - Dockerfile Path: `./Dockerfile`
   - Plan: `Free`（0.1 CPU / 512 MB）
   - Build / Start 命令留空，使用 Dockerfile 内 `CMD`
   - 端口：应用读平台注入的 `PORT`，默认监听 `8899`；健康检查路径 `/`
4. 点 Create Web Service，首次构建部署约 2–5 分钟；完成后用平台分配的
   `https://<service>.onrender.com` 访问。

> 免费档空闲约 15 分钟会休眠，唤醒后冷启动几十秒；boot 脚本会在唤醒时自动重建演示。
> 若 512 MB 内存不足以同时跑 Hardhat 节点 + 中继，服务会 OOM 重启，这时改回本地演示。

## 其他平台（Koyeb / Railway / Northflank 等）

等价配置：Dockerfile 构建、暴露端口 `8899`（或读 `PORT`）、启动命令 `bash contracts/scripts/boot.sh`。

## 平台约束记录（2026-11-21 探测）

- **Render**：免费档（0.1 CPU / 512 MB）在创建服务时仍要求 Stripe 留存银行卡信息做反欺诈验证，免费实例本身不扣费。
- **Koyeb**：Hobby 免费档无需绑卡；但当前办公网络到其后端 ingress（`*.ingress.mistral.run`）连接超时，控制台服务配置表单加载不出来。换手机热点等其他网络后可按「Git → 公开仓库 → Dockerfile → 免费 Eco/Hobby 实例 → 端口 8899」重试。
- **Northflank**：免费 Sandbox 注册时也要银行卡做验证；**Railway / Fly.io**：控制面或 API 在当前网络不通，且同样偏付费试用。
- 本机 NAT 后无公网入口，内置沙箱云主机只绑 `127.0.0.1`、无对外公网域名，都不能当常驻后端；不使用内网穿透把本机暴露到公网。

## 安全说明

容器内演示钱包是 Hardhat 助记词派生的一次性测试账户，仅用于本地/演示链；不要把这套部署接到主网，也不要在后端托管真实资金密钥。
