# 🐋 WhaleTracker — Somnia Reactivity Dashboard

> **Real-time whale transfer detection powered by Somnia's on-chain Reactivity SDK.**
> Built for the [Somnia Reactivity Mini Hackathon](https://somnia.network).

WhaleTracker is a full-stack application that uses Somnia's **push-model Reactivity** to detect large token transfers the instant they happen — with zero off-chain polling. When a whale moves, the chain itself invokes our contract, which triggers AI-powered behavioral tagging, Telegram alerts, and a real-time analytics dashboard.

---

## ⚡ Why Somnia Reactivity?

Traditional whale tracking relies on **off-chain bots** that poll the chain every few seconds, parse logs, and react. This is slow, fragile, and requires always-on infrastructure.

**WhaleTracker uses the push-model instead:**

```
Traditional (Pull)                    WhaleTracker (Push — Reactivity)
─────────────────                     ─────────────────────────────────
Off-chain bot polls every 5s          Somnia validators detect events
Bot fetches & parses logs             Validators invoke _onEvent() directly
Bot checks thresholds                 Contract checks thresholds on-chain
Bot sends alerts                      Contract emits WhaleAlert → backend reacts

⏱️ Latency: 5-15 seconds             ⏱️ Latency: sub-second
🔧 Requires: always-on server        🔧 Requires: nothing (chain does it)
🔒 Trust: depends on bot uptime      🔒 Trust: validator-guaranteed
```

### Reactivity SDK Integration

| Component | SDK Used | Purpose |
|---|---|---|
| `WhaleTracker.sol` | `@somnia-chain/reactivity-contracts` | Inherits `SomniaEventHandler`, implements `_onEvent()` callback |
| `subscribe.mjs` | `@somnia-chain/reactivity` (TypeScript) | Creates 8 on-chain subscriptions via `createSoliditySubscription()` |

The contract's `_onEvent(address emitter, bytes32[] eventTopics, bytes data)` function is **invoked by Somnia validators** — not by any off-chain service. This is the core of Somnia Reactivity: the chain is literally reactive to events.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                 SOMNIA TESTNET                  │
│                                                 │
│  ERC-20 Transfer ──► Validator detects event    │
│                      Validator invokes ──────────┼──► WhaleTracker.sol
│                                                 │     ├─ _onEvent()
│                                                 │     ├─ Check threshold
│                                                 │     └─ Emit WhaleAlert
└─────────────────────────────────────────────────┘
                          │
                   WhaleAlert event
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     Backend (Node.js)         Dashboard (Next.js)
     ├─ AI Behavioral Tag     ├─ Whale Feed
     ├─ Telegram Bot           ├─ Reactivity Firehose
     └─ Hot Contracts API      └─ Hot Contracts Board
```

---

## 🎯 Features

### On-Chain (Reactivity-Powered)
- ✅ **WhaleTracker Contract** — Reactive smart contract that receives Transfer events via Somnia's push-model
- ✅ **8 Token Subscriptions** — sUSDT, USDC, STT, WSTT, WETH, PING, PONG, NIA
- ✅ **Configurable Thresholds** — Stablecoins >100, STT/WSTT >50, WETH >0.5, Ecosystem >0.2% supply
- ✅ **Gas Optimized** — Ecosystem thresholds pre-cached at deployment, early returns, unchecked increments

### Backend Service
- 🤖 **AI Behavioral Tagging** — Each whale alert gets a 3-word tag (e.g., "Aggressive Accumulation Phase") via OpenRouter AI
- 📱 **Telegram Bot** — `/track`, `/untrack`, `/list` commands for personalized wallet monitoring
- 📢 **Channel Alerts** — Whale alerts broadcast to a global Telegram channel with explorer links
- 🔥 **Hot Contracts** — Rolling 60s/15m leaderboard of most interacted-with contracts

### Frontend Dashboard
- 🌊 **Reactivity Firehose** — Real-time cascading feed visualizing Somnia's sub-second finality
- 🐋 **Whale Feed** — Live AI-tagged whale alerts with token-colored styling
- 📊 **Hot Contracts Leaderboard** — Top 5 contracts with animated progress bars and timeframe selector

---

## 📋 Tracked Tokens (Somnia Testnet)

| Token | Address | Threshold |
|---|---|---|
| sUSDT | `0x6529...eE04` | > 100 tokens |
| USDC | `0x0ED7...0a17` | > 100 tokens |
| STT | `0x7f89...01A3` | > 50 tokens |
| WSTT | `0x4A3B...f2b7` | > 50 tokens |
| WETH | `0xdd8f...96b5` | > 0.5 tokens |
| PING | `0x33E7...d493` | > 0.2% supply |
| PONG | `0x9beA...098F` | > 0.2% supply |
| NIA | `0xF2F7...9311` | > 0.2% supply |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- npm
- Somnia Testnet STT (from [faucet](https://testnet.somnia.network/))

### 1. Clone & Install
```bash
git clone <repo-url>
cd somnia

# Install contract dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Deploy Contract (already deployed)
```bash
# Contract is at: 0x8F8Ae4bf3dC6cC31a57B45Bc9875f5C6F5A04e0d
# Subscriptions are active for all 8 tokens
```

### 3. Configure Backend
```bash
cd backend
cp .env.example .env
# Fill in: TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, TELEGRAM_CHANNEL_ID
```

### 4. Run
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** for the dashboard.

---

## 🗂️ Project Structure

```
somnia/
├── contracts/
│   └── WhaleTracker.sol           # Reactive smart contract (SomniaEventHandler)
├── scripts/
│   ├── deploy.js                  # Hardhat deployment
│   └── subscribe.mjs             # Reactivity subscription setup (SDK)
├── backend/
│   └── src/
│       ├── index.ts               # Entry point
│       ├── whaleListener.ts       # WhaleAlert event listener (WSS)
│       ├── aiTagger.ts            # OpenRouter AI behavioral tagging
│       ├── telegramBot.ts         # Telegram bot + channel alerts
│       ├── blockScanner.ts        # Block scanner + wallet tracking
│       ├── hotContracts.ts        # Rolling leaderboard cache
│       ├── wsServer.ts            # WebSocket server → frontend
│       └── restApi.ts             # REST API for leaderboard
├── frontend/
│   └── src/
│       ├── app/page.tsx           # 3-column dashboard layout
│       ├── components/
│       │   ├── ReactivityFirehose.tsx
│       │   ├── WhaleFeed.tsx
│       │   └── HotContracts.tsx
│       └── hooks/useWebSocket.ts  # Auto-reconnect WebSocket hook
└── hardhat.config.js
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.30, `@somnia-chain/reactivity-contracts` |
| Subscriptions | `@somnia-chain/reactivity` TypeScript SDK |
| Backend | Node.js, TypeScript, ethers.js v6, Express, WebSocket |
| AI | OpenRouter API (Gemini 2.0 Flash) |
| Bot | node-telegram-bot-api |
| Frontend | Next.js 16, Tailwind CSS, React hooks |
| Network | Somnia Testnet (Shannon) — Chain ID 50312 |

---

## 📜 Deployed Contract

- **Address:** [`0x8F8Ae4bf3dC6cC31a57B45Bc9875f5C6F5A04e0d`](https://shannon-explorer.somnia.network/address/0x8F8Ae4bf3dC6cC31a57B45Bc9875f5C6F5A04e0d)
- **Network:** Somnia Testnet (Shannon)
- **Solidity:** ^0.8.30
- **Active Subscriptions:** 8 (one per tracked token)

---

## 📄 License

MIT
