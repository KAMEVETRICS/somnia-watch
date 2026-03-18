// ─── Shared types for the WhaleTracker dashboard ─────────────────────

export interface WhaleAlert {
  token: string;
  tokenSymbol: string;
  tokenName: string;
  category: "stablecoin" | "native" | "wrapped" | "ecosystem";
  from: string;
  to: string;
  amount: string;
  formattedAmount: string;
  aiTag: string;
  txHash?: string;
  blockNumber?: number;
  timestamp: string;
}

export interface Transfer {
  from: string;
  to: string;
  value: string;
  hash: string;
}

export interface BlockTransfers {
  blockNumber: number;
  txCount: number;
  transfers: Transfer[];
}

export interface HotContract {
  address: string;
  count: number;
  rank: number;
}

export interface HotContractsResponse {
  window: string;
  data: HotContract[];
  message?: string;
}

export interface NetworkStats {
  blockNumber: number;
  gasPrice: string;
  chainId: number;
  networkName: string;
}

export interface AddressInfo {
  address: string;
  balance: string;
  balanceRaw: string;
  transactionCount: number;
  explorer: string;
}

export interface WsMessage {
  type: "whale_alert" | "new_transfer" | "hot_contracts_update" | "network_stats" | "connected";
  data: unknown;
  timestamp: number;
}

export type Section = "analytics" | "firehose" | "search" | "whales";
