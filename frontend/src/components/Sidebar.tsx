"use client";

import type { Section } from "@/lib/types";

interface Props {
  activeSection: Section;
  onNavigate: (section: Section) => void;
  connected: boolean;
}

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "firehose", label: "Hot Contracts", icon: "🔥" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "whales", label: "Whales", icon: "🐋" },
];

export default function Sidebar({ activeSection, onNavigate, connected }: Props) {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="px-4 pt-6 pb-8">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🐋</span>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              WhaleTracker
            </h1>
            <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em]">
              Somnia Reactivity
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`sidebar-item ${activeSection === item.id ? "active" : ""}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Status footer */}
      <div className="px-4 pb-6 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div
            className={`w-2 h-2 rounded-full ${connected
                ? "bg-emerald-400 shadow-lg shadow-emerald-500/50"
                : "bg-red-500"
              }`}
          />
          {connected ? "Connected" : "Reconnecting..."}
        </div>
        <div className="text-[10px] text-gray-700">
          Somnia Testnet (Shannon)
        </div>
      </div>
    </aside>
  );
}
