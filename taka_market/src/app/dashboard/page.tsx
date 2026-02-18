"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, useUserProfile } from "@/lib/hooks";
import { Bet } from "@/lib/types";
import Link from "next/link";

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-40 bg-gray-800 rounded" />
      <div className="bg-gray-900 rounded-xl h-44 border border-gray-800" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 rounded-xl h-20 border border-gray-800" />
        ))}
      </div>
      <div>
        <div className="h-6 w-24 bg-gray-800 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 rounded-lg h-16 border border-gray-800" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setBets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bet)));
      },
      () => {
        setBets([]);
      }
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || profileLoading) return <DashboardSkeleton />;
  if (!user) return null;

  const wonBets = bets.filter((b) => b.status === "won");
  const totalWagered = bets.reduce((s, b) => s + b.amount, 0);
  const totalWon = wonBets.reduce((s, b) => s + b.payout, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Balance Card */}
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
        <p className="text-gray-400 mb-2">TK Balance</p>
        <p className="text-5xl font-bold text-green-400">
          {(profile?.tkBalance ?? 0).toFixed(2)} TK
        </p>
        {profile?.walletAddress && (
          <p className="text-gray-600 text-xs mt-2">
            {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
          </p>
        )}
        <div className="flex gap-3 mt-4 justify-center">
          <Link
            href="/markets"
            className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-2 rounded-lg transition"
          >
            Browse Markets
          </Link>
          <Link
            href="/dashboard/runs"
            className="border border-gray-700 hover:border-gray-500 px-6 py-2 rounded-lg transition"
          >
            Run History
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{profile?.totalRuns ?? 0}</p>
          <p className="text-gray-400 text-sm">Total Runs</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{(profile?.totalDistance ?? 0).toFixed(1)} km</p>
          <p className="text-gray-400 text-sm">Total Distance</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{totalWagered.toFixed(0)} TK</p>
          <p className="text-gray-400 text-sm">Total Wagered</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-green-400">{totalWon.toFixed(0)} TK</p>
          <p className="text-gray-400 text-sm">Total Won</p>
        </div>
      </div>

      {/* Active Bets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Bets</h2>
          <Link href="/dashboard/bets" className="text-green-400 text-sm hover:underline">
            View all &rarr;
          </Link>
        </div>
        {bets.length === 0 ? (
          <p className="text-gray-500">No bets yet. Browse markets to place your first bet!</p>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => (
              <Link key={bet.id} href={`/markets/${bet.marketId}`}>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-600 transition flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-bold ${bet.position === "yes" ? "text-green-400" : "text-red-400"}`}>
                      {bet.position.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-sm ml-2">on market #{bet.marketId.slice(0, 8)}...</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{bet.amount.toFixed(1)} TK</p>
                    <span className={`text-xs ${
                      bet.status === "won" ? "text-green-400" :
                      bet.status === "lost" ? "text-red-400" :
                      bet.status === "active" ? "text-yellow-400" : "text-gray-400"
                    }`}>
                      {bet.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
