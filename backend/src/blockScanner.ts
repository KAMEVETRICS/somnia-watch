import { ethers } from "ethers";
import { config } from "./config.js";
import { getTrackedWallets, notifyTrackedUser } from "./telegramBot.js";
import { recordContractInteraction } from "./hotContracts.js";
import { broadcast } from "./wsServer.js";
import { updateNetworkStats } from "./restApi.js";

// ─── Block Scanner ───────────────────────────────────────────────────
// Somnia produces blocks at sub-second speed (~100+ blocks/sec).
// We CAN'T scan every block. Instead we:
// 1. Poll network stats (block number, gas) every 2s
// 2. Sample recent blocks for the firehose + hot contracts
// 3. Use a separate address watcher for tracked wallets (nonce-based)

let httpProvider: ethers.JsonRpcProvider;

// ─── Tracked wallet nonce cache (for detecting new outgoing txs) ─────
const nonceCache = new Map<string, number>();
const balanceCache = new Map<string, bigint>();

export function startBlockScanner(): void {
  httpProvider = new ethers.JsonRpcProvider(config.somniaRpcUrl);
  console.log("🔍 Block scanner started — listening for new blocks...");

  let lastSampledBlock = 0;
  let initialized = false;

  // ─── Main loop: network stats + block sampling ─────────────────
  setInterval(async () => {
    try {
      const [currentBlock, feeData] = await Promise.all([
        httpProvider.getBlockNumber(),
        httpProvider.getFeeData(),
      ]);

      // Push network stats
      const gas = ethers.formatUnits(feeData.gasPrice || 0n, "gwei");
      updateNetworkStats(currentBlock, gas);

      if (!initialized) {
        lastSampledBlock = currentBlock;
        initialized = true;
        console.log(`🔍 Block scanner initialized at block #${currentBlock}`);
        return;
      }

      // Sample the latest block for firehose + hot contracts
      if (currentBlock > lastSampledBlock) {
        await sampleBlock(currentBlock);
        lastSampledBlock = currentBlock;
      }
    } catch (err) {
      console.error("🔍 Block scanner error:", (err as Error).message);
    }
  }, 2000);

  // ─── Address watcher is now handled natively by ReactivityTracker ───
}

// ─── Sample a single block for firehose + hot contracts ──────────────
async function sampleBlock(blockNumber: number): Promise<void> {
  try {
    const block = await httpProvider.getBlock(blockNumber, true);
    if (!block || !block.prefetchedTransactions) return;

    const transfers: Array<{ from: string; to: string; value: string; hash: string }> = [];

    for (const tx of block.prefetchedTransactions) {
      const to = tx.to?.toLowerCase() || "";

      // Record contract interactions for hot contracts
      if (to) {
        recordContractInteraction(to);
      }

      // Collect transfers for the firehose
      if (tx.value > 0n) {
        transfers.push({
          from: tx.from,
          to: tx.to || "Contract Creation",
          value: ethers.formatEther(tx.value),
          hash: tx.hash,
        });
      }
    }

    if (transfers.length > 0) {
      broadcast({
        type: "new_transfer",
        data: {
          blockNumber,
          txCount: transfers.length,
          transfers: transfers.slice(0, 10),
        },
        timestamp: Date.now(),
      });
    }
  } catch {
    // Skip blocks that fail to fetch
  }
}

// ─── Tracked wallet checker (nonce + balance based) ──────────────────
// Instead of scanning every block for tracked addresses (impossible on
// Somnia's fast chain), we poll each tracked address's nonce and balance.
// A nonce increase = they sent a tx. A balance change = they received.
async function checkTrackedWallets(): Promise<void> {
  const trackedWallets = getTrackedWallets();
  if (trackedWallets.size === 0) return;

  // Collect all unique addresses across all chat IDs
  const addressToChatIds = new Map<string, number[]>();
  for (const [chatId, addresses] of trackedWallets) {
    for (const addr of addresses) {
      const existing = addressToChatIds.get(addr) || [];
      existing.push(chatId);
      addressToChatIds.set(addr, existing);
    }
  }

  for (const [address, chatIds] of addressToChatIds) {
    try {
      const [nonce, balance] = await Promise.all([
        httpProvider.getTransactionCount(address),
        httpProvider.getBalance(address),
      ]);

      const prevNonce = nonceCache.get(address);
      const prevBalance = balanceCache.get(address);

      // Update cache
      nonceCache.set(address, nonce);
      balanceCache.set(address, balance);

      // Skip first check (just caching initial values)
      if (prevNonce === undefined) continue;

      // Nonce increased = address sent a transaction
      if (nonce > prevNonce) {
        console.log(`📱 Tracked wallet ${address} sent a tx (nonce ${prevNonce} → ${nonce})`);
        for (const chatId of chatIds) {
          await notifyTrackedUser(
            chatId,
            address,
            "sender",
            "check explorer for details",
            `nonce changed: ${prevNonce} → ${nonce}`,
          );
        }
      }

      // Balance changed = address received or sent value
      if (prevBalance !== undefined && balance !== prevBalance) {
        const diff = balance - prevBalance;
        if (diff > 0n) {
          console.log(`📱 Tracked wallet ${address} received ${ethers.formatEther(diff)} STT`);
          for (const chatId of chatIds) {
            await notifyTrackedUser(
              chatId,
              address,
              "receiver",
              "check explorer for details",
              `${ethers.formatEther(diff)} STT`,
            );
          }
        }
      }
    } catch (err) {
      // Skip individual address errors
    }
  }
}
