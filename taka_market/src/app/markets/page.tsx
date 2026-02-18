"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { Market } from "@/lib/types";

const CATEGORIES = ["all", "sports", "politics", "entertainment", "crypto", "other"];

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

export default function MarketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");

  useEffect(() => {
    if (!user) {
      setMarkets([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, "markets");
    let q = query(ref, orderBy("createdAt", "desc"));

    if (statusFilter !== "all") {
      q = query(ref, where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Market));
        setMarkets(data);
        setLoading(false);
      },
      () => {
        setMarkets([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user, statusFilter]);

  const filtered = markets.filter((m) => {
    if (category !== "all" && m.category !== category) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Prediction Markets</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl h-48 animate-pulse border border-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Prediction Markets</h1>
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">Sign in to browse and bet on prediction markets.</p>
          <Link
            href="/login"
            className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-3 rounded-lg transition inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-3xl font-bold">Prediction Markets</h1>
        <input
          type="text"
          placeholder="Search markets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 w-full md:w-64 focus:border-green-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "open", "resolved", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${
              statusFilter === s
                ? "bg-green-500 text-black font-medium"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
        <div className="w-px bg-gray-700 mx-2" />
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${
              category === c
                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Market Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-900 rounded-xl h-48 animate-pulse border border-gray-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No markets found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ market }: { market: Market }) {
  const total = market.totalYesAmount + market.totalNoAmount;
  const yesPercent = total > 0 ? Math.round((market.totalYesAmount / total) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const deadline = new Date(market.deadline.seconds * 1000);
  const timeLeft = getTimeRemaining(deadline);
  const descPreview = market.description.length > 80
    ? market.description.slice(0, 80) + "..."
    : market.description;

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-600 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all cursor-pointer h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
            {market.category}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
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
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              market.resolution === "yes" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              {market.resolution.toUpperCase()}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1 flex-1">{market.title}</h3>
        <p className="text-gray-500 text-sm mb-3">{descPreview}</p>
        {/* Odds Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-400">Yes {yesPercent}%</span>
            <span className="text-red-400">No {noPercent}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${yesPercent}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${noPercent}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{total.toFixed(0)} TK volume</span>
          <span>{timeLeft}</span>
        </div>
      </div>
    </Link>
  );
}
