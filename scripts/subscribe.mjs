// scripts/subscribe.mjs
// Creates on-chain Reactivity subscriptions for all 8 tracked tokens.
// This tells Somnia validators to invoke WhaleTracker._onEvent()
// whenever a Transfer event fires on any of these tokens.
//
// Usage:
//   node scripts/subscribe.mjs
//
// Prerequisites:
//   - WhaleTracker deployed (address in .env)
//   - Wallet holds >= 32 SOM for handler invocation costs
//   - .env file with PRIVATE_KEY and WHALE_TRACKER_ADDRESS

import { SDK } from "@somnia-chain/reactivity";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "dotenv";

config(); // Load .env

// ─── Configuration ────────────────────────────────────────────────────
const RPC_URL = "https://dream-rpc.somnia.network";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WHALE_TRACKER = process.env.WHALE_TRACKER_ADDRESS;

if (!PRIVATE_KEY || PRIVATE_KEY === "0xYOUR_PRIVATE_KEY_HERE") {
  console.error("❌ Set PRIVATE_KEY in your .env file");
  process.exit(1);
}
if (!WHALE_TRACKER || WHALE_TRACKER === "0xYOUR_DEPLOYED_CONTRACT_ADDRESS") {
  console.error("❌ Set WHALE_TRACKER_ADDRESS in your .env file");
  process.exit(1);
}

// ─── Somnia Testnet Token Addresses ───────────────────────────────────
const TRACKED_TOKENS = [
  { name: "sUSDT", address: "0x65296738D4E5edB1515e40287B6FDf8320E6eE04" },
  { name: "USDC",  address: "0x0ED782B8079529f7385c3eDA9fAf1EaA0DbC6a17" },
  { name: "STT",   address: "0x7f89af8b3c0A68F536Ff20433927F4573CF001A3" },
  { name: "WSTT",  address: "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7" },
  { name: "WETH",  address: "0xdd8f41bf80d0E47132423339ca06bC6413da96b5" },
  { name: "PING",  address: "0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493" },
  { name: "PONG",  address: "0x9beaA0016c22B646Ac311Ab171270B0ECf23098F" },
  { name: "NIA",   address: "0xF2F773753cEbEFaF9b68b841d80C083b18C69311" },
];

// ERC-20 Transfer(address,address,uint256) event signature
const TRANSFER_SIG = keccak256(toHex("Transfer(address,address,uint256)"));

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("🐋 WhaleTracker — Creating Reactivity Subscriptions\n");
  console.log("Handler contract:", WHALE_TRACKER);
  console.log("Transfer sig:    ", TRANSFER_SIG);
  console.log(`Tokens to subscribe: ${TRACKED_TOKENS.length}\n`);

  const account = privateKeyToAccount(PRIVATE_KEY);
  const transport = http(RPC_URL);

  const publicClient = createPublicClient({ transport });
  const walletClient = createWalletClient({ account, transport });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  // Create one subscription per token
  for (const token of TRACKED_TOKENS) {
    try {
      console.log(`⏳ Subscribing to ${token.name} (${token.address})...`);

      await sdk.createSoliditySubscription({
        handlerContractAddress: WHALE_TRACKER,
        emitter: token.address,
        eventTopics: [TRANSFER_SIG],
        priorityFeePerGas: parseGwei("0"),
        maxFeePerGas: parseGwei("10"),
        gasLimit: 2_000_000n,
        isGuaranteed: true,
        isCoalesced: false,
      });

      console.log(`✅ ${token.name} — subscription active`);
    } catch (error) {
      console.error(`❌ ${token.name} — failed:`, error.message);
    }
  }

  console.log("\n🎉 All subscriptions created!");
  console.log("WhaleTracker is now live and listening for whale transfers.");
  console.log(
    `\nVerify on explorer: https://shannon.somnia.network/address/${WHALE_TRACKER}`
  );
}

main().catch(console.error);
