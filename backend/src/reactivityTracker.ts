import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, http } from "viem";
import { ethers } from "ethers";
import { config as envConfig } from "./config.js";
import { getTrackedWallets, notifyTrackedUser } from "./telegramBot.js";

let sdk: SDK;

/**
 * Powered by Somnia Reactivity SDK!
 * This replaces the standard Web2 "polling" approach for checking wallet balances.
 * Instead, this creates an off-chain WebSocket subscription that pushes ALL
 * smart contract events from the entire Somnia Testnet directly to us.
 * We parse the topics of every event to see if our tracked wallets are involved.
 */
export async function startReactivityTracker(): Promise<void> {
  console.log("🌊 Starting Off-Chain Reactivity Wallet Tracker...");

  try {
    const publicClient = createPublicClient({ 
      transport: http(envConfig.somniaRpcUrl) 
    });

    sdk = new SDK({ public: publicClient });

    // Create a wildcard subscription to perfectly demonstrate Reactivity Push model
    await sdk.subscribe({
      ethCalls: [],
      onData: async (payload: any) => {
        const result = payload?.result;
        if (!result || !result.topics) return;
        
        const topics: string[] = result.topics;
        const trackedWallets = getTrackedWallets();
        if (trackedWallets.size === 0) return;

        // Check if any topic matches our tracked addresses
        // Event topics pad addresses to 32 bytes (64 hex characters)
        for (const [chatId, addresses] of trackedWallets) {
          for (const addr of addresses) {
            // Pad address to 32 bytes (0x + 64 chars = 66 chars)
            const paddedAddr = ethers.zeroPadValue(addr, 32).toLowerCase();
            
            for (const topic of topics) {
              if (topic && topic.toLowerCase() === paddedAddr) {
                // Address was found in an event topic! (Usually sender or receiver)
                console.log(`⚡ Reactivity caught event for tracked wallet: ${addr}`);
                await notifyTrackedUser(
                  chatId,
                  addr,
                  "receiver", // Generically logging as interaction
                  "Check explorer for latest contract interaction!",
                  "Reactivity Event Push ⚡"
                );
              }
            }
          }
        }
      },
      onError: (err: Error) => {
        console.error("❌ Reactivity Subscription Error:", err.message);
      }
    });

    console.log("✅ Reactivity Wallet Tracker active! Listening to all events.");
  } catch (err) {
    console.error("❌ Failed to start Reactivity tracker:", err);
  }
}
