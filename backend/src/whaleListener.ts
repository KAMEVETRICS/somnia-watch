import { ethers } from "ethers";
import { config, WHALE_TRACKER_ABI } from "./config.js";
import { generateWhaleTag } from "./aiTagger.js";
import { broadcastWhaleAlert } from "./telegramBot.js";
import { broadcast } from "./wsServer.js";
import { formatAmount, getTokenMeta, shortenAddress, nowISO } from "./utils.js";

// ─── WhaleAlert Event Listener ───────────────────────────────────────
// Connects via WebSocket to Somnia Testnet and listens for WhaleAlert
// events emitted by the deployed WhaleTracker contract.

let wsProvider: ethers.WebSocketProvider | null = null;

export function startWhaleListener(): void {
  connect();
}

function connect(): void {
  console.log("🐋 Connecting to Somnia WebSocket for WhaleAlert events...");

  wsProvider = new ethers.WebSocketProvider(config.somniaWssUrl);
  const contract = new ethers.Contract(config.whaleTrackerAddress, WHALE_TRACKER_ABI, wsProvider);

  // Listen for WhaleAlert events
  contract.on("WhaleAlert", async (token: string, from: string, to: string, amount: bigint, event: ethers.EventLog) => {
    console.log(`\n🐋 WhaleAlert detected!`);

    // Get token metadata
    const meta = getTokenMeta(token);
    if (!meta) {
      console.warn(`  Unknown token: ${token}`);
      return;
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
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: nowISO(),
    };

    // 1. Broadcast to Telegram channel
    await broadcastWhaleAlert(meta, from, to, formatted, aiTag, event.transactionHash);

    // 2. Push to frontend via WebSocket
    broadcast({
      type: "whale_alert",
      data: whaleData,
      timestamp: Date.now(),
    });

    console.log(`  ✅ Broadcasted to Telegram + Frontend`);
  });

  // Handle provider errors and reconnection
  wsProvider.on("error", (err) => {
    console.error("❌ WebSocket error:", (err as Error).message);
    console.warn("⚠️  Reconnecting in 5s...");
    setTimeout(connect, 5000);
  });

  // Confirm connection once provider resolves its network
  wsProvider.getNetwork().then((network) => {
    console.log(`✅ Connected to Somnia WebSocket (chainId: ${network.chainId})`);
    console.log(`   Listening for WhaleAlert on ${shortenAddress(config.whaleTrackerAddress)}`);
  }).catch(() => {
    console.warn("⚠️  WebSocket connection failed — retrying in 5s...");
    setTimeout(connect, 5000);
  });
}
