import OpenAI from "openai";
import { config } from "./config.js";

// ─── OpenRouter client (OpenAI-compatible API) ───────────────────────
let client: OpenAI | null = null;

if (config.openRouterApiKey) {
  client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.openRouterApiKey,
  });
}

// ─── Fallback tags when AI is unavailable or fails ───────────────────
const FALLBACK_TAGS = [
  "Large Token Movement",
  "Significant Capital Flow",
  "Major Wallet Activity",
  "Whale Position Shift",
  "Heavy Volume Detected",
];

function randomFallback(): string {
  return FALLBACK_TAGS[Math.floor(Math.random() * FALLBACK_TAGS.length)]!;
}

// ─── Generate 3-word behavioral tag for a whale transfer ─────────────
export async function generateWhaleTag(
  tokenSymbol: string,
  fromAddr: string,
  toAddr: string,
  amount: string,
): Promise<string> {
  if (!client) return randomFallback();

  try {
    const response = await client.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      max_tokens: 20,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `You are a blockchain analyst that generates concise behavioral tags for whale transfers. 
Given transfer details, respond with EXACTLY 3 words that describe the likely intent or behavior.
Examples: "Aggressive Accumulation Phase", "Strategic Liquidity Drain", "Exchange Deposit Signal", "Profit Taking Move", "Portfolio Rebalancing Action".
Respond with ONLY the 3 words, nothing else. No brackets, no quotes, no explanation.`,
        },
        {
          role: "user",
          content: `Whale transfer detected:
Token: ${tokenSymbol}
Amount: ${amount}
From: ${fromAddr}
To: ${toAddr}`,
        },
      ],
    });

    const tag = response.choices?.[0]?.message?.content?.trim();
    if (tag && tag.split(/\s+/).length >= 2 && tag.split(/\s+/).length <= 5) {
      return tag;
    }
    return randomFallback();
  } catch (err) {
    console.error("⚠️  AI tagger error:", (err as Error).message);
    return randomFallback();
  }
}
