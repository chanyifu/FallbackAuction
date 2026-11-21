// 给测试网演示合约补三笔小额出价（一次性测试网钱包，密钥不入库）。
const fs = require("fs");
const path = require("path");
const {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} = require("viem");
const { privateKeyToAccount, generatePrivateKey } = require("viem/accounts");

const artifact = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "artifacts", "FallbackAuction.json"), "utf-8")
);
const walletDeployment = path.join(__dirname, "..", "artifacts", "deployment-testnet-wallet.json");
const oldDeployment = path.join(__dirname, "..", "artifacts", "deployment-testnet.json");
const deploymentFile = process.env.DEPLOYMENT || (fs.existsSync(walletDeployment) ? walletDeployment : oldDeployment);
const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
const keyFile = path.join(__dirname, "..", ".bidder-keys.json");

const RPC = "https://testnet-rpc.monad.xyz";
const chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};
const publicClient = createPublicClient({ chain, transport: http(RPC) });

const PRICES = ["0.20", "0.25", "0.30"]; // 升序出价，最小加价 0.05
let keys = fs.existsSync(keyFile) ? JSON.parse(fs.readFileSync(keyFile, "utf-8")) : [];

async function ensureFunded(account) {
  const bal = await publicClient.getBalance({ address: account.address });
  if (bal > parseEther("0.1")) return;
  const r = await fetch("https://agents.devnads.com/v1/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chainId: 10143, address: account.address }),
  });
  console.log("  faucet", account.address, r.status, await r.text());
  await new Promise((res) => setTimeout(res, 4000));
}

(async () => {
  const addr = deployment.address;
  console.log("contract:", addr);

  for (let i = 0; i < PRICES.length; i++) {
    if (!keys[i]) {
      const priv = generatePrivateKey();
      keys[i] = { privateKey: priv, address: privateKeyToAccount(priv).address };
    }
    const account = privateKeyToAccount(keys[i].privateKey);
    const wallet = createWalletClient({ account, chain, transport: http(RPC) });
    await ensureFunded(account);

    const price = parseEther(PRICES[i]);
    const deposit = (price * 1000n) / 10000n;
    const hash = await wallet.writeContract({
      address: addr,
      abi: artifact.abi,
      functionName: "bid",
      args: [price],
      value: deposit,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  bid #${i + 1} ${account.address} @ ${PRICES[i]} MON  tx ${hash.slice(0, 18)}…  block ${Number(receipt.blockNumber)}`);
  }

  fs.writeFileSync(keyFile, JSON.stringify(keys, null, 2));

  const bids = await publicClient.readContract({ address: addr, abi: artifact.abi, functionName: "getBids" });
  console.log("\n  当前榜单：");
  bids.forEach((b, i) =>
    console.log(`    #${i + 1} ${b.bidder} 出价 ${formatEther(b.price)} · 保证金 ${formatEther(b.deposit)}`)
  );
})().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exit(1);
});
