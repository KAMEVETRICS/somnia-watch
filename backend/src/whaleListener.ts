import { createPublicClient, webSocket } from "viem";
import { config, WHALE_TRACKER_ABI } from "./config.js";
import { generateWhaleTag } from "./aiTagger.js";
import { broadcastWhaleAlert } from "./telegramBot.js";
import { broadcast } from "./wsServer.js";
import { formatAmount, getTokenMeta, shortenAddress, nowISO } from "./utils.js";
import { recordContractInteraction } from "./hotContracts.js";

// ─── WhaleAlert Event Listener (Viem Native Push) ────────────────────
// Connects via WebSocket to Somnia Testnet and natively watches for
// WhaleAlert events using pure push infrastructure (no polling).

let publicClient: any = null;

export function startWhaleListener(): void {
  connect();
}

function connect(): void {
  console.log("🐋 Connecting to Somnia WebSocket for WhaleAlert events using Viem...");

  publicClient = createPublicClient({
    transport: webSocket(config.somniaWssUrl, {
      keepAlive: true,
      reconnect: true
    })
  });

  // Verify connection by getting chain ID
  publicClient.getChainId().then((chainId: number) => {
    console.log(`✅ Connected to Somnia WSS (chainId: ${chainId})`);
    console.log(`   Listening natively for WhaleAlert on ${shortenAddress(config.whaleTrackerAddress)}`);
    
    // Setup Native Push Subscription
    publicClient.watchContractEvent({
      address: config.whaleTrackerAddress as `0x${string}`,
      abi: WHALE_TRACKER_ABI,
      eventName: "WhaleAlert",
      onLogs: async (logs: any) => {
        for (const log of logs) {
          try {
            const { args, transactionHash, blockNumber } = log;
            const token = args.token;
            const from = args.from;
            const to = args.to;
            const amount = args.amount;

            console.log(`\n🐋 WhaleAlert detected!`);

            // Record this interaction for the Hot Contracts feature!
            recordContractInteraction(token);
            recordContractInteraction(config.whaleTrackerAddress);

            // Get token metadata
            const meta = getTokenMeta(token);
            if (!meta) {
              console.warn(`  Unknown token: ${token}`);
              continue;
            }

            // Format the amount
            const formatted = formatAmount(amount, meta.decimals);
            console.log(`  ${formatted} ${meta.symbol} | ${shortenAddress(from)} → ${shortenAddress(to)}`);

            // Generate AI behavioral tag
            const aiTag = await generateWhaleTag(meta.symbol, from, to, formatted);
            console.log(`  AI Tag: [${aiTag}]`);

            // Build the whale alert data object
            const whaleData = {
              token: token,
              tokenSymbol: meta.symbol,
              tokenName: meta.name,
              category: meta.category,
              from,
              to,
              amount: amount.toString(),
              formattedAmount: formatted,
              aiTag,
              txHash: transactionHash,
              blockNumber: Number(blockNumber),
              timestamp: nowISO(),
            };

            // 1. Broadcast to Telegram channel
            await broadcastWhaleAlert(meta, from, to, formatted, aiTag, transactionHash);

            // 2. Push to frontend via WebSocket
            broadcast({
              type: "whale_alert",
              data: whaleData,
              timestamp: Date.now(),
            });

            console.log(`  ✅ Broadcasted to Telegram + Frontend`);
          } catch (err) {
            console.error("❌ Error parsing WhaleAlert log:", err);
          }
        }
      },
      onError: (error: Error) => {
        console.error("❌ Viem watchContractEvent error:", error.message);
      }
    });

  }).catch((err: Error) => {
    console.warn("⚠️ WebSocket connection failed:", err.message);
    console.warn("   Retrying in 5s...");
    setTimeout(connect, 5000);
  });
}
