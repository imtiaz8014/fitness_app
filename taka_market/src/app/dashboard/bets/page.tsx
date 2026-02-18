"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { Bet } from "@/lib/types";
import Link from "next/link";

export default function BetsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    const ref = collection(db, "bets");
    let q = query(ref, where("userId", "==", user.uid), orderBy("createdAt", "desc"));

    if (filter !== "all") {
      q = query(
        ref,
        where("userId", "==", user.uid),
        where("status", "==", filter),
        orderBy("createdAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setBets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bet)));
      setLoading(false);
    });
    return unsubscribe;
  }, [user, filter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading) return <div className="text-center py-16">Loading...</div>;
  if (!user) return null;

  const totalWagered = bets.reduce((s, b) => s + b.amount, 0);
  const wonBets = bets.filter((b) => b.status === "won");
  const totalWon = wonBets.reduce((s, b) => s + b.payout, 0);
  const winRate =
    bets.filter((b) => b.status === "won" || b.status === "lost").length > 0
      ? (
          (wonBets.length /
            bets.filter((b) => b.status === "won" || b.status === "lost")
              .length) *
          100
        ).toFixed(1)
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">
          &larr; Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Bet History</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{bets.length}</p>
          <p className="text-gray-400 text-sm">Total Bets</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{totalWagered.toFixed(0)} TK</p>
          <p className="text-gray-400 text-sm">Total Wagered</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-green-400">
            {totalWon.toFixed(0)} TK
          </p>
          <p className="text-gray-400 text-sm">Total Won</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{winRate}%</p>
          <p className="text-gray-400 text-sm">Win Rate</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "active", "won", "lost", "refunded"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize transition ${
              filter === s
                ? "bg-green-500 text-black font-medium"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bet List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-lg h-20 animate-pulse border border-gray-800"
            />
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {filter === "all"
            ? "No bets yet. Browse markets to place your first bet!"
            : `No ${filter} bets found.`}
        </div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <Link key={bet.id} href={`/markets/${bet.marketId}`}>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-600 transition flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-bold px-3 py-1 rounded ${
                      bet.position === "yes"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {bet.position.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm text-gray-400">
                      Market #{bet.marketId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {bet.createdAt?.seconds
                        ? new Date(
                            bet.createdAt.seconds * 1000
                          ).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{bet.amount.toFixed(1)} TK</p>
                  <span
                    className={`text-xs font-medium ${
                      bet.status === "won"
                        ? "text-green-400"
                        : bet.status === "lost"
                        ? "text-red-400"
                        : bet.status === "active"
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {bet.status}
                    {bet.status === "won" &&
                      ` (+${(bet.payout - bet.amount).toFixed(1)} TK)`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
