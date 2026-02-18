"use client";

import { useState, useEffect } from "react";
import { callFunction } from "@/lib/api";
import { LeaderboardEntry } from "@/lib/types";

type Tab = "balance" | "distance" | "runs";

const TAB_TO_FIELD: Record<Tab, string> = {
  balance: "tkBalance",
  distance: "totalDistance",
  runs: "totalRuns",
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("balance");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await callFunction<LeaderboardEntry[]>("getLeaderboard", {
          field: TAB_TO_FIELD[tab],
          limit: 50,
        });
        setUsers(result);
      } catch {
        setUsers([]);
      }
      setLoading(false);
    }
    load();
  }, [tab]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Leaderboard</h1>

      <div className="flex gap-2">
        {(["balance", "distance", "runs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg capitalize transition ${
              tab === t ? "bg-green-500 text-black font-medium" : "bg-gray-800 text-gray-400"
            }`}
          >
            {t === "balance" ? "Top Earners" : t === "distance" ? "Most Distance" : "Most Runs"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-900 rounded-lg h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user, index) => (
            <div
              key={user.uid}
              className="bg-gray-900 rounded-lg p-4 border border-gray-800 flex items-center gap-4"
            >
              <span className={`text-lg font-bold w-8 text-center ${
                index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-300" : index === 2 ? "text-orange-400" : "text-gray-500"
              }`}>
                #{index + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{user.displayName || "Anonymous"}</p>
                <p className="text-gray-500 text-xs">
                  {user.totalDistance.toFixed(1)} km | {user.totalRuns} runs
                </p>
              </div>
              <div className="text-right">
                {tab === "balance" && (
                  <p className="text-green-400 font-bold">{user.tkBalance.toFixed(2)} TK</p>
                )}
                {tab === "distance" && (
                  <p className="text-green-400 font-bold">{user.totalDistance.toFixed(1)} km</p>
                )}
                {tab === "runs" && (
                  <p className="text-green-400 font-bold">{user.totalRuns} runs</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
