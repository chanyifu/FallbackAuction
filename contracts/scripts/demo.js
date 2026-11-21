// 现场演示脚本：在本地 Hardhat 节点（8545）上跑通两条履约路径。
// 用法：先 `npx hardhat node --port 8545`，再 `node scripts/demo.js`
const fs = require("fs");
const path = require("path");
const {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} = require("viem");
const { mnemonicToAccount } = require("viem/accounts");

const artifact = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "artifacts", "FallbackAuction.json"), "utf-8")
);

const RPC = "http://127.0.0.1:8545";
const localChain = {
  id: 31337,
  name: "hardhat-local",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};
const MNEMONIC = "test test test test test test test test test test test junk";
const accounts = [0, 1, 2, 3].map((i) => mnemonicToAccount(MNEMONIC, { addressIndex: i }));
const [beneficiary, A, B, C] = accounts;

const publicClient = createPublicClient({ chain: localChain, transport: http(RPC) });
const wallets = accounts.map((account) =>
  createWalletClient({ account, chain: localChain, transport: http(RPC) })
);

const STATE = ["OPEN", "PAYING", "WON", "DEFAULTED", "FALLBACK", "ABORTED", "REFUNDED"];
const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
const mon = (w) => Number(formatEther(w)).toFixed(2);

async function timeTravel(sec) {
  await publicClient.request({ method: "evm_increaseTime", params: [sec] });
  await publicClient.request({ method: "evm_mine", params: [] });
}

async function deploy() {
  const block = await publicClient.getBlock();
  const args = [{
    beneficiary: beneficiary.address,
    itemUri: "ipfs://demo-item",
    startPrice: parseEther("10"),
    minIncrement: parseEther("1"),
    bidDeadline: block.timestamp + 300n,
    payWindow: 600n,
    depositBps: 1000n,
    maxBidders: 8n,
  }];
  const hash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}

async function bid(wallet, addr, priceMon) {
  const price = parseEther(String(priceMon));
  const deposit = (price * 1000n) / 10000n;
  const hash = await wallet.writeContract({ address: addr, abi: artifact.abi, functionName: "bid", args: [price], value: deposit });
  await publicClient.waitForTransactionReceipt({ hash });
}

async function call(wallet, addr, fn, args = [], value = 0n) {
  const hash = await wallet.writeContract({ address: addr, abi: artifact.abi, functionName: fn, args, value });
  await publicClient.waitForTransactionReceipt({ hash });
}

async function board(addr) {
  const [state, bids, balance] = await Promise.all([
    publicClient.readContract({ address: addr, abi: artifact.abi, functionName: "state" }),
    publicClient.readContract({ address: addr, abi: artifact.abi, functionName: "getBids" }),
    publicClient.readContract({ address: addr, abi: artifact.abi, functionName: "contractBalance" }),
  ]);
  console.log(`  状态 ${STATE[state]} · 合约余额 ${mon(balance)} MON`);
  bids.forEach((b, i) => {
    const tag = b.paid ? "已成交" : !b.active && b.deposit === 0n ? "已退款/拒绝" : !b.active ? "已违约(罚没)" : "候补";
    console.log(`    #${i + 1} ${short(b.bidder)} 出价 ${mon(b.price)} · 保证金 ${mon(b.deposit)} · ${tag}`);
  });
  return state;
}

async function scenarioFallback() {
  console.log("\n──────────────────────────────────────────────");
  console.log("场景一：最高价 A 违约 → 第二高价 B 递补成交");
  console.log("──────────────────────────────────────────────");
  const addr = await deploy();
  console.log("  部署合约：", addr);

  await bid(wallets[3], addr, 60);
  await bid(wallets[2], addr, 80);
  await bid(wallets[1], addr, 100);
  console.log("\n  [出价结束] 三人各冻 10% 保证金：");
  await board(addr);

  await timeTravel(301);
  await call(wallets[0], addr, "settle");
  console.log("\n  [落槌] 出价截止，最高价 A 进入付款窗口：");
  await board(addr);

  await timeTravel(601);
  await call(wallets[0], addr, "advanceFallback");
  console.log("\n  [A 超时未付款] 保证金 10 MON 罚没，自动递补 B：");
  await board(addr);

  await call(wallets[2], addr, "pay", [], parseEther("72"));
  console.log("\n  [B 付尾款 72] B 总支出 80（保证金 8 + 尾款 72），成交：");
  await board(addr);

  await call(wallets[3], addr, "refund");
  console.log("\n  [C 退保证金 6]：");
  await board(addr);

  const before = await publicClient.getBalance({ address: beneficiary.address });
  await call(wallets[0], addr, "withdraw");
  const after = await publicClient.getBalance({ address: beneficiary.address });
  console.log(`\n  [受益人提款] ${mon(after - before)} MON（B 价款 80 + A 罚没 10）`);
  await board(addr);
}

async function scenarioAbort() {
  console.log("\n──────────────────────────────────────────────");
  console.log("场景二：A、B 均违约，C 拒绝递补 → 流拍退款");
  console.log("──────────────────────────────────────────────");
  const addr = await deploy();
  console.log("  部署合约：", addr);

  await bid(wallets[3], addr, 60);
  await bid(wallets[2], addr, 80);
  await bid(wallets[1], addr, 100);

  await timeTravel(301);
  await call(wallets[0], addr, "settle");

  await timeTravel(601);
  await call(wallets[0], addr, "advanceFallback");
  console.log("\n  [A 违约] 罚没 10，递补 B：");
  await board(addr);

  await timeTravel(601);
  await call(wallets[0], addr, "advanceFallback");
  console.log("\n  [B 违约] 罚没 8，递补 C：");
  await board(addr);

  await call(wallets[3], addr, "decline");
  console.log("\n  [C 拒绝递补] 退保证金 6，无人承接 → 流拍：");
  await board(addr);

  const before = await publicClient.getBalance({ address: beneficiary.address });
  await call(wallets[0], addr, "withdraw");
  const after = await publicClient.getBalance({ address: beneficiary.address });
  console.log(`\n  [受益人提款罚没] ${mon(after - before)} MON（A 10 + B 8），标的未售出`);
}

(async () => {
  await scenarioFallback();
  await scenarioAbort();
  console.log("\n演示完成 ✅");
  process.exit(0);
})().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exit(1);
});
