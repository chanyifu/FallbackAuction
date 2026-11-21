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

const publicClient = createPublicClient({ chain: localChain, transport: http(RPC) });
const wallets = accounts.map((account) =>
  createWalletClient({ account, chain: localChain, transport: http(RPC) })
);

const MON = parseEther("1");
let failures = 0;

function assert(cond, msg) {
  if (cond) console.log("  PASS:", msg);
  else {
    failures++;
    console.error("  FAIL:", msg);
  }
}

async function timeTravel(sec) {
  await publicClient.request({ method: "evm_increaseTime", params: [sec] });
  await publicClient.request({ method: "evm_mine", params: [] });
}

async function deploy(beneficiaryAddr) {
  const block = await publicClient.getBlock();
  const bidDeadline = block.timestamp + 300n;
  const args = [
    {
      beneficiary: beneficiaryAddr,
      itemUri: "ipfs://demo-item",
      startPrice: parseEther("10"),
      minIncrement: parseEther("1"),
      bidDeadline,
      payWindow: 600n,
      depositBps: 1000n,
      maxBidders: 8n,
    },
  ];
  const hash = await wallets[0].deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}

async function bid(wallet, addr, priceMon) {
  const price = parseEther(String(priceMon));
  const deposit = (price * 1000n) / 10000n;
  const hash = await wallet.writeContract({
    address: addr,
    abi: artifact.abi,
    functionName: "bid",
    args: [price],
    value: deposit,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

async function call(wallet, addr, fn, args = [], value = 0n) {
  const hash = await wallet.writeContract({
    address: addr,
    abi: artifact.abi,
    functionName: fn,
    args,
    value,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

async function balance(addr) {
  return publicClient.readContract({ address: addr, abi: artifact.abi, functionName: "contractBalance" });
}

async function state(addr) {
  return publicClient.readContract({ address: addr, abi: artifact.abi, functionName: "state" });
}

async function scenario1() {
  console.log("\n=== 路径一：A 违约 → B 递补成交 ===");
  const addr = await deploy(beneficiary.address);
  console.log("  contract:", addr);

  await bid(wallets[3], addr, 60); // C
  await bid(wallets[2], addr, 80); // B
  await bid(wallets[1], addr, 100); // A

  await timeTravel(301);
  await call(wallets[0], addr, "settle");

  await timeTravel(601);
  await call(wallets[0], addr, "advanceFallback"); // A 违约，递补 B

  // B 付尾款 72 MON（80 - 8 保证金）
  await call(wallets[2], addr, "pay", [], parseEther("72"));
  assert((await state(addr)) === 2, "状态为 WON"); // enum 2

  const balAfterPay = await balance(addr);
  assert(balAfterPay === parseEther("96"), `付款后合约余额 96 MON（含 C 待退保证金 6），实际 ${balAfterPay / MON}`);

  // C 退保证金 6
  await call(wallets[3], addr, "refund");
  assert((await balance(addr)) === parseEther("90"), "C 退款后合约余额 90 MON");

  // beneficiary 提款 90（用提款前后余额差核对，不依赖事件解码）
  const benBefore = await publicClient.getBalance({ address: beneficiary.address });
  const wdHash = await wallets[0].writeContract({
    address: addr,
    abi: artifact.abi,
    functionName: "withdraw",
  });
  const wdReceipt = await publicClient.waitForTransactionReceipt({ hash: wdHash });
  const gasFee = wdReceipt.gasUsed * wdReceipt.effectiveGasPrice;
  const benAfter = await publicClient.getBalance({ address: beneficiary.address });
  const withdrawn = benAfter - benBefore + gasFee;
  assert(withdrawn === parseEther("90"), `beneficiary 提款 90 MON，实际 ${withdrawn / MON}`);
  assert((await balance(addr)) === 0n, "合约余额清零");
}

async function scenario2() {
  console.log("\n=== 路径二：A、B 违约，C 拒绝递补 → 流拍 ===");
  const addr = await deploy(beneficiary.address);
  console.log("  contract:", addr);

  await bid(wallets[3], addr, 60);
  await bid(wallets[2], addr, 80);
  await bid(wallets[1], addr, 100);

  await timeTravel(301);
  await call(wallets[0], addr, "settle");

  await timeTravel(601);
  await call(wallets[0], addr, "advanceFallback"); // A 违约 → B
  await timeTravel(601);
  await call(wallets[0], addr, "advanceFallback"); // B 违约 → C
  await call(wallets[3], addr, "decline"); // C 拒绝 → 流拍

  assert((await state(addr)) === 5, "状态为 ABORTED"); // enum 5

  // C 保证金已在 decline 中退还；beneficiary 罚没 10 + 8 = 18
  const benBefore2 = await publicClient.getBalance({ address: beneficiary.address });
  const wdHash = await wallets[0].writeContract({
    address: addr,
    abi: artifact.abi,
    functionName: "withdraw",
  });
  const wdReceipt2 = await publicClient.waitForTransactionReceipt({ hash: wdHash });
  const gasFee2 = wdReceipt2.gasUsed * wdReceipt2.effectiveGasPrice;
  const benAfter2 = await publicClient.getBalance({ address: beneficiary.address });
  const withdrawn2 = benAfter2 - benBefore2 + gasFee2;
  assert(withdrawn2 === parseEther("18"), `beneficiary 罚没提款 18 MON，实际 ${withdrawn2 / MON}`);
  assert((await balance(addr)) === 0n, "合约余额清零");
}

(async () => {
  await scenario1();
  await scenario2();
  console.log(failures === 0 ? "\n全部通过 ✅" : `\n${failures} 项失败 ❌`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
