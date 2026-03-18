"use client";

import type { WhaleAlert } from "@/lib/types";
import { TOKEN_COLORS, TOKEN_EMOJIS, shortenAddress, EXPLORER_URL } from "@/lib/constants";

interface Props {
  alerts: WhaleAlert[];
}

export default function WhaleFeed({ alerts }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">🐋 Whale Watcher</h2>
        <p className="text-sm text-gray-500">AI-tagged whale transfers powered by Somnia Reactivity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Whale feed — takes 2 columns */}
        <div className="lg:col-span-2 card" style={{ maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <span className="pulse-dot" />
              Live Feed
            </h3>
            <span className="text-xs text-gray-600">{alerts.length} alerts</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
            {alerts.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-600">
                <div className="text-center">
                  <div className="text-5xl mb-3">🐋</div>
                  <p className="text-sm">Monitoring for whale movements...</p>
                  <p className="text-xs text-gray-700 mt-1">AI-tagged in real-time</p>
                </div>
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div
                  key={`${alert.txHash}-${i}`}
                  className="whale-card"
                  style={{
                    borderLeftColor: TOKEN_COLORS[alert.tokenSymbol] || "#a855f7",
                  }}
                >
                  {/* AI Tag */}
                  <div className="ai-tag-glow mb-2">[{alert.aiTag}]</div>

                  {/* Token + Amount */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      {TOKEN_EMOJIS[alert.tokenSymbol] || "🔘"} {alert.tokenSymbol}
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{ color: TOKEN_COLORS[alert.tokenSymbol] || "#a855f7" }}
                    >
                      {alert.formattedAmount}
                    </span>
                  </div>

                  {/* From → To */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <a href={`${EXPLORER_URL}/address/${alert.from}`} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 font-mono">
                      {shortenAddress(alert.from)}
                    </a>
                    <span className="text-gray-700">→</span>
                    <a href={`${EXPLORER_URL}/address/${alert.to}`} target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 font-mono">
                      {shortenAddress(alert.to)}
                    </a>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-2">
                    {alert.txHash && (
                      <a href={`${EXPLORER_URL}/tx/${alert.txHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:text-purple-400">
                        View Tx ↗
                      </a>
                    )}
                    <span className="text-[10px] text-gray-700">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Telegram integration sidebar */}
        <div className="space-y-4">
          {/* Telegram CTA */}
          <div className="telegram-card">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="text-base font-bold text-white mb-2">Get Whale Alerts on Telegram</h3>
            <p className="text-sm text-gray-400 mb-4">
              Get instant notifications when whales make a move. Track specific wallets and receive DMs.
            </p>
            <a
              href="https://t.me/Somniareact_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="telegram-button"
            >
              🤖 Add Bot on Telegram
            </a>
          </div>

          {/* Bot instructions */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">How to Use the Bot</h3>
            <div className="space-y-3 text-sm">
              <div className="instruction-step">
                <span className="step-number">1</span>
                <div>
                  <p className="text-gray-300 font-medium">Start the Bot</p>
                  <p className="text-xs text-gray-500">
                    Open <a href="https://t.me/Somniareact_bot" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">@Somniareact_bot</a> and send <code>/start</code>
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <span className="step-number">2</span>
                <div>
                  <p className="text-gray-300 font-medium">Track a Wallet</p>
                  <p className="text-xs text-gray-500">
                    Send <code>/track 0xAddress</code> to watch any wallet. You&apos;ll get DMs when it&apos;s active.
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <span className="step-number">3</span>
                <div>
                  <p className="text-gray-300 font-medium">View Tracked</p>
                  <p className="text-xs text-gray-500">
                    Send <code>/list</code> to see all wallets you&apos;re watching.
                  </p>
                </div>
              </div>

              <div className="instruction-step">
                <span className="step-number">4</span>
                <div>
                  <p className="text-gray-300 font-medium">Stop Tracking</p>
                  <p className="text-xs text-gray-500">
                    Send <code>/untrack 0xAddress</code> to remove a wallet from your list.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Reactivity badge */}
          <div className="reactivity-badge-sm">
            <p className="text-xs text-gray-400">
              ⚡ Whale detection powered by <span className="text-purple-400 font-semibold">Somnia Reactivity SDK</span> — validators push events directly to the contract.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
