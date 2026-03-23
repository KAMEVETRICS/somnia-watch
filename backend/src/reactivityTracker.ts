import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, http, pad } from "viem";
import { config as envConfig } from "./config.js";
import { getTrackedWallets, notifyTrackedUser } from "./telegramBot.js";

let sdk: SDK;

/**
 * Powered strictly by Somnia Reactivity SDK!
 * This is the official off-chain implementation for the Hackathon.
 * It uses the SDK's WebSocket subscription feature to listen for
 * events and transactions related to tracked wallets.
 */
export async function startReactivityTracker(): Promise<void> {
  console.log("🌊 Starting Off-Chain Reactivity SDK Wallet Tracker...");

  try {
    // The SDK requires an http() transport initialized publicly
    const publicClient = createPublicClient({ 
      transport: http(envConfig.somniaRpcUrl) 
    });

    sdk = new SDK({ public: publicClient });

    // Create a wildcard subscription to demonstrate Reactivity SDK Push model
    await sdk.subscribe({
      ethCalls: [],
      onData: async (payload: any) => {
        const result = payload?.result;
        if (!result || !result.topics) return;
        
        const topics: string[] = result.topics;
        const trackedWallets = getTrackedWallets();
        if (trackedWallets.size === 0) return;

        // Check if any event topic matches our tracked addresses
        for (const [chatId, addresses] of trackedWallets) {
          for (const addr of addresses) {
            // Event topics pad addresses to 32 bytes
            const paddedAddr = pad(addr as `0x${string}`).toLowerCase();
            
            for (const topic of topics) {
              if (topic && topic.toLowerCase() === paddedAddr) {
                console.log(`⚡ SDK caught event for tracked wallet: ${addr}`);
                await notifyTrackedUser(
                  chatId,
                  addr,
                  "receiver",
                  "Check explorer for latest contract interaction!",
                  "Reactivity SDK Push ⚡"
                );
              }
            }
          }
        }
      },
      onError: (err: Error) => {
        console.error("❌ Reactivity SDK Error:", err.message);
      }
    });

    console.log("✅ Reactivity SDK Tracker active! Listening via off-chain Websocket.");
  } catch (err) {
    console.error("❌ Failed to start Reactivity SDK tracker:", err);
  }
}
