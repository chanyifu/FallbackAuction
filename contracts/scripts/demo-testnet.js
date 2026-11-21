// 六场演示部署到 Monad 测试网：3 场违约递补成交 + 3 场双违约流拍退款。
// 全部交易用真实测试网密钥签名广播，链上可查；密钥仅本地读取，不入库、不打印。
const fs = require("fs");
const path = require("path");
const {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

const artifact = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "artifacts", "FallbackAuction.json"), "utf-8")
);
const depKey = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", ".deploy-key2.json"), "utf-8")
);
const bidKeys = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", ".bidder-keys.json"), "utf-8")
);

const beneficiary = privateKeyToAccount(depKey.privateKey);
const [A, B, C] = bidKeys.map((k) => privateKeyToAccount(k.privateKey));

const RPC = "https://testnet-rpc.monad.xyz";
const chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};
const publicClient = createPublicClient({ chain, transport: http(RPC) });
const wallets = [beneficiary, A, B, C].map((account) =>
  createWalletClient({ account, chain, transport: http(RPC) })
);
const ROLE = ["受益人", "A", "B", "C"];

const PRICE = {
  A: parseEther("0.20"),
  B: parseEther("0.16"),
  C: parseEther("0.12"),
};
const PAY_WINDOW = 15n; // 秒：公网不能跳时间，违约按真实窗口等待
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tx(wallet, auction, method, args = [], value = 0n) {
  const hash = await wallet.writeContract({
    address: auction,
    abi: artifact.abi,
    functionName: method,
    args,
    value,
  });
  const rc = await publicClient.waitForTransactionReceipt({ hash });
  const out = { hash, block: Number(rc.blockNumber), status: Number(rc.status) };
  console.log(`    ${method} -> ${hash} (block ${out.block}, status ${out.status})`);
  return out;
}

async function deployAuction(idx, scenario) {
  const block = await publicClient.getBlock();
  const deadline = block.timestamp + 120n; // 出价窗口留 120s，出价必须在截止前落链
  const params = {
    beneficiary: beneficiary.address,
    itemUri: `ipfs://testnet-demo-${idx + 1}`,
    startPrice: parseEther("0.10"),
    minIncrement: parseEther("0.03"),
    bidDeadline: deadline,
    payWindow: PAY_WINDOW,
    depositBps: 1000n,
    maxBidders: 8n,
  };
  const hash = await wallets[0].deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [params],
    gas: 3_000_000n,
  });
  const rc = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  部署 ${scenario} 场次 ${idx + 1}: ${rc.contractAddress}`);
  return { address: rc.contractAddress, deployTx: hash, bidDeadline: Number(deadline) };
}

function deposit(price) {
  return (price * 1000n) / 10000n;
}

async function waitDeadline(auction) {
  const deadline = await publicClient.readContract({
    address: auction, abi: artifact.abi, functionName: "payDeadline",
  });
  const now = await publicClient.getBlock().then((b) => b.timestamp);
  const waitMs = Number(deadline > now ? deadline - now : 0n) * 1000 + 2500;
  console.log(`    等待付款窗口截止（${Math.ceil(waitMs / 1000)}s）...`);
  await sleep(waitMs);
}

async function seedBids(auction) {
  const txs = {};
  txs.bidC = await tx(wallets[3], auction, "bid", [PRICE.C], deposit(PRICE.C));
  txs.bidB = await tx(wallets[2], auction, "bid", [PRICE.B], deposit(PRICE.B));
  txs.bidA = await tx(wallets[1], auction, "bid", [PRICE.A], deposit(PRICE.A));
  return txs;
}

async function runFallback(auction, txs) {
  await waitDeadline(auction);
  txs.defaultA = await tx(wallets[0], auction, "advanceFallback"); // A 违约罚没
  const remainingB = PRICE.B - deposit(PRICE.B);
  txs.payB = await tx(wallets[2], auction, "pay", [], remainingB); // B 递补成交
  txs.refundC = await tx(wallets[3], auction, "refund"); // C 退保证金
  txs.withdraw = await tx(wallets[0], auction, "withdraw"); // 受益人提款
}

async function runAbort(auction, txs) {
  await waitDeadline(auction);
  txs.defaultA = await tx(wallets[0], auction, "advanceFallback"); // A 违约
  await waitDeadline(auction);
  txs.defaultB = await tx(wallets[0], auction, "advanceFallback"); // B 违约
  txs.declineC = await tx(wallets[3], auction, "decline"); // C 拒绝递补
  txs.withdraw = await tx(wallets[0], auction, "withdraw"); // 受益人提罚没
}

(async () => {
  const N_FALLBACK = 3;
  const auctions = [];

  // 阶段一：六场部署 + 出价（出价窗口 120s 内完成）
  for (let i = 0; i < N_FALLBACK * 2; i++) {
    const scenario = i < N_FALLBACK ? "fallback" : "abort";
    const { address, deployTx, bidDeadline } = await deployAuction(i, scenario);
    const txs = { deploy: deployTx };
    console.log(`  场次 ${i + 1} 出价中...`);
    Object.assign(txs, await seedBids(address));
    auctions.push({
      address,
      label: `场次 ${i + 1}`,
      scenario,
      title: scenario === "fallback" ? "违约递补成交" : "双违约流拍退款",
      bidDeadline,
      bids: [
        { role: "A", bidder: A.address, price: "0.20", deposit: "0.020" },
        { role: "B", bidder: B.address, price: "0.16", deposit: "0.016" },
        { role: "C", bidder: C.address, price: "0.12", deposit: "0.012" },
      ],
      txs,
    });
  }

  // 阶段二：等待出价截止，统一落槌
  const maxDeadline = Math.max(...auctions.map((a) => a.bidDeadline));
  const now0 = await publicClient.getBlock().then((b) => Number(b.timestamp));
  const waitMs = Math.max(0, maxDeadline - now0) * 1000 + 2500;
  console.log(`  等待出价窗口截止（${Math.ceil(waitMs / 1000)}s）后统一落槌...`);
  await sleep(waitMs);
  for (const a of auctions) {
    console.log(`  落槌 ${a.address}`);
    a.txs.settle = await tx(wallets[0], a.address, "settle");
  }

  // 阶段三：递补成交路径
  for (let i = 0; i < N_FALLBACK; i++) {
    const a = auctions[i];
    console.log(`  [递补成交] ${a.address}`);
    await runFallback(a.address, a.txs);
  }

  // 阶段四：双违约流拍路径
  for (let i = N_FALLBACK; i < N_FALLBACK * 2; i++) {
    const a = auctions[i];
    console.log(`  [流拍退款] ${a.address}`);
    await runAbort(a.address, a.txs);
  }

  const manifest = {
    chainId: 10143,
    rpc: RPC,
    network: "Monad Testnet",
    beneficiary: beneficiary.address,
    accounts: [beneficiary, A, B, C].map((acc, i) => ({ role: ROLE[i], address: acc.address })),
    auctions,
  };
  const out = path.join(__dirname, "..", "..", "web", "demo-manifest-testnet.js");
  fs.writeFileSync(
    out,
    "// 测试网演示清单，由 scripts/demo-testnet.js 自动生成，勿手改。\n" +
      "window.DEMO_MANIFEST_TESTNET = " + JSON.stringify(manifest, null, 2) + ";\n"
  );
  console.log("\nmanifest written:", out);
  console.log("fallback=" + N_FALLBACK + " abort=" + N_FALLBACK + " total=" + auctions.length);
})().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exit(1);
});
