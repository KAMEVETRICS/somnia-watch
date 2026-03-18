"use client";

import { useState } from "react";
import type { AddressInfo } from "@/lib/types";
import { API_URL, EXPLORER_URL } from "@/lib/constants";

export default function SearchAddress() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AddressInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    const addr = query.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setError("Please enter a valid Ethereum address (0x...)");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/address/${addr}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data: AddressInfo = await res.json();
      setResult(data);
    } catch {
      setError("Failed to fetch address data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Search Address</h2>
        <p className="text-sm text-gray-500">Look up any address on Somnia Testnet</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="0x... Enter wallet or contract address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="search-input"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="search-button"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Address Details</h3>
            <a
              href={result.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              View on Explorer ↗
            </a>
          </div>

          {/* Address */}
          <div className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-sm font-mono text-gray-300 break-all">{result.address}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Balance</p>
              <p className="text-xl font-bold text-emerald-400">
                {parseFloat(result.balance).toFixed(4)}
              </p>
              <p className="text-xs text-gray-600">STT</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-xl font-bold text-purple-400">
                {result.transactionCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600">Total nonce</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && (
        <div className="card flex items-center justify-center h-64 text-gray-600">
          <div className="text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm">Enter an address to see balance and activity</p>
            <p className="text-xs text-gray-700 mt-1">Supports wallets and contracts</p>
          </div>
        </div>
      )}
    </div>
  );
}
