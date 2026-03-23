import { createPublicClient, http, formatEther } from "viem";
import { config as envConfig } from "./config.js";
import { getTrackedWallets, notifyTrackedUser } from "./telegramBot.js";

let publicClient: any = null;

const nonceCache = new Map<string, number>();
const balanceCache = new Map<string, bigint>();

/**
 * Powered completely by Viem Native endpoints!
 * This surgically checks ONLY exactly what the users want to track via
 * nonce and balance polling. Because we don't scan 1M TPS blocks,
 * this saves massive amounts of Node.js event-loop memory.
 */
export function startReactivityTracker(): void {
  console.log("⚡ Starting Viem-Powered Native Wallet Tracker...");

  publicClient = createPublicClient({ 
    transport: http(envConfig.somniaRpcUrl) 
  });

  // Since RPC polling is cheap, we poll exactly the tracked wallets every 3s
  setInterval(async () => {
    try {
      const trackedWallets = getTrackedWallets();
      if (trackedWallets.size === 0) return;

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
            publicClient.getTransactionCount({ address: address as `0x${string}` }),
            publicClient.getBalance({ address: address as `0x${string}` }),
          ]);

          const prevNonce = nonceCache.get(address);
          const prevBalance = balanceCache.get(address);

          nonceCache.set(address, nonce);
          balanceCache.set(address, balance);

          if (prevNonce === undefined || prevBalance === undefined) continue;

          // Nonce increased = Address SENT a transaction
          if (nonce > prevNonce) {
            console.log(`⚡ Viem Tracker: Wallet ${address} sent tx (nonce ${prevNonce} → ${nonce})`);
            for (const chatId of chatIds) {
              await notifyTrackedUser(
                chatId,
                address,
                "sender",
                "check explorer for details",
                `Nonce increased: ${nonce}`
              );
            }
          }

          // Balance changed = Received/Transferred STT directly
          if (balance !== prevBalance) {
            const diff = balance - prevBalance;
            if (diff > 0n) {
              console.log(`⚡ Viem Tracker: Wallet ${address} received ${formatEther(diff)} STT`);
              for (const chatId of chatIds) {
                await notifyTrackedUser(
                  chatId,
                  address,
                  "receiver",
                  "check explorer for details",
                  `${formatEther(diff)} STT natively!`
                );
              }
            }
          }
        } catch (err) {
          // Ignored
        }
      }
    } catch (err) {
      console.error("Viem Tracker Error:", err);
    }
  }, 3000);
}
