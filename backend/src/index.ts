// ─────────────────────────────────────────────────────────────────────
//  WhaleTracker Backend — Entry Point
//  Somnia Reactivity Mini Hackathon
// ─────────────────────────────────────────────────────────────────────

import { startWsServer } from "./wsServer.js";
import { startTelegramBot } from "./telegramBot.js";
import { startWhaleListener } from "./whaleListener.js";
import { startBlockScanner } from "./blockScanner.js";
import { startRestApi } from "./restApi.js";
import { startCleanupInterval } from "./hotContracts.js";
import { config } from "./config.js";

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║     🐋  WhaleTracker Backend — Somnia       ║");
  console.log("║     Reactivity Mini Hackathon               ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  console.log(`Contract: ${config.whaleTrackerAddress}`);
  console.log(`WSS:      ${config.somniaWssUrl}`);
  console.log(`RPC:      ${config.somniaRpcUrl}\n`);

  // 1. Start WebSocket server (for frontend dashboard)
  startWsServer();

  // 2. Start REST API (for leaderboard data)
  startRestApi();

  // 3. Start Telegram bot (commands + notifications)
  startTelegramBot();

  // 4. Start WhaleAlert event listener (Somnia Reactivity push events)
  startWhaleListener();

  // 5. Start block scanner (wallet tracking + hot contracts + firehose)
  startBlockScanner();

  // 6. Start periodic cleanup of stale hot contracts data
  startCleanupInterval();

  console.log("\n🚀 All systems operational!\n");
}

main().catch((err) => {
  console.error("💀 Fatal error:", err);
  process.exit(1);
});
