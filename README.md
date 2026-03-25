# SOMNIAWATCH — Somnia Reactivity Dashboard

> **Real-time whale transfer detection powered by Somnia's Reactivity SDK.**
> Built for the [Somnia Reactivity Mini Hackathon](https://somnia.network).

SomniaWatch is a full-stack application that uses Somnia's **push-model Reactivity** to detect large token transfers the instant they happen with zero off-chain polling. When a whale moves, the Reactivity SDK pushes the event to our backend, which triggers AI-powered behavioral tagging, Telegram alerts, and a real-time analytics dashboard.

---

## How Somnia Reactivity Powers This Project

Traditional whale tracking relies on off-chain bots that poll the chain every few seconds, parse logs, and react. This is slow, fragile, and requires always-on infrastructure.

SomniaWatch uses Somnia's push-model instead:

```
Traditional (Pull)                    WhaleTracker (Push via Reactivity)
---------------------                 ------------------------------------
Off-chain bot polls every 5s          Reactivity SDK subscribes to events
Bot fetches and parses logs           SDK pushes decoded events instantly
Bot checks thresholds                 Backend decodes Transfer data in-stream
Bot sends alerts                      Alerts fire within milliseconds

Latency: 5-15 seconds                Latency: sub-second
Requires: always-on poller            Requires: single SDK subscription
Trust: depends on bot uptime          Trust: Somnia validator-guaranteed push
```

---

## Reactivity SDK Integration Map

The Reactivity SDK (`@somnia-chain/reactivity`) serves as the **single data ingestion layer** for the entire application. Every real-time feature in the stack consumes data that originates from the SDK subscription.

```
                    Somnia Testnet (Chain ID 50312)
                              |
                    Reactivity SDK Subscription
                    (8 token contract sources)
                              |
                     reactivityTracker.ts
                     [Decodes ERC-20 Transfers]
                              |
           +------------------+------------------+
           |                  |                  |
     Telegram Bot       Dashboard WS       Hot Contracts
     (DM alerts)       (whale_alert)       (interaction log)
           |                  |                  |
    notifyTrackedUser    WhaleFeed.tsx     HotContracts.tsx
    broadcastWhaleAlert  ReactivityFirehose
```

### Where the SDK is used directly

| Component | SDK Package | Purpose |
|---|---|---|
| `WhaleTracker.sol` | `@somnia-chain/reactivity-contracts` | On-chain reactive contract — inherits `SomniaEventHandler`, implements `_onEvent()` callback |
| `subscribe.mjs` | `@somnia-chain/reactivity` | Creates 8 on-chain subscriptions via `createSoliditySubscription()` |
| `reactivityTracker.ts` | `@somnia-chain/reactivity` | Off-chain SDK subscription — pushes real-time events to all downstream features |

### Features powered by the SDK (downstream consumers)

| Feature | Module | How it receives SDK data |
|---|---|---|
| Telegram Wallet Alerts | `telegramBot.ts` | `reactivityTracker` calls `notifyTrackedUser()` with decoded token, amount, and direction |
| Dashboard Whale Feed | `WhaleFeed.tsx` | `reactivityTracker` broadcasts `whale_alert` via `wsServer` WebSocket |
| Hot Contracts Board | `HotContracts.tsx` | `reactivityTracker` calls `recordContractInteraction()` for every SDK event |
| AI Behavioral Tags | `aiTagger.ts` | Called by `whaleListener` to generate 3-word whale behavior labels |
| Channel Broadcasts | `telegramBot.ts` | `broadcastWhaleAlert()` sends formatted alerts to a global Telegram channel |

---

## Architecture

```
+---------------------------------------------------+
|                  SOMNIA TESTNET                    |
|                                                   |
|  On-Chain Layer:                                  |
|  WhaleTracker.sol (SomniaEventHandler)            |
|  - 8 Reactivity subscriptions (1 per token)       |
|  - _onEvent() callback invoked by validators      |
|  - Emits WhaleAlert on threshold breach           |
+------------------------+--------------------------+
                         |
         +---------------+---------------+
         |                               |
   Reactivity SDK                  Viem WebSocket
   (reactivityTracker.ts)        (whaleListener.ts)
   - Subscribes to 8 tokens      - watchContractEvent
   - Decodes Transfer events      - WhaleAlert events
   - Pushes to TG + Dashboard     - AI tagging + TG
         |                               |
         +---------------+---------------+
                         |
              +----------+----------+
              |          |          |
         Telegram    WebSocket    REST API
         Bot         Server       /hot-contracts
              |          |          |
         DM Alerts   WhaleFeed   HotContracts
                     Firehose    Leaderboard
```

---

## Features

### On-Chain (Reactivity-Powered)
- **Reactive Smart Contract** — `WhaleTracker.sol` receives Transfer events via Somnia's push-model `_onEvent()` callback
- **8 Token Subscriptions** — sUSDT, USDC, STT, WSTT, WETH, PING, PONG, NIA
- **Configurable Thresholds** — Stablecoins >100, STT/WSTT >50, WETH >0.5, Ecosystem >0.2% supply
- **Gas Optimized** — Ecosystem thresholds pre-cached at deployment, early returns, unchecked increments

### Off-Chain SDK (reactivityTracker.ts)
- **Reactivity SDK Subscription** — Connects via WebSocket to Somnia infrastructure and subscribes to all 8 token contracts
- **ERC-20 Transfer Decoding** — Parses raw event topics and data into human-readable token transfers with amounts
- **Whale Detection** — Any transfer above 100 tokens is classified as a whale movement and pushed to the dashboard
- **Tracked Wallet Matching** — Cross-references decoded `from`/`to` addresses against user-tracked wallets

### Telegram Bot
- `/track 0xAddress` — Start tracking a wallet for real-time activity alerts
- `/untrack 0xAddress` — Stop tracking
- `/list` — Show all tracked wallets
- **Rich Alerts** — Shows exact token symbol, amount, and direction (e.g., "Sent 102.0 WSTT")
- **Explorer Links** — Each alert links directly to the transaction on Somnia Explorer

### Frontend Dashboard
- **Whale Feed** — Live AI-tagged whale alerts with token-colored styling
- **Reactivity Firehose** — Real-time cascading feed visualizing Somnia's sub-second finality
- **Hot Contracts Leaderboard** — Top 5 contracts with animated progress bars and 60s/15m timeframe selector
- **Network Stats** — Block number, gas price, and connection status

---

## Tracked Tokens (Somnia Testnet)

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

## Quick Start

### Prerequisites
- Node.js >= 18
- npm
- Somnia Testnet STT (from [faucet](https://testnet.somnia.network/))

### 1. Clone and Install
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

### 2. Configure Backend
```bash
cd backend
cp .env.example .env
# Fill in: TELEGRAM_BOT_TOKEN, OPENROUTER_API_KEY, TELEGRAM_CHANNEL_ID
```

### 3. Run
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** for the dashboard.

---

## Project Structure

```
somnia/
|-- contracts/
|   +-- WhaleTracker.sol              # Reactive smart contract (SomniaEventHandler)
|-- scripts/
|   |-- deploy.js                     # Hardhat deployment
|   +-- subscribe.mjs                 # Reactivity subscription setup (SDK)
|-- backend/
|   +-- src/
|       |-- index.ts                  # Entry point — boots all services
|       |-- reactivityTracker.ts      # [CORE] Reactivity SDK subscription + event decoder
|       |-- whaleListener.ts          # WhaleAlert event listener (viem WebSocket)
|       |-- networkStats.ts           # Lightweight block/gas poller (viem HTTP)
|       |-- aiTagger.ts               # OpenRouter AI behavioral tagging
|       |-- telegramBot.ts            # Telegram bot + channel alerts
|       |-- hotContracts.ts           # Rolling leaderboard cache
|       |-- wsServer.ts               # WebSocket server to frontend
|       +-- restApi.ts                # REST API for leaderboard data
|-- frontend/
|   +-- src/
|       |-- app/page.tsx              # 3-column dashboard layout
|       |-- components/
|       |   |-- ReactivityFirehose.tsx
|       |   |-- WhaleFeed.tsx
|       |   +-- HotContracts.tsx
|       +-- hooks/useWebSocket.ts     # Auto-reconnect WebSocket hook
+-- hardhat.config.js
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Solidity 0.8.30, `@somnia-chain/reactivity-contracts` |
| Reactivity SDK | `@somnia-chain/reactivity` TypeScript SDK |
| Backend | Node.js, TypeScript, viem, Express, WebSocket |
| AI | OpenRouter API (Gemini 2.0 Flash) |
| Bot | node-telegram-bot-api (polling mode) |
| Frontend | Next.js 16, Tailwind CSS, React hooks |
| Network | Somnia Testnet (Shannon) — Chain ID 50312 |

---

## Deployed Contract

- **Address:** [`0x8F8Ae4bf3dC6cC31a57B45Bc9875f5C6F5A04e0d`](https://shannon-explorer.somnia.network/address/0x8F8Ae4bf3dC6cC31a57B45Bc9875f5C6F5A04e0d)
- **Network:** Somnia Testnet (Shannon)
- **Solidity:** ^0.8.30
- **Active Subscriptions:** 8 (one per tracked token)

---

## License

MIT
