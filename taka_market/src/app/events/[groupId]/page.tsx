"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { Market } from "@/lib/types";
import Link from "next/link";

function getTimeRemaining(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function EventSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      <div>
        <div className="h-4 w-32 bg-gray-800 rounded mb-4" />
        <div className="h-8 w-3/4 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-full bg-gray-800 rounded mb-1" />
        <div className="h-4 w-2/3 bg-gray-800 rounded" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl h-24 border border-gray-800" />
        ))}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "markets"),
      where("groupId", "==", groupId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Market));
        data.sort((a, b) => (a.deadline?.seconds ?? 0) - (b.deadline?.seconds ?? 0));
        setMarkets(data);
        setLoading(false);
      },
      () => {
        setMarkets([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [groupId, user]);

  if (authLoading || loading) return <EventSkeleton />;

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Sign in to view event details.</p>
        <Link
          href="/login"
          className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-3 rounded-lg transition inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
        <p className="text-gray-400 mb-6">This event may have been removed or the link is incorrect.</p>
        <Link
          href="/markets"
          className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-3 rounded-lg transition inline-block"
        >
          Browse Markets
        </Link>
      </div>
    );
  }

  const firstMarket = markets[0];
  const groupTitle = firstMarket.groupTitle || firstMarket.title;
  const totalVolume = markets.reduce((sum, m) => sum + m.totalVolume, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/markets" className="text-gray-400 hover:text-white mb-4 inline-block">
          &larr; Back to Markets
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-medium">
            {markets.length} outcomes
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
            {firstMarket.category}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{groupTitle}</h1>
        <p className="text-gray-400 mt-2">{firstMarket.description}</p>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          <span>Total Volume: {totalVolume.toFixed(0)} TK</span>
        </div>
      </div>

      {/* Outcomes Table */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">All Outcomes</h2>
        {markets.map((market) => {
          const total = market.totalYesAmount + market.totalNoAmount;
          const yesPercent = total > 0 ? Math.round((market.totalYesAmount / total) * 100) : 50;
          const noPercent = 100 - yesPercent;
          const deadline = new Date(market.deadline.seconds * 1000);
          const timeLeft = getTimeRemaining(deadline);

          return (
            <Link key={market.id} href={`/markets/${market.id}`}>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-600 hover:shadow-lg hover:shadow-black/10 transition-all cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Title + Status */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{market.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          market.status === "open"
                            ? "bg-green-500/15 border-green-500/30 text-green-400"
                            : market.status === "resolved"
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                            : "bg-gray-700 border-gray-600 text-gray-400"
                        }`}
                      >
                        {market.status}
                      </span>
                      {market.resolution && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          market.resolution === "yes" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                          {market.resolution.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{timeLeft} · Deadline: {deadline.toLocaleDateString()}</p>
                  </div>

                  {/* Odds Bar */}
                  <div className="w-full md:w-48 flex-shrink-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-400">Yes {yesPercent}%</span>
                      <span className="text-red-400">No {noPercent}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className="bg-green-500 transition-all" style={{ width: `${yesPercent}%` }} />
                      <div className="bg-red-500 transition-all" style={{ width: `${noPercent}%` }} />
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium">{total.toFixed(0)} TK</p>
                    <p className="text-xs text-gray-500">volume</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
