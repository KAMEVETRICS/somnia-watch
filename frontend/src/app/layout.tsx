import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhaleTracker — Somnia Reactivity Dashboard",
  description:
    "Real-time whale transfer detection and analytics powered by Somnia's on-chain Reactivity SDK. Live AI-tagged whale alerts, transfer firehose, and hot contracts leaderboard.",
  keywords: ["Somnia", "WhaleTracker", "Reactivity", "DeFi", "Whale Alert", "Analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
