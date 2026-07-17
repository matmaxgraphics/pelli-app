const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { createWalletClient, createPublicClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

// Load .env.local file using custom lightweight parser to avoid dependency issues
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    }
  }
}
loadEnv();

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
  testnet: true,
};

async function main() {
  console.log("Compiling MovieNightKeepsake.sol...");

  const contractPath = path.resolve(
    __dirname,
    "../contracts/MovieNightKeepsake.sol",
  );
  if (!fs.existsSync(contractPath)) {
    console.error(`Contract file not found at: ${contractPath}`);
    process.exit(1);
  }
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "MovieNightKeepsake.sol": {
        content: source,
      },
    },
    settings: {
      evmVersion: "cancun",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  function findImports(importPath) {
    if (importPath.startsWith("@openzeppelin/")) {
      const filePath = path.resolve(__dirname, "../node_modules", importPath);
      if (fs.existsSync(filePath)) {
        return { contents: fs.readFileSync(filePath, "utf8") };
      }
    }
    return { error: `File not found: ${importPath}` };
  }

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports }),
  );

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation failed:");
      console.error(output.errors.map((e) => e.formattedMessage).join("\n"));
      process.exit(1);
    } else {
      console.log("Compilation warnings:");
      console.log(output.errors.map((e) => e.formattedMessage).join("\n"));
    }
  }

  const contract =
    output.contracts["MovieNightKeepsake.sol"]["MovieNightKeepsake"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log("Compilation succeeded!");

  // If we only want to test compilation, we can pass --compile-only
  if (process.argv.includes("--compile-only")) {
    console.log("Compile-only check complete.");
    return;
  }

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("DEPLOYER_PRIVATE_KEY is missing in .env.local");
    console.error(
      "Please add DEPLOYER_PRIVATE_KEY=0x... with Monad testnet MON to deploy.",
    );
    process.exit(1);
  }

  const formattedKey = privateKey.startsWith("0x")
    ? privateKey
    : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);

  const client = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  console.log(`Deploying from account: ${account.address}`);

  const hash = await client.deployContract({
    abi,
    bytecode: `0x${bytecode}`,
  });

  console.log(`Deployment transaction hash: ${hash}`);
  console.log("Waiting for transaction confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;

  console.log(`\n=========================================`);
  console.log(`Contract deployed at: ${contractAddress}`);
  console.log(`=========================================\n`);

  // Update .env.local file
  const envPath = path.resolve(__dirname, "../.env.local");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  if (envContent.includes("NEXT_PUBLIC_KEEPSAKE_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_KEEPSAKE_ADDRESS=.*/,
      `NEXT_PUBLIC_KEEPSAKE_ADDRESS=${contractAddress}`,
    );
  } else {
    envContent += `\nNEXT_PUBLIC_KEEPSAKE_ADDRESS=${contractAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log(`Updated ${envPath} with the new address.`);
}

main().catch((err) => {
  console.error("Error running script:", err);
  process.exit(1);
});
