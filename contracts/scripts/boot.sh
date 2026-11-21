#!/bin/bash
# 云后端启动入口：本地 Hardhat 节点 → 批量重建 6 场演示 → 前台启动中继/静态页。
# 容器重启后链上状态随内存清空，本脚本每次开机重新部署一轮演示，保证清单与节点一致。
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/contracts"

echo "[boot] starting hardhat node :8545"
npx hardhat node --port 8545 &

# 等待节点 RPC 就绪（node 22 自带 fetch，不依赖 curl）
for i in $(seq 1 30); do
  if node -e "fetch('http://127.0.0.1:8545',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'eth_chainId',id:1})}).then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
    echo "[boot] node ready after ${i}s"
    break
  fi
  sleep 1
done

echo "[boot] deploying demo auctions"
node scripts/demo-multi.js

echo "[boot] starting relay :${PORT:-8899}"
exec node scripts/demo-server.js
