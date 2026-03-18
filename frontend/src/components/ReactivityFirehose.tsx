"use client";

import { useEffect, useRef } from "react";
import type { BlockTransfers } from "@/lib/types";
import { shortenAddress } from "@/lib/constants";

interface Props {
  transfers: BlockTransfers[];
}

export default function ReactivityFirehose({ transfers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [transfers]);

  // Flatten all transfers from recent blocks
  const allTransfers = transfers.flatMap((block) =>
    block.transfers.map((tx) => ({
      ...tx,
      blockNumber: block.blockNumber,
    }))
  ).slice(0, 50);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="pulse-dot" />
          Reactivity Firehose
        </h2>
        <span className="text-xs text-gray-500">{allTransfers.length} txs</span>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
        {allTransfers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <p className="text-sm">Waiting for transfers...</p>
              <p className="text-xs text-gray-700 mt-1">Sub-second finality</p>
            </div>
          </div>
        ) : (
          allTransfers.map((tx, i) => (
            <div
              key={`${tx.hash}-${i}`}
              className="firehose-item"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono">
                  {shortenAddress(tx.from)} → {shortenAddress(tx.to)}
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  {parseFloat(tx.value).toFixed(4)} STT
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <a
                  href={`https://shannon.somnia.network/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-gray-600 hover:text-purple-400 font-mono truncate"
                >
                  {tx.hash.slice(0, 20)}...
                </a>
                <span className="text-[10px] text-gray-700">
                  #{tx.blockNumber}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
