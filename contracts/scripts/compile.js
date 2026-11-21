const fs = require("fs");
const path = require("path");
const solc = require("solc");

const srcDir = path.join(__dirname, "..", "src");
const outDir = path.join(__dirname, "..", "artifacts");
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".sol"));
const sources = {};
for (const f of files) {
  sources[f] = { content: fs.readFileSync(path.join(srcDir, f), "utf-8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  const errors = output.errors.filter((e) => e.severity === "error");
  if (errors.length) {
    console.error(JSON.stringify(errors, null, 2));
    process.exit(1);
  }
  for (const w of output.errors) console.warn("warn:", w.message);
}

for (const f of files) {
  const contractName = f.replace(".sol", "");
  const contract = output.contracts[f][contractName];
  if (!contract) continue;
  const artifact = {
    contractName,
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
    deployedBytecode: contract.evm.deployedBytecode.object,
  };
  fs.writeFileSync(
    path.join(outDir, `${contractName}.json`),
    JSON.stringify(artifact, null, 2)
  );
  console.log("compiled:", contractName, "bytecode:", contract.evm.bytecode.object.length, "chars");
}
