import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, createWalletClient, webSocket, http, pad, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config as envConfig, TOKEN_MAP } from "./config.js";
import { getTrackedWallets, notifyTrackedUser } from "./telegramBot.js";

let sdk: SDK;

// ─── FIX 1+2: Use defineChain with BOTH http AND webSocket arrays ────
// Competitors (SOMI Sentinel, Defi-Pulse) proved the SDK internally
// reads rpcUrls.default.webSocket to establish its own connection.
const INFRA_WSS = "wss://api.infra.testnet.somnia.network/ws";

const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [envConfig.somniaRpcUrl],
      webSocket: [INFRA_WSS],
    },
    public: {
      http: [envConfig.somniaRpcUrl],
      webSocket: [INFRA_WSS],
    },
  },
});

/**
 * Powered strictly by Somnia Reactivity SDK!
 * Fixes applied from competitor analysis:
 *  1. Uses the undocumented infra WSS endpoint that accepts subscriptions
 *  2. defineChain() with webSocket array in rpcUrls
 *  3. Passes both public + wallet clients to SDK constructor
 */
export async function startReactivityTracker(): Promise<void> {
  console.log("🌊 Starting Off-Chain Reactivity SDK Wallet Tracker...");
  console.log(`   WSS: ${INFRA_WSS}`);
  console.log(`   RPC: ${envConfig.somniaRpcUrl}`);

  try {
    // FIX 1: Connect via the infra WSS endpoint
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(INFRA_WSS),
    });

    // FIX 3: Pass a wallet client (defi-stream-insight pattern)
    // The SDK may use this internally for certain subscription types
    const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;
    let sdkConfig: any = { public: publicClient };

    if (privateKey) {
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        chain: somniaTestnet,
        account,
        transport: http(envConfig.somniaRpcUrl),
      });
      sdkConfig = { public: publicClient, wallet: walletClient };
      console.log("   ✅ Wallet client attached to SDK");
    } else {
      console.log("   ⚠️ No PRIVATE_KEY found, SDK initialized without wallet client");
    }

    sdk = new SDK(sdkConfig);

    // FIX 2: Use eventContractSources to target specific contracts
    const majorTokens = Object.keys(TOKEN_MAP);
    console.log(`   📡 Subscribing to ${majorTokens.length} token contracts...`);

    const result = await sdk.subscribe({
      ethCalls: [],
      eventContractSources: majorTokens as `0x${string}`[],
      onData: async (payload: any) => {
        console.log("📥 SDK Event received!", JSON.stringify(payload).slice(0, 200));
        
        const result = payload?.result || payload;
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
        console.error("❌ Reactivity SDK Subscription Error:", err.message);
      }
    });

    // Log subscription result like SOMI Sentinel does
    if (result instanceof Error) {
      console.error("❌ SDK Subscription failed:", result.message);
    } else {
      console.log(`✅ Reactivity SDK Subscription Active!`);
      if ((result as any)?.subscriptionId) {
        console.log(`   Subscription ID: ${(result as any).subscriptionId}`);
      }
      console.log("🔴 LIVE: Listening for real-time events via Somnia Reactivity SDK...\n");
    }
  } catch (err) {
    console.error("❌ Failed to start Reactivity SDK tracker:", err);
    console.log("   Retrying in 5 seconds...");
    setTimeout(() => startReactivityTracker(), 5000);
  }
}
