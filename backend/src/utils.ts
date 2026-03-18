import { ethers } from "ethers";
import { TOKEN_MAP_LOWER, type TokenMeta } from "./config.js";

// ─── Address formatting ──────────────────────────────────────────────
export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Amount formatting with correct decimals ─────────────────────────
export function formatAmount(raw: bigint, decimals: number): string {
  const formatted = ethers.formatUnits(raw, decimals);
  const num = parseFloat(formatted);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}

// ─── Token lookup (case-insensitive) ─────────────────────────────────
export function getTokenMeta(address: string): TokenMeta | undefined {
  return TOKEN_MAP_LOWER[address.toLowerCase()];
}

// ─── Explorer URLs ───────────────────────────────────────────────────
const EXPLORER = "https://shannon-explorer.somnia.network";

export function addressUrl(addr: string): string {
  return `${EXPLORER}/address/${addr}`;
}

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

// ─── Emoji mapping by category ───────────────────────────────────────
export function categoryEmoji(category: string): string {
  switch (category) {
    case "stablecoin": return "💵";
    case "native": return "⚡";
    case "wrapped": return "🔷";
    case "ecosystem": return "🌐";
    default: return "🔘";
  }
}

// ─── Timestamp formatting ────────────────────────────────────────────
export function nowISO(): string {
  return new Date().toISOString();
}

export function relativeTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}
