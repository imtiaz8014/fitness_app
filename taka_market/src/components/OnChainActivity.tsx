"use client";

import { useState } from "react";
import { getMarketActivity, OnChainEvent, PREDICTION_CONTRACT_ADDRESS } from "@/lib/blockchain";

const EXPLORER_BASE_URL = "https://monadexplorer.com";

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function EventIcon({ type }: { type: OnChainEvent["type"] }) {
  switch (type) {
    case "MarketCreated":
      return (
        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      );
    case "BetPlaced":
      return (
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      );
    case "MarketResolved":
      return (
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      );
    case "WinningsClaimed":
      return (
        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
      );
    case "MarketCancelled":
      return (
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
  }
}

function EventDescription({ event }: { event: OnChainEvent }) {
  switch (event.type) {
    case "MarketCreated":
      return <span>Market created on-chain</span>;
    case "BetPlaced": {
      const isYes = event.args.isYes as boolean;
      const amount = event.args.amount as string;
      const user = event.args.user as string;
      return (
        <span>
          <a
            href={`${EXPLORER_BASE_URL}/address/${user}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 font-mono"
          >
            {shortenAddress(user)}
          </a>
          {" bet "}
          <span className="text-white font-medium">{parseFloat(amount).toFixed(2)} TK</span>
          {" on "}
          <span className={isYes ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
            {isYes ? "YES" : "NO"}
          </span>
        </span>
      );
    }
    case "MarketResolved": {
      const outcome = event.args.outcome as boolean;
      return (
        <span>
          Market resolved:{" "}
          <span className={outcome ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
            {outcome ? "YES" : "NO"}
          </span>
        </span>
      );
    }
    case "WinningsClaimed": {
      const payout = event.args.payout as string;
      const user = event.args.user as string;
      return (
        <span>
          <a
            href={`${EXPLORER_BASE_URL}/address/${user}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 font-mono"
          >
            {shortenAddress(user)}
          </a>
          {" claimed "}
          <span className="text-yellow-400 font-medium">{parseFloat(payout).toFixed(2)} TK</span>
        </span>
      );
    }
    case "MarketCancelled":
      return <span>Market cancelled</span>;
  }
}

interface OnChainActivityProps {
  onChainId: number;
}

export default function OnChainActivity({ onChainId }: OnChainActivityProps) {
  const [events, setEvents] = useState<OnChainEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function handleFetch() {
    setLoading(true);
    setError("");
    try {
      const data = await getMarketActivity(onChainId);
      setEvents(data);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch on-chain activity");
    }
    setLoading(false);
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => {
          if (events === null) {
            handleFetch();
          } else {
            setExpanded(!expanded);
          }
        }}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="font-semibold text-sm">On-Chain Activity</span>
          {events !== null && (
            <span className="text-xs text-gray-500">({events.length} events)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {events !== null && (
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Error */}
      {error && (
        <div className="px-5 pb-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
            <p className="text-red-400 mb-1">{error}</p>
            <button onClick={handleFetch} className="text-red-400 hover:text-red-300 underline text-xs">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Event list */}
      {expanded && events !== null && (
        <div className="border-t border-gray-800">
          {events.length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-500 text-sm">
              No on-chain events found for this market.
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {events.map((event, i) => (
                <div key={`${event.txHash}-${i}`} className="px-5 py-3 flex items-start gap-3">
                  <EventIcon type={event.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">
                      <EventDescription event={event} />
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {event.timestamp > 0 && (
                        <span>{new Date(event.timestamp * 1000).toLocaleString()}</span>
                      )}
                      <a
                        href={`${EXPLORER_BASE_URL}/tx/${event.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono"
                      >
                        {event.txHash.slice(0, 10)}...
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-800 px-5 py-3 flex items-center justify-between">
            <a
              href={`${EXPLORER_BASE_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-xs underline"
            >
              View Contract on Explorer
            </a>
            <button
              onClick={handleFetch}
              disabled={loading}
              className="text-gray-500 hover:text-gray-400 text-xs transition disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
