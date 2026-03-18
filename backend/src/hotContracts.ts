// ─── Hot Contracts Leaderboard ────────────────────────────────────────
// Tracks the top 5 most interacted-with contract addresses over
// rolling time windows (60 seconds and 15 minutes).

interface Interaction {
  timestamp: number;
  address: string;
}

// Circular buffer of recent interactions
const interactions: Interaction[] = [];
const MAX_INTERACTIONS = 50_000; // Cap memory usage

// ─── Record a contract interaction ───────────────────────────────────
export function recordContractInteraction(address: string): void {
  const now = Date.now();
  interactions.push({ timestamp: now, address: address.toLowerCase() });

  // Trim oldest entries if buffer is full
  if (interactions.length > MAX_INTERACTIONS) {
    interactions.splice(0, interactions.length - MAX_INTERACTIONS);
  }
}

// ─── Get top 5 contracts for a given time window ─────────────────────
export interface LeaderboardEntry {
  address: string;
  count: number;
  rank: number;
}

export function getLeaderboard(windowMs: number): LeaderboardEntry[] {
  const cutoff = Date.now() - windowMs;

  // Count interactions per address within the window
  const counts = new Map<string, number>();
  for (let i = interactions.length - 1; i >= 0; i--) {
    const entry = interactions[i]!;
    if (entry.timestamp < cutoff) break; // Data is chronological
    counts.set(entry.address, (counts.get(entry.address) || 0) + 1);
  }

  // Sort by count descending and take top 5
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([address, count], i) => ({ address, count, rank: i + 1 }));
}

// ─── Named window helpers ────────────────────────────────────────────
export function getLeaderboard60s(): LeaderboardEntry[] {
  return getLeaderboard(60 * 1000);
}

export function getLeaderboard15m(): LeaderboardEntry[] {
  return getLeaderboard(15 * 60 * 1000);
}

// ─── Periodic cleanup of stale data (older than 15 minutes) ──────────
export function startCleanupInterval(): NodeJS.Timeout {
  return setInterval(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    let removeCount = 0;
    while (interactions.length > 0 && interactions[0]!.timestamp < cutoff) {
      interactions.shift();
      removeCount++;
    }
    if (removeCount > 0) {
      console.log(`🧹 Cleaned ${removeCount} stale interactions`);
    }
  }, 60_000); // Every 60 seconds
}
