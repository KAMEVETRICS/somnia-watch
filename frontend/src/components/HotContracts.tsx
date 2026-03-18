"use client";

import { useState, useEffect, useCallback } from "react";
import type { HotContract, HotContractsResponse } from "@/lib/types";
import { TIMEFRAMES, API_URL, shortenAddress, EXPLORER_URL } from "@/lib/constants";

export default function HotContracts() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("60s");
  const [contracts, setContracts] = useState<HotContract[]>([]);
  const [comingSoon, setComingSoon] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const tf = TIMEFRAMES.find((t) => t.value === selectedTimeframe);
    if (!tf?.active) {
      setComingSoon(true);
      setContracts([]);
      return;
    }

    setComingSoon(false);
    try {
      const res = await fetch(`${API_URL}/api/hot-contracts?window=${selectedTimeframe}`);
      const data: HotContractsResponse = await res.json();
      setContracts(data.data || []);
    } catch {
      // Silently handle fetch errors
    }
  }, [selectedTimeframe]);

  // Poll every 5 seconds for active timeframes
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const maxCount = Math.max(...contracts.map((c) => c.count), 1);

  return (
    <div className="card h-full flex flex-col">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        🔥 Hot Contracts
      </h2>

      {/* Timeframe dropdown */}
      <div className="flex flex-wrap gap-1 mb-4">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setSelectedTimeframe(tf.value)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              selectedTimeframe === tf.value
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                : tf.active
                ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                : "bg-gray-900 text-gray-700 cursor-not-allowed"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="flex-1 space-y-2">
        {comingSoon ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <div className="text-3xl mb-2">🚧</div>
              <p className="text-sm">Coming Soon</p>
              <p className="text-xs text-gray-700 mt-1">
                Only 60s and 15m are currently live
              </p>
            </div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm">Collecting data...</p>
              <p className="text-xs text-gray-700 mt-1">
                Top 5 contracts by interaction count
              </p>
            </div>
          </div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.address} className="leaderboard-item">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-400 w-5">
                    #{contract.rank}
                  </span>
                  <a
                    href={`${EXPLORER_URL}/address/${contract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-gray-300 hover:text-purple-400 transition-colors"
                  >
                    {shortenAddress(contract.address)}
                  </a>
                </div>
                <span className="text-sm font-bold text-emerald-400">
                  {contract.count} txs
                </span>
              </div>
              {/* Animated progress bar */}
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-1000 ease-out"
                  style={{
                    width: `${(contract.count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
