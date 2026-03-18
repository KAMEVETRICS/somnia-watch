import express from "express";
import { ethers } from "ethers";
import { config } from "./config.js";
import { getLeaderboard60s, getLeaderboard15m } from "./hotContracts.js";
import { broadcast } from "./wsServer.js";

// ─── Cached network stats (updated by block scanner) ─────────────────
let latestBlock = 0;
let gasPrice = "0";
let lastStatsUpdate = 0;

export function updateNetworkStats(block: number, gas: string): void {
  latestBlock = block;
  gasPrice = gas;
  lastStatsUpdate = Date.now();

  // Push to frontend via WebSocket
  broadcast({
    type: "network_stats",
    data: { blockNumber: latestBlock, gasPrice, chainId: 50312, networkName: "Somnia Testnet (Shannon)" },
    timestamp: Date.now(),
  });
}

// ─── REST API for the frontend dashboard ─────────────────────────────
export function startRestApi(): void {
  const app = express();
  const provider = new ethers.JsonRpcProvider(config.somniaRpcUrl);

  // CORS middleware for frontend
  app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // ─── Health check ────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // ─── Network stats ──────────────────────────────────────────────
  app.get("/api/network", async (_req, res) => {
    try {
      const [blockNumber, feeData] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
      ]);
      res.json({
        blockNumber,
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0n, "gwei"),
        chainId: 50312,
        networkName: "Somnia Testnet (Shannon)",
        rpcUrl: "https://dream-rpc.somnia.network",
        explorer: "https://shannon-explorer.somnia.network",
      });
    } catch {
      res.json({ blockNumber: latestBlock, gasPrice, chainId: 50312, networkName: "Somnia Testnet (Shannon)" });
    }
  });

  // ─── Address lookup ─────────────────────────────────────────────
  app.get("/api/address/:address", async (req, res) => {
    const { address } = req.params;
    if (!ethers.isAddress(address)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }

    try {
      const [balance, txCount] = await Promise.all([
        provider.getBalance(address),
        provider.getTransactionCount(address),
      ]);

      res.json({
        address,
        balance: ethers.formatEther(balance),
        balanceRaw: balance.toString(),
        transactionCount: txCount,
        explorer: `https://shannon-explorer.somnia.network/address/${address}`,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch address data" });
    }
  });

  // ─── Hot contracts leaderboard ───────────────────────────────────
  app.get("/api/hot-contracts", (req, res) => {
    const window = req.query.window as string || "60s";

    switch (window) {
      case "60s":
        res.json({ window: "60s", data: getLeaderboard60s() });
        break;
      case "15m":
        res.json({ window: "15m", data: getLeaderboard15m() });
        break;
      default:
        res.json({ window, data: [], message: "Coming soon — only 60s and 15m are available" });
    }
  });

  app.listen(config.restPort, () => {
    console.log(`🌐 REST API running on http://localhost:${config.restPort}`);
  });
}
