// 本地演示中继：托管 web/ 静态页，浏览器按钮经此签名发交易到 Hardhat 节点。
// 仅用于本地演示，不接公网；签名用的是 Hardhat 助记词派生的一次性演示账户。
const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  createPublicClient,
  createWalletClient,
  http: viemHttp,
} = require("viem");
const { mnemonicToAccount } = require("viem/accounts");

const ROOT = path.join(__dirname, "..", "..");
const WEB = path.join(ROOT, "web");
const artifact = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "artifacts", "FallbackAuction.json"), "utf-8")
);

// 读取生成的清单（JS 赋值给 window）
const manifestCode = fs.readFileSync(path.join(WEB, "demo-manifest.js"), "utf-8");
const sandbox = {};
eval(manifestCode.replace("window.", "sandbox."));
const manifest = sandbox.DEMO_MANIFEST;

const chain = {
  id: manifest.chainId,
  name: "hardhat-local",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [manifest.rpc] } },
};
const publicClient = createPublicClient({ chain, transport: viemHttp(manifest.rpc) });
const accounts = manifest.accounts.map((_, i) =>
  mnemonicToAccount(manifest.mnemonic, { addressIndex: i })
);
const walletClients = accounts.map((account) =>
  createWalletClient({ account, chain, transport: viemHttp(manifest.rpc) })
);
const ROLE_INDEX = { 受益人: 0, A: 1, B: 2, C: 3 };

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json",
};

function sendJSON(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}

async function readState(auction) {
  const [state, bids, balance, credit, winner, payDeadline, params] = await Promise.all([
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "state" }),
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "getBids" }),
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "contractBalance" }),
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "beneficiaryCredit" }),
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "getWinner" }),
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "payDeadline" }),
    publicClient.readContract({ address: auction, abi: artifact.abi, functionName: "params" }),
  ]);
  return {
    state: Number(state),
    balance: balance.toString(),
    credit: credit.toString(),
    payDeadline: Number(payDeadline),
    winner: { address: winner[0], price: winner[1].toString(), deposit: winner[2].toString() },
    bids: bids.map((b) => ({
      bidder: b.bidder, price: b.price.toString(), deposit: b.deposit.toString(),
      active: b.active, paid: b.paid,
    })),
    params: {
      beneficiary: params[0], itemUri: params[1], startPrice: params[2].toString(),
      minIncrement: params[3].toString(), bidDeadline: Number(params[4]), payWindow: Number(params[5]),
      depositBps: Number(params[6]), maxBidders: Number(params[7]),
    },
  };
}

async function act(body) {
  const { auction, wallet, method, args = [], value = "0", jumpSeconds = 0 } = body;
  if (jumpSeconds > 0) {
    await publicClient.request({ method: "evm_increaseTime", params: [jumpSeconds] });
    await publicClient.request({ method: "evm_mine", params: [] });
  }
  const idx = typeof wallet === "number" ? wallet : ROLE_INDEX[wallet];
  const hash = await walletClients[idx].writeContract({
    address: auction,
    abi: artifact.abi,
    functionName: method,
    args,
    value: BigInt(value),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txHash: hash, blockNumber: Number(receipt.blockNumber), status: receipt.status };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:8899");
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
      return res.end();
    }

    if (url.pathname === "/api/state" && req.method === "GET") {
      return sendJSON(res, 200, await readState(url.searchParams.get("auction")));
    }
    if (url.pathname === "/api/act" && req.method === "POST") {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", async () => {
        try {
          const body = JSON.parse(raw || "{}");
          const out = await act(body);
          sendJSON(res, 200, { ok: true, ...out });
        } catch (e) {
          sendJSON(res, 500, { ok: false, error: e.shortMessage || e.message });
        }
      });
      return;
    }

    // 静态文件
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const filePath = path.join(WEB, pathname);
    if (!filePath.startsWith(WEB) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return sendJSON(res, 404, { ok: false, error: "not found" });
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    sendJSON(res, 500, { ok: false, error: e.shortMessage || e.message });
  }
});

const PORT = Number(process.env.PORT || 8899);
const HOST = process.env.HOST || "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log("demo relay: http://" + HOST + ":" + PORT + "  ·  auctions:", manifest.auctions.length);
});
