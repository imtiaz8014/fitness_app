"use client";

import { useState } from "react";
import { Market } from "@/lib/types";
import { getOnChainMarket, OnChainMarket, PREDICTION_CONTRACT_ADDRESS } from "@/lib/blockchain";

const EXPLORER_BASE_URL = "https://monadexplorer.com";

const STATUS_MAP: Record<number, string> = {
  0: "open",
  1: "closed",
  2: "resolved",
  3: "cancelled",
};

interface VerifyOnChainProps {
  market: Market;
}

interface ComparisonRow {
  label: string;
  firestore: string;
  onChain: string;
  match: boolean;
}

export default function VerifyOnChain({ market }: VerifyOnChainProps) {
  const [onChainData, setOnChainData] = useState<OnChainMarket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (market.onChainId == null) return null;

  async function handleVerify() {
    setLoading(true);
    setError("");
    setOnChainData(null);
    try {
      const data = await getOnChainMarket(market.onChainId!);
      setOnChainData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch on-chain data");
    }
    setLoading(false);
  }

  function buildComparison(onChain: OnChainMarket): ComparisonRow[] {
    const deadlineFirestore = market.deadline?.seconds ?? 0;
    const yesFirestore = market.totalYesAmount.toFixed(2);
    const noFirestore = market.totalNoAmount.toFixed(2);
    const yesOnChain = parseFloat(onChain.totalYesAmount).toFixed(2);
    const noOnChain = parseFloat(onChain.totalNoAmount).toFixed(2);
    const statusOnChain = STATUS_MAP[onChain.status] || `unknown(${onChain.status})`;

    return [
      {
        label: "Title",
        firestore: market.title,
        onChain: onChain.title,
        match: market.title === onChain.title,
      },
      {
        label: "Description",
        firestore: market.description,
        onChain: onChain.description,
        match: market.description === onChain.description,
      },
      {
        label: "Deadline",
        firestore: new Date(deadlineFirestore * 1000).toLocaleString(),
        onChain: new Date(onChain.deadline * 1000).toLocaleString(),
        match: deadlineFirestore === onChain.deadline,
      },
      {
        label: "YES Pool",
        firestore: `${yesFirestore} TK`,
        onChain: `${yesOnChain} TK`,
        match: yesFirestore === yesOnChain,
      },
      {
        label: "NO Pool",
        firestore: `${noFirestore} TK`,
        onChain: `${noOnChain} TK`,
        match: noFirestore === noOnChain,
      },
      {
        label: "Status",
        firestore: market.status,
        onChain: statusOnChain,
        match: market.status === statusOnChain,
      },
    ];
  }

  const allMatch = onChainData
    ? buildComparison(onChainData).every((r) => r.match)
    : false;

  return (
    <div className="mt-4">
      {!onChainData && !loading && (
        <button
          onClick={handleVerify}
          className="w-full flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-medium py-2.5 rounded-lg transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Verify on Blockchain
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Fetching on-chain data...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={handleVerify}
            className="text-red-400 hover:text-red-300 underline text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {onChainData && (
        <div className="space-y-3">
          {/* Result banner */}
          {allMatch ? (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All data verified on-chain
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg p-3 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Mismatch detected
            </div>
          )}

          {/* Comparison table */}
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Field</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">Firestore</th>
                  <th className="text-left px-3 py-2 text-gray-500 font-medium">On-Chain</th>
                  <th className="px-3 py-2 text-gray-500 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {buildComparison(onChainData).map((row) => (
                  <tr key={row.label} className="border-b border-gray-800/50 last:border-0">
                    <td className="px-3 py-2 text-gray-400 font-medium">{row.label}</td>
                    <td className="px-3 py-2 text-gray-300 max-w-[100px] truncate" title={row.firestore}>
                      {row.firestore}
                    </td>
                    <td className="px-3 py-2 text-gray-300 max-w-[100px] truncate" title={row.onChain}>
                      {row.onChain}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.match ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : (
                        <span className="text-red-400">&#10007;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Contract link */}
          <div className="text-center">
            <a
              href={`${EXPLORER_BASE_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-xs underline"
            >
              View Contract on Monad Explorer
            </a>
          </div>

          {/* Re-verify button */}
          <button
            onClick={handleVerify}
            className="w-full text-gray-500 hover:text-gray-400 text-xs py-1 transition"
          >
            Re-verify
          </button>
        </div>
      )}
    </div>
  );
}
