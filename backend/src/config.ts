import "dotenv/config";

// ─── Validated environment configuration ──────────────────────────────
function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  // Somnia RPC
  somniaWssUrl: env("SOMNIA_WSS_URL", "wss://dream-rpc.somnia.network/ws"),
  somniaRpcUrl: env("SOMNIA_RPC_URL", "https://dream-rpc.somnia.network"),

  // WhaleTracker contract
  whaleTrackerAddress: env("WHALE_TRACKER_ADDRESS"),

  // Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || "",

  // OpenRouter (OpenAI-compatible)
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",

  // Server ports
  wsPort: parseInt(env("WS_PORT", "8080")),
  restPort: parseInt(env("REST_PORT", "3001")),
} as const;

// ─── WhaleTracker ABI (only the event we need) ───────────────────────
export const WHALE_TRACKER_ABI = [
  "event WhaleAlert(address indexed token, address indexed from, address indexed to, uint256 amount)",
] as const;

// ─── Token metadata ──────────────────────────────────────────────────
export interface TokenMeta {
  symbol: string;
  name: string;
  decimals: number;
  category: "stablecoin" | "native" | "wrapped" | "ecosystem";
}

export const TOKEN_MAP: Record<string, TokenMeta> = {
  "0x65296738D4E5edB1515e40287B6FDf8320E6eE04": { symbol: "sUSDT", name: "Somnia USDT", decimals: 6, category: "stablecoin" },
  "0x0ED782B8079529f7385c3eDA9fAf1EaA0DbC6a17": { symbol: "USDC", name: "USD Coin", decimals: 6, category: "stablecoin" },
  "0x7f89af8b3c0A68F536Ff20433927F4573CF001A3": { symbol: "STT", name: "Somnia Test Token", decimals: 18, category: "native" },
  "0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7": { symbol: "WSTT", name: "Wrapped STT", decimals: 18, category: "wrapped" },
  "0xdd8f41bf80d0E47132423339ca06bC6413da96b5": { symbol: "WETH", name: "Wrapped Ether", decimals: 18, category: "wrapped" },
  "0x33E7fAB0a8a5da1A923180989bD617c9c2D1C493": { symbol: "PING", name: "Ping Token", decimals: 18, category: "ecosystem" },
  "0x9beaA0016c22B646Ac311Ab171270B0ECf23098F": { symbol: "PONG", name: "Pong Token", decimals: 18, category: "ecosystem" },
  "0xF2F773753cEbEFaF9b68b841d80C083b18C69311": { symbol: "NIA", name: "SomniaExchange", decimals: 18, category: "ecosystem" },
};

// Lowercase lookup version for case-insensitive matching
export const TOKEN_MAP_LOWER: Record<string, TokenMeta> = Object.fromEntries(
  Object.entries(TOKEN_MAP).map(([k, v]) => [k.toLowerCase(), v])
);
