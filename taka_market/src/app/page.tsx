"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPlatformStats } from "@/lib/api";

interface PlatformStats {
  totalMarkets: number;
  totalVolume: number;
  activeUsers: number;
  tkDistributed: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats().then(setStats).catch(() => {});
  }, []);

  const statItems = [
    { label: "Total Markets", value: stats ? String(stats.totalMarkets) : null },
    { label: "Total Volume", value: stats ? `${stats.totalVolume.toLocaleString()} TK` : null },
    { label: "Active Users", value: stats ? String(stats.activeUsers) : null },
    { label: "TK Distributed", value: stats ? stats.tkDistributed.toLocaleString() : null },
  ];

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="text-center pt-16 pb-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative">
          <p className="text-green-400 text-sm font-medium tracking-widest uppercase mb-4">Prediction Market</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Run. Earn.{" "}
            <span className="text-green-400">Predict.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Earn TK coins by running with the TAKA app, then use them to predict
            outcomes on real-world events. Powered by Monad blockchain.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/markets"
              className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3.5 rounded-lg text-lg transition shadow-lg shadow-green-500/20"
            >
              Browse Markets
            </Link>
            <Link
              href="/login"
              className="border border-gray-600 hover:border-gray-400 px-8 py-3.5 rounded-lg text-lg transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="w-14 h-14 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl mx-auto mb-5">🏃</div>
            <h3 className="text-xl font-bold mb-2">1. Run & Earn</h3>
            <p className="text-gray-400">
              Download TAKA Run, track your runs with GPS, and earn TK coins for
              every kilometer.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-5">🎯</div>
            <h3 className="text-xl font-bold mb-2">2. Predict</h3>
            <p className="text-gray-400">
              Browse prediction markets on sports, politics, entertainment, and
              more. Bet YES or NO with your earned TK.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800">
            <div className="w-14 h-14 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-3xl mx-auto mb-5">💰</div>
            <h3 className="text-xl font-bold mb-2">3. Win</h3>
            <p className="text-gray-400">
              If your prediction is correct, claim your share of the pool.
              Winnings are proportional to your bet.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {statItems.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 rounded-xl p-6 text-center border border-gray-800"
          >
            {stat.value !== null ? (
              <div className="text-2xl font-bold text-green-400">{stat.value}</div>
            ) : (
              <div className="h-8 w-16 bg-gray-800 rounded animate-pulse mx-auto" />
            )}
            <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
