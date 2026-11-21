# FallbackAuction · 拍卖履约托管与违约递补协议

> Monad Blitz@广州 参赛项目 · 目标网络 Monad 测试网（chainId 10143）

## 一句话

不做现场出价演示，专攻拍卖**落槌之后**的履约：出价只冻 10% 保证金，中标人超时未付款即违约罚没，合约按出价从高到低自动递补下一名；候补拒绝则退保证金，无人承接即流拍，未违约者全额退款。全部由链上时间与合约规则执行，不依赖运营方人工处理。

## 解决什么问题

往届链上拍卖大多只覆盖"出价—成交"，但实物 / 法拍 / 域名 / RWA 等链下结算拍卖真正的风险在成交后：

- 中标人拍得后反悔、不付尾款；
- 保证金怎么罚、罚给谁，没有链上规则；
- 第一中标人违约后，第二、第三候补怎么顺位递补；
- 流拍后未中标者的保证金由谁、按什么规则退回。

本协议把这四件事写成状态机，任何人可触发推进，资金流向可事后核查。

## 合约能力

| 方法 | 作用 |
|---|---|
| `bid(price)` | 出价，只托管 `price × depositBps / 10000` 保证金；同一人可加价补足差额 |
| `settle()` | 出价截止后落槌，最高价进入付款窗口 |
| `pay()` | 中标人付尾款 `price − deposit`，到账后成交 |
| `advanceFallback()` | 付款窗口已过则当前中标人违约，保证金罚没给受益人，向下递补一名 |
| `decline()` | 候补中标人拒绝递补：全额退保证金，直接推给下一名 |
| `refund()` | 未中标者 / 流拍候补退还全额保证金 |
| `withdraw()` | 受益人提取成交价款与罚没保证金 |
| `getBids() / getWinner() / contractBalance()` | 只读视图 |

### 状态机（七状态）

`OPEN → PAYING → WON`（成交）；`PAYING` 超时违约 → `FALLBACK/PAYING`（递补轮）；无人承接 → `ABORTED → REFUNDED`。

### Gas 安全

- 单场出价人数硬上限 `maxBidders = 8`；
- 递补每次调用只向下推一名指针，**不做全榜 while 遍历**；
- 排名在插入 / 加价时冒泡维护，规模 ≤ 8，开销可控。

## 资金分布（示例：A=100 / B=80 / C=60 MON，保证金 10%）

**路径一：A 违约 → B 递补成交**

| 角色 | 出价 | 保证金 | 尾款 | 最终支出 | 结果 |
|---|---:|---:|---:|---:|---|
| A（违约） | 100 | 10 罚没 | 0 | 10 | 否 |
| B（递补成交） | 80 | 8 抵价款 | 72 | 80 | 是 |
| C（未中标） | 60 | 6 全额退还 | 0 | 0 | 否 |
| 受益人 | — | 收 B 价款 80 + A 罚没 10 = **90** | | | 售出 |

**路径二：A、B 都违约 → 流拍**

| 角色 | 出价 | 保证金 | 结果 |
|---|---:|---:|---|
| A（违约） | 100 | 10 罚没给受益人 | 支出 10 |
| B（违约） | 80 | 8 罚没给受益人 | 支出 8 |
| C（候补拒绝） | 60 | 6 全额退还 | 支出 0 |
| 受益人 | — | 收 **18** 罚没；标的未售出，链下退回 | |

## 仓库结构

```
contracts/
  src/FallbackAuction.sol        # 主合约
  scripts/compile.js             # solc-js 编译（自带 wasm，无需原生 solc）
  scripts/deploy-testnet.js       # 部署到 Monad 测试网
  scripts/seed-testnet.js         # 测试网演示出价播种（一次性钱包）
  scripts/demo.js                 # 本地节点两条履约路径演示
  test/run.js                    # 两条路径资金断言测试
  artifacts/                      # ABI / bytecode / 部署记录
web/
  index.html                      # 只读前端（裸 JSON-RPC，无 CDN 依赖）
docs/
  DESIGN.md                       # 设计稿与状态机
  DEMO-TRANSCRIPT.txt             # 演示脚本解说记录
  screenshot-frontend.png         # 前端截图
```

## 本地运行

```bash
cd contracts
npm install

# 编译
node scripts/compile.js

# 起本地节点（另开一个终端）
npx hardhat node --port 8545

# 跑资金断言测试（两条路径）
node test/run.js

# 跑现场演示脚本（违约递补成交 / 流拍退款）
node scripts/demo.js
```

## 测试网部署记录

- 网络：Monad Testnet（chainId 10143，RPC `https://testnet-rpc.monad.xyz`）
- 合约地址：`0x47c0a70433eee4c5f17c8e71d56fa8b29d7c90f5`
- 浏览器：https://testnet.monadscan.com/address/0x47c0a70433eee4c5f17c8e71d56fa8b29d7c90f5
- 参数：起拍价 0.1 MON，最小加价 0.05 MON，保证金 10%，付款窗口 600 秒，人数上限 8

## 前端

`web/index.html` 为单文件只读页面：展示协议状态、合约余额、受益人可提、出价截止倒计时、拍卖参数与出价榜（中标 / 候补 / 已违约 / 已退款）。默认接测试网公共 RPC，可切换本地 Hardhat 节点；每 5 秒轮询一次。

## 明确不做（范围外）

防狙击延时、AI 出价建议、荷兰式降价、撤价、争议仲裁治理、实物交付、观众钱包 onboarding。

## 上链口径

出价托管、超时判定、递补顺序、退款：链下做需信任运营方，合约自动执行且事后可查。拍卖周期按小时 / 天计，**不把"快出块 / 低延迟"作为上链理由**；Monad 侧只讲低费让多轮递补操作成本可控。
