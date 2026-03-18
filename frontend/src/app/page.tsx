"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Analytics from "@/components/Analytics";
import ReactivityFirehose from "@/components/ReactivityFirehose";
import HotContracts from "@/components/HotContracts";
import SearchAddress from "@/components/SearchAddress";
import WhaleFeed from "@/components/WhaleFeed";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Section } from "@/lib/types";

export default function Dashboard() {
  const { whaleAlerts, transfers, networkStats, connected } = useWebSocket();
  const [activeSection, setActiveSection] = useState<Section>("analytics");

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        connected={connected}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          {/* Section header with stats */}
          <div className="flex items-center justify-between mb-6">
            <div />
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {networkStats && (
                <span className="flex items-center gap-1.5">
                  📦 <span className="text-gray-300 font-medium">#{networkStats.blockNumber.toLocaleString()}</span>
                </span>
              )}
              <span>🐋 {whaleAlerts.length} alerts</span>
              <span>⚡ {transfers.reduce((s, b) => s + b.txCount, 0)} txs</span>
            </div>
          </div>

          {/* Active section content */}
          {activeSection === "analytics" && (
            <Analytics stats={networkStats} connected={connected} />
          )}

          {activeSection === "firehose" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: "calc(100vh - 140px)" }}>
              <ReactivityFirehose transfers={transfers} />
              <HotContracts />
            </div>
          )}

          {activeSection === "search" && (
            <SearchAddress />
          )}

          {activeSection === "whales" && (
            <WhaleFeed alerts={whaleAlerts} />
          )}
        </div>
      </main>
    </div>
  );
}
