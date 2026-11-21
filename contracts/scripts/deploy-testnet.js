// 部署 FallbackAuction 到 Monad 测试网。
// 密钥来自 .deploy-key.json（一次性测试网地址，勿提交仓库、勿在主网复用）。
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
const key = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", ".deploy-key.json"), "utf-8")
);
const account = privateKeyToAccount(key.privateKey);

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
};

const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

(async () => {
  const block = await publicClient.getBlock();
  const bidDeadline = block.timestamp + 1800n; // 30 分钟出价窗口
  const params = {
    beneficiary: account.address,
    itemUri: "ipfs://fallback-auction-demo",
    startPrice: parseEther("0.1"),
    minIncrement: parseEther("0.05"),
    bidDeadline,
    payWindow: 600n,
    depositBps: 1000n,
    maxBidders: 8n,
  };

  console.log("deployer:", account.address);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("balance:", balance.toString());

  // Monad 按 gas_limit 收费；合约约 7KB，给 5M 上限留足余量。
  const gas = 5_000_000n;
  console.log("gas cap:", gas.toString());

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [params],
    gas,
  });
  console.log("deploy tx:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const address = receipt.contractAddress;
  console.log("contract:", address);
  console.log("explorer: https://testnet.monadscan.com/address/" + address);

  const safe = (v) => (typeof v === "bigint" ? v.toString() : v);
  fs.writeFileSync(
    path.join(__dirname, "..", "artifacts", "deployment-testnet.json"),
    JSON.stringify(
      {
        chainId: 10143,
        network: "monad-testnet",
        address,
        deployer: account.address,
        deployTx: hash,
        blockNumber: Number(receipt.blockNumber),
        params: {
          beneficiary: params.beneficiary,
          itemUri: params.itemUri,
          startPrice: safe(params.startPrice),
          minIncrement: safe(params.minIncrement),
          bidDeadline: safe(params.bidDeadline),
          payWindow: safe(params.payWindow),
          depositBps: safe(params.depositBps),
          maxBidders: safe(params.maxBidders),
        },
        explorer: "https://testnet.monadscan.com/address/" + address,
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e.shortMessage || e.message);
  process.exit(1);
});
