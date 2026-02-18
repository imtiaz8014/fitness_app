"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, useUserProfile } from "@/lib/hooks";
import { placeBet, claimWinnings, callFunction } from "@/lib/api";
import { Market } from "@/lib/types";

interface MarketBet {
  id: string;
  position: "yes" | "no";
  amount: number;
  status: string;
  createdAt: { seconds: number } | null;
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.uid);

  const [market, setMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<MarketBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [betAmount, setBetAmount] = useState("");
  const [betSide, setBetSide] = useState<"yes" | "no">("yes");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");

  useEffect(() => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "markets", id),
      (snap) => {
        if (snap.exists()) {
          setMarket({ id: snap.id, ...snap.data() } as Market);
        }
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    callFunction<MarketBet[]>("getMarketBets", { marketId: id }).then(setBets).catch(() => {});
  }, [id, user]);

  if (loading) return <div className="text-center py-16">Loading...</div>;
  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 mb-4">Sign in to view market details.</p>
        <a
          href="/login"
          className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-3 rounded-lg transition inline-block"
        >
          Sign In
        </a>
      </div>
    );
  }
  if (!market) return <div className="text-center py-16">Market not found</div>;

  const total = market.totalYesAmount + market.totalNoAmount;
  const yesPercent = total > 0 ? Math.round((market.totalYesAmount / total) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const deadline = new Date(market.deadline.seconds * 1000);
  const isOpen = market.status === "open" && deadline > new Date();

  const potentialPayout = betAmount
    ? (() => {
        const amt = parseFloat(betAmount);
        if (!amt || amt <= 0) return 0;
        const newYes = market.totalYesAmount + (betSide === "yes" ? amt : 0);
        const newNo = market.totalNoAmount + (betSide === "no" ? amt : 0);
        const newTotal = newYes + newNo;
        const pool = betSide === "yes" ? newYes : newNo;
        return pool > 0 ? (amt / pool) * newTotal * 0.98 : 0;
      })()
    : 0;

  async function handleBet() {
    if (!user || !betAmount) return;
    setSubmitting(true);
    setError("");
    try {
      await placeBet(id, betSide === "yes", parseFloat(betAmount));
      setBetAmount("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to place bet");
    }
    setSubmitting(false);
  }

  async function handleClaim() {
    if (!user) return;
    setSubmitting(true);
    setError("");
    setClaimSuccess("");
    try {
      const result = await claimWinnings(id);
      setClaimSuccess(`Successfully claimed ${result.payout.toFixed(2)} TK!`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to claim");
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white mb-4 inline-block">
          &larr; Back to Markets
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
            {market.category}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              market.status === "open"
                ? "bg-green-500/20 text-green-400"
                : market.status === "resolved"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            {market.status}
          </span>
          {market.resolution && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              market.resolution === "yes" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              Resolved: {market.resolution.toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold">{market.title}</h1>
        <p className="text-gray-400 mt-2">{market.description}</p>
        <p className="text-sm text-gray-500 mt-2">
          Deadline: {deadline.toLocaleString()} | Volume: {total.toFixed(0)} TK
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Odds + Bet Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Odds Visualization */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="font-semibold mb-4">Current Odds</h2>
            <div className="flex justify-between text-lg font-bold mb-2">
              <span className="text-green-400">YES {yesPercent}%</span>
              <span className="text-red-400">NO {noPercent}%</span>
            </div>
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
              <div className="bg-green-500 transition-all" style={{ width: `${yesPercent}%` }} />
              <div className="bg-red-500 transition-all" style={{ width: `${noPercent}%` }} />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>{market.totalYesAmount.toFixed(0)} TK</span>
              <span>{market.totalNoAmount.toFixed(0)} TK</span>
            </div>
          </div>

          {/* Bet Form */}
          {isOpen && user && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="font-semibold mb-4">Place Your Bet</h2>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setBetSide("yes")}
                  className={`flex-1 py-3 rounded-lg font-bold transition ${
                    betSide === "yes"
                      ? "bg-green-500 text-black"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setBetSide("no")}
                  className={`flex-1 py-3 rounded-lg font-bold transition ${
                    betSide === "no"
                      ? "bg-red-500 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  NO
                </button>
              </div>
              <div className="relative mb-4">
                <input
                  type="number"
                  placeholder="Amount in TK"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none"
                  min="1"
                />
                <span className="absolute right-4 top-3.5 text-gray-500">TK</span>
              </div>
              {potentialPayout > 0 && (
                <p className="text-sm text-gray-400 mb-4">
                  Potential payout:{" "}
                  <span className="text-green-400 font-bold">
                    {potentialPayout.toFixed(2)} TK
                  </span>
                  {" "}({((potentialPayout / parseFloat(betAmount) - 1) * 100).toFixed(1)}% profit)
                </p>
              )}
              <button
                onClick={handleBet}
                disabled={submitting || !betAmount || parseFloat(betAmount) <= 0}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition"
              >
                {submitting ? "Placing bet..." : `Bet ${betSide.toUpperCase()}`}
              </button>
              {profile && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Balance: {profile.tkBalance.toFixed(2)} TK
                </p>
              )}
            </div>
          )}

          {/* Claim button for resolved markets */}
          {market.status === "resolved" && user && (
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
              {claimSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 mb-4 text-sm">
                  {claimSuccess}
                </div>
              )}
              <button
                onClick={handleClaim}
                disabled={submitting}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition"
              >
                {submitting ? "Claiming..." : "Claim Winnings"}
              </button>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Recent Bets Sidebar */}
        <div className="space-y-4">
          <h2 className="font-semibold">Recent Bets</h2>
          {bets.length === 0 ? (
            <p className="text-gray-500 text-sm">No bets yet.</p>
          ) : (
            bets.map((bet) => (
              <div
                key={bet.id}
                className="bg-gray-900 rounded-lg p-3 border border-gray-800 text-sm"
              >
                <div className="flex justify-between">
                  <span className={bet.position === "yes" ? "text-green-400" : "text-red-400"}>
                    {bet.position.toUpperCase()}
                  </span>
                  <span>{bet.amount.toFixed(1)} TK</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {bet.createdAt?.seconds
                    ? new Date(bet.createdAt.seconds * 1000).toLocaleString()
                    : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
