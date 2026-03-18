"use client";

import type { NetworkStats } from "@/lib/types";

interface Props {
  stats: NetworkStats | null;
  connected: boolean;
}

export default function Analytics({ stats, connected }: Props) {
  return (
    <div className="space-y-6">
      {/* Network banner */}
      <div className="network-banner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <span className="text-xl">⛓️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Somnia Network</h2>
              <p className="text-xs text-gray-400">Shannon Testnet • Chain ID 50312</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connected
                  ? "bg-emerald-400 shadow-lg shadow-emerald-500/50 animate-pulse"
                  : "bg-red-500"
              }`}
            />
            <span className={`text-sm font-medium ${connected ? "text-emerald-400" : "text-red-400"}`}>
              {connected ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Block Number */}
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Current Block</p>
            <p className="text-2xl font-bold text-white mt-1">
              {stats ? stats.blockNumber.toLocaleString() : "—"}
            </p>
          </div>
        </div>

        {/* Gas Price */}
        <div className="stat-card">
          <div className="stat-icon">⛽</div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Gas Price</p>
            <p className="text-2xl font-bold text-white mt-1">
              {stats ? `${parseFloat(stats.gasPrice).toFixed(2)} Gwei` : "—"}
            </p>
          </div>
        </div>

        {/* Chain ID */}
        <div className="stat-card">
          <div className="stat-icon">🔗</div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Chain ID</p>
            <p className="text-2xl font-bold text-white mt-1">50312</p>
          </div>
        </div>

        {/* Connection */}
        <div className="stat-card">
          <div className="stat-icon">📡</div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">WebSocket</p>
            <p className={`text-2xl font-bold mt-1 ${connected ? "text-emerald-400" : "text-red-400"}`}>
              {connected ? "Live" : "Down"}
            </p>
          </div>
        </div>
      </div>

      {/* Network info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Network Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Network Name</span>
            <span className="text-white font-medium">Somnia Testnet (Shannon)</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>RPC URL</span>
            <span className="text-purple-400 font-mono text-xs">dream-rpc.somnia.network</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Explorer</span>
            <a
              href="https://shannon-explorer.somnia.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              shannon-explorer.somnia.network ↗
            </a>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Native Token</span>
            <span className="text-white font-medium">STT</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Consensus</span>
            <span className="text-white font-medium">Sub-second Finality</span>
          </div>
        </div>
      </div>

      {/* Reactivity badge */}
      <div className="reactivity-badge">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-sm font-semibold text-white">Powered by Somnia Reactivity SDK</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time push updates via on-chain event subscriptions — no polling, instant data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
