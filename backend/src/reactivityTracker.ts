import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, createWalletClient, webSocket, http, pad, defineChain, formatUnits, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config as envConfig, TOKEN_MAP, TOKEN_MAP_LOWER } from "./config.js";
import { getTrackedWallets, notifyTrackedUser } from "./telegramBot.js";
import { broadcast } from "./wsServer.js";
import { shortenAddress, nowISO, getTokenMeta, formatAmount } from "./utils.js";
import { recordContractInteraction } from "./hotContracts.js";

let sdk: SDK;

// ─── FIX 1+2: Use defineChain with BOTH http AND webSocket arrays ────
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

// ─── ERC-20 Transfer event signature ──────────────────────────────────
// keccak256("Transfer(address,address,uint256)")
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// ─── Whale threshold in native token units (100 tokens) ───────────────
const WHALE_THRESHOLD_USD_EQUIV = 100n;

/**
 * Powered strictly by Somnia Reactivity SDK!
 * Fixes applied from competitor analysis:
 *  1. Uses the undocumented infra WSS endpoint
 *  2. defineChain() with webSocket array in rpcUrls
 *  3. Passes both public + wallet clients to SDK constructor
 */
export async function startReactivityTracker(): Promise<void> {
  console.log("🌊 Starting Off-Chain Reactivity SDK Wallet Tracker...");
  console.log(`   WSS: ${INFRA_WSS}`);
  console.log(`   RPC: ${envConfig.somniaRpcUrl}`);

  try {
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(INFRA_WSS),
    });

    // FIX 3: Pass a wallet client if PRIVATE_KEY is available
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

    const majorTokens = Object.keys(TOKEN_MAP);
    console.log(`   📡 Subscribing to ${majorTokens.length} token contracts...`);

    const result = await sdk.subscribe({
      ethCalls: [],
      eventContractSources: majorTokens as `0x${string}`[],
      onData: async (payload: any) => {
        const raw = payload?.result || payload;
        if (!raw || !raw.topics || raw.topics.length < 1) return;

        const topics: string[] = raw.topics;
        const topicHash = topics[0];
        const contractAddr = (raw.address || "").toLowerCase();

        // ─── Identify the token ───────────────────────────────────
        const tokenMeta = TOKEN_MAP_LOWER[contractAddr];
        
        // Record interaction for Hot Contracts dashboard feature
        if (contractAddr) {
          recordContractInteraction(contractAddr);
        }

        // ─── Decode ERC-20 Transfer events ────────────────────────
        if (topicHash === TRANSFER_TOPIC && topics.length >= 3) {
          const from = extractAddress(topics[1]);
          const to = extractAddress(topics[2]);
          const rawAmount = raw.data && raw.data !== "0x" ? BigInt(raw.data) : 0n;
          const decimals = tokenMeta?.decimals ?? 18;
          const symbol = tokenMeta?.symbol ?? "???";
          const formatted = formatUnits(rawAmount, decimals);
          const numericAmount = parseFloat(formatted);

          console.log(`📥 Transfer: ${formatted} ${symbol} | ${shortenAddress(from)} → ${shortenAddress(to)}`);

          // ─── Bridge to Dashboard Whale Feed ─────────────────────
          // Treat any transfer >= 100 units as a whale transfer for the dashboard
          if (rawAmount >= WHALE_THRESHOLD_USD_EQUIV * BigInt(10 ** decimals)) {
            console.log(`🐋 WHALE transfer detected: ${formatted} ${symbol}`);

            const whaleData = {
              token: contractAddr,
              tokenSymbol: symbol,
              tokenName: tokenMeta?.name ?? "Unknown",
              category: tokenMeta?.category ?? "ecosystem",
              from,
              to,
              amount: rawAmount.toString(),
              formattedAmount: formatted,
              aiTag: numericAmount >= 1000 ? "Mega Whale 🐋🐋" : "Whale Move 🐋",
              txHash: raw.transactionHash || "",
              blockNumber: raw.blockNumber ? Number(raw.blockNumber) : 0,
              timestamp: nowISO(),
            };

            // Push to frontend dashboard via WebSocket
            broadcast({
              type: "whale_alert",
              data: whaleData,
              timestamp: Date.now(),
            });
          }

          // ─── Notify tracked wallet owners via Telegram ──────────
          const trackedWallets = getTrackedWallets();
          for (const [chatId, addresses] of trackedWallets) {
            for (const addr of addresses) {
              const addrLower = addr.toLowerCase();
              
              if (from.toLowerCase() === addrLower) {
                // User's wallet SENT tokens
                await notifyTrackedUser(
                  chatId,
                  addr,
                  "sender",
                  raw.transactionHash || "Check explorer",
                  `${formatted} ${symbol}`
                );
              }
              
              if (to.toLowerCase() === addrLower) {
                // User's wallet RECEIVED tokens
                await notifyTrackedUser(
                  chatId,
                  addr,
                  "receiver",
                  raw.transactionHash || "Check explorer",
                  `${formatted} ${symbol}`
                );
              }
            }
          }
        } else {
          // Non-Transfer events — still check if any tracked wallet appears in topics
          const trackedWallets = getTrackedWallets();
          if (trackedWallets.size === 0) return;

          for (const [chatId, addresses] of trackedWallets) {
            for (const addr of addresses) {
              const paddedAddr = pad(addr as `0x${string}`).toLowerCase();
              for (const topic of topics) {
                if (topic && topic.toLowerCase() === paddedAddr) {
                  const symbol = tokenMeta?.symbol ?? "contract";
                  await notifyTrackedUser(
                    chatId,
                    addr,
                    "receiver",
                    raw.transactionHash || "Check explorer",
                    `${symbol} interaction`
                  );
                }
              }
            }
          }
        }
      },
      onError: (err: Error) => {
        console.error("❌ Reactivity SDK Subscription Error:", err.message);
      }
    });

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

/** Extract a 20-byte address from a 32-byte padded topic */
function extractAddress(topic: string): string {
  if (!topic || topic.length < 42) return "0x" + "0".repeat(40);
  // topic is 0x + 64 hex chars, address is last 40 chars
  return getAddress("0x" + topic.slice(-40));
}
