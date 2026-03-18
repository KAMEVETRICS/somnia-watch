// ─── Dashboard constants ─────────────────────────────────────────────

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const EXPLORER_URL = "https://shannon-explorer.somnia.network";

export const TOKEN_COLORS: Record<string, string> = {
  sUSDT: "#26a17b",
  USDC: "#2775ca",
  STT: "#a855f7",
  WSTT: "#c084fc",
  WETH: "#627eea",
  PING: "#f59e0b",
  PONG: "#ef4444",
  NIA: "#06b6d4",
};

export const TOKEN_EMOJIS: Record<string, string> = {
  sUSDT: "💵",
  USDC: "💲",
  STT: "⚡",
  WSTT: "🔮",
  WETH: "🔷",
  PING: "🏓",
  PONG: "🎯",
  NIA: "🌐",
};

export const TIMEFRAMES = [
  { label: "60s", value: "60s", active: true },
  { label: "15m", value: "15m", active: true },
  { label: "30m", value: "30m", active: false },
  { label: "1h", value: "1h", active: false },
  { label: "4h", value: "4h", active: false },
  { label: "8h", value: "8h", active: false },
  { label: "12h", value: "12h", active: false },
  { label: "24h", value: "24h", active: false },
];

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
