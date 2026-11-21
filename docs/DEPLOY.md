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

1. 注册 Render 并在 Dashboard → New → Web Service；
2. 连接 GitHub 仓库 `chanyifu/FallbackAuction`（首次需授权 Render GitHub App）；
3. 配置：
   - Runtime: `Dockerfile`（自动识别根目录 `Dockerfile`）
   - Branch: `main`
   - Instance type: Free
   - Port: `8899`（服务也会读平台注入的 `PORT` 环境变量）
   - Build / Start 命令留空，使用 Dockerfile 内 `CMD`
4. 部署完成后用平台分配的 `https://<service>.onrender.com` 访问。

> 免费档空闲一段时间会休眠，唤醒后冷启动约几十秒；boot 脚本会在唤醒时自动重建演示。

## 其他平台（Koyeb / Railway / Northflank 等）

等价配置：Dockerfile 构建、暴露端口 `8899`（或读 `PORT`）、启动命令 `bash contracts/scripts/boot.sh`。

## 安全说明

容器内演示钱包是 Hardhat 助记词派生的一次性测试账户，仅用于本地/演示链；不要把这套部署接到主网，也不要在后端托管真实资金密钥。
