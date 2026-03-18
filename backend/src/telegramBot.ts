import TelegramBot from "node-telegram-bot-api";
import { config } from "./config.js";
import { shortenAddress, addressUrl, categoryEmoji } from "./utils.js";
import type { TokenMeta } from "./config.js";

// ─── Bot instance ────────────────────────────────────────────────────
let bot: TelegramBot | null = null;

// ─── Personalized wallet tracking: chatId → watched addresses ────────
const trackedWallets = new Map<number, string[]>();

export function getTrackedWallets(): Map<number, string[]> {
  return trackedWallets;
}

// ─── Initialize Telegram Bot ─────────────────────────────────────────
export function startTelegramBot(): void {
  if (!config.telegramBotToken) {
    console.warn("⚠️  No TELEGRAM_BOT_TOKEN — Telegram features disabled");
    return;
  }

  bot = new TelegramBot(config.telegramBotToken, { polling: true });
  console.log("🤖 Telegram bot started (polling mode)");

  // ─── /start command ──────────────────────────────────────────────
  bot.onText(/\/start/, (msg) => {
    bot!.sendMessage(
      msg.chat.id,
      "🐋 *WhaleTracker Bot — Somnia Testnet*\n\n" +
      "Commands:\n" +
      "• `/track 0xAddress` — Track a wallet\n" +
      "• `/untrack 0xAddress` — Stop tracking\n" +
      "• `/list` — Show tracked wallets\n\n" +
      "You'll get instant DMs when your tracked wallets are active!",
      { parse_mode: "Markdown" },
    );
  });

  // ─── /track <address> ────────────────────────────────────────────
  bot.onText(/\/track\s+(0x[a-fA-F0-9]{40})/, (msg, match) => {
    if (!match?.[1]) return;
    const chatId = msg.chat.id;
    const address = match[1].toLowerCase();

    const current = trackedWallets.get(chatId) || [];
    if (current.includes(address)) {
      bot!.sendMessage(chatId, `Already tracking \`${shortenAddress(address)}\``, { parse_mode: "Markdown" });
      return;
    }

    current.push(address);
    trackedWallets.set(chatId, current);
    console.log(`📱 Chat ${chatId} now tracking ${address} (${current.length} total)`);
    bot!.sendMessage(
      chatId,
      `✅ Now tracking \`${shortenAddress(address)}\`\n\nYou're watching *${current.length}* wallet(s)`,
      { parse_mode: "Markdown" },
    );
  });

  // ─── /untrack <address> ──────────────────────────────────────────
  bot.onText(/\/untrack\s+(0x[a-fA-F0-9]{40})/, (msg, match) => {
    if (!match?.[1]) return;
    const chatId = msg.chat.id;
    const address = match[1].toLowerCase();

    const current = trackedWallets.get(chatId) || [];
    const filtered = current.filter((a) => a !== address);

    if (filtered.length === current.length) {
      bot!.sendMessage(chatId, `Not tracking \`${shortenAddress(address)}\``, { parse_mode: "Markdown" });
      return;
    }

    trackedWallets.set(chatId, filtered);
    bot!.sendMessage(
      chatId,
      `🗑️ Stopped tracking \`${shortenAddress(address)}\`\n\n*${filtered.length}* wallet(s) remaining`,
      { parse_mode: "Markdown" },
    );
  });

  // ─── /list ───────────────────────────────────────────────────────
  bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const current = trackedWallets.get(chatId) || [];

    if (current.length === 0) {
      bot!.sendMessage(chatId, "📭 You're not tracking any wallets.\n\nUse `/track 0xAddress` to start!", { parse_mode: "Markdown" });
      return;
    }

    const list = current.map((a, i) => `${i + 1}. [\`${shortenAddress(a)}\`](${addressUrl(a)})`).join("\n");
    bot!.sendMessage(chatId, `📋 *Tracked Wallets (${current.length}):*\n\n${list}`, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  });
}

// ─── Broadcast whale alert to global Telegram channel ────────────────
export async function broadcastWhaleAlert(
  tokenMeta: TokenMeta,
  from: string,
  to: string,
  formattedAmount: string,
  aiTag: string,
  txHash?: string,
): Promise<void> {
  if (!bot || !config.telegramChannelId) return;

  const emoji = categoryEmoji(tokenMeta.category);
  const tagLine = `\\[${aiTag}\\]`;

  let message =
    `🐋 *WHALE ALERT* ${emoji}\n\n` +
    `*${tagLine}*\n\n` +
    `💰 *${formattedAmount} ${tokenMeta.symbol}*\n` +
    `📤 From: [\`${shortenAddress(from)}\`](${addressUrl(from)})\n` +
    `📥 To: [\`${shortenAddress(to)}\`](${addressUrl(to)})\n`;

  if (txHash) {
    message += `\n🔗 [View on Explorer](https://shannon-explorer.somnia.network/tx/${txHash})`;
  }

  message += `\n\n⚡ _Powered by Somnia Reactivity_`;

  try {
    await bot.sendMessage(config.telegramChannelId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error("❌ Telegram channel broadcast error:", (err as Error).message);
  }
}

// ─── Notify a specific user about their tracked wallet activity ──────
export async function notifyTrackedUser(
  chatId: number,
  address: string,
  role: "sender" | "receiver",
  txHash: string,
  value: string,
): Promise<void> {
  if (!bot) return;

  const emoji = role === "sender" ? "📤" : "📥";
  const action = role === "sender" ? "sent" : "received";

  let message =
    `${emoji} *Tracked Wallet Activity*\n\n` +
    `Your watched address [\`${shortenAddress(address)}\`](${addressUrl(address)}) ` +
    `just ${action} a transaction.\n\n` +
    `💰 Value: *${value}*\n`;

  // If we have a real tx hash, link to it; otherwise link to address
  if (txHash.startsWith("0x")) {
    message += `🔗 [View Transaction](https://shannon-explorer.somnia.network/tx/${txHash})`;
  } else {
    message += `🔗 [View Address Activity](${addressUrl(address)})`;
  }

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
    console.log(`✅ Notification sent to chat ${chatId} for ${shortenAddress(address)}`);
  } catch (err) {
    console.error(`❌ Telegram notify error (chat ${chatId}):`, (err as Error).message);
  }
}
