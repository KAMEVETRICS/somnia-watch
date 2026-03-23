import { createPublicClient, http, formatUnits } from "viem";
import { somniaTestnet } from "viem/chains";
import { config as envConfig } from "./config.js";
import { updateNetworkStats } from "./restApi.js";

// ─── Network Stats Poller (Viem) ────────────────────────────────────
// Extremely lightweight stats poller for the Dashboard header.
// Completely skips fetching heavy blocks or 1M TPS transactions.

let publicClient: any = null;

export function startNetworkStatsPoller(): void {
  console.log("📊 Starting Viem Network Stats Poller...");

  publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(envConfig.somniaRpcUrl)
  });

  // Poll exactly every 3 seconds to keep UI alive without overloading RPC
  setInterval(async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const gasPrice = await publicClient.getGasPrice();

      const gasDecimals = formatUnits(gasPrice, 9);
      updateNetworkStats(Number(currentBlock), gasDecimals);
      
    } catch (err) {
      console.error("📊 Stats polling error:", (err as Error).message);
    }
  }, 3000);
}
