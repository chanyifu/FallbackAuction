// 多场并发演示部署：在本地 Hardhat 节点批量起 6 场分钟级闪拍，
// 3 场走「违约递补成交」，3 场走「双违约流拍退款」，生成前端清单 web/demo-manifest.js。
const fs = require("fs");
const path = require("path");
const {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
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
const ROLE = { [beneficiary.address]: "受益人", [A.address]: "A", [B.address]: "B", [C.address]: "C" };

const publicClient = createPublicClient({ chain: localChain, transport: http(RPC) });
const wallets = accounts.map((account) =>
  createWalletClient({ account, chain: localChain, transport: http(RPC) })
);

const N_FALLBACK = 3;
const N_ABORT = 3;
const PRICES = { A: 100n, B: 80n, C: 60n };

async function deploy(block, scenario, idx) {
  const args = [{
    beneficiary: beneficiary.address,
    itemUri: `ipfs://demo-lot-${idx + 1}`,
    startPrice: parseEther("10"),
    minIncrement: parseEther("1"),
    bidDeadline: block.timestamp + 180n, // 3 分钟出价窗口
    payWindow: 120n,                     // 2 分钟付款窗口
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
  const hash = await wallet.writeContract({
    address: addr, abi: artifact.abi, functionName: "bid", args: [price], value: deposit,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return deposit;
}

(async () => {
  const block = await publicClient.getBlock();
  const auctions = [];

  for (let i = 0; i < N_FALLBACK + N_ABORT; i++) {
    const scenario = i < N_FALLBACK ? "fallback" : "abort";
    const addr = await deploy(block, scenario, i);
    // 升序出价：C 60 → B 80 → A 100
    await bid(wallets[3], addr, 60);
    await bid(wallets[2], addr, 80);
    await bid(wallets[1], addr, 100);

    const bids = [
      { role: "A", bidder: A.address, price: PRICES.A.toString(), deposit: "10" },
      { role: "B", bidder: B.address, price: PRICES.B.toString(), deposit: "8" },
      { role: "C", bidder: C.address, price: PRICES.C.toString(), deposit: "6" },
    ];
    auctions.push({
      address: addr,
      label: `场次 ${i + 1}`,
      scenario,
      title: scenario === "fallback" ? "违约递补成交" : "双违约流拍退款",
      itemUri: `ipfs://demo-lot-${i + 1}`,
      params: {
        startPrice: "10", minIncrement: "1", payWindow: 120, depositBps: 1000, maxBidders: 8,
      },
      bids,
    });
    console.log(`  ${scenario === "fallback" ? "递补成交" : "流拍退款"} ${addr}`);
  }

  const manifest = {
    chainId: 31337,
    rpc: RPC,
    relay: "http://127.0.0.1:8899",
    mnemonic: MNEMONIC,
    beneficiary: beneficiary.address,
    accounts: accounts.map((a) => ({ role: ROLE[a.address], address: a.address })),
    auctions,
  };

  const out = path.join(__dirname, "..", "..", "web", "demo-manifest.js");
  fs.writeFileSync(out, "// 本地演示清单，由 scripts/demo-multi.js 自动生成，勿手改。\n" +
    "window.DEMO_MANIFEST = " + JSON.stringify(manifest, null, 2) + ";\n");
  console.log("\nmanifest written:", out);
  console.log(`fallback=${N_FALLBACK} abort=${N_ABORT} total=${auctions.length}`);
})().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exit(1);
});
