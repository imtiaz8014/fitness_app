"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { RunRecord } from "@/lib/types";
import Link from "next/link";

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

function formatPace(pace: number): string {
  if (!pace || pace <= 0) return "—";
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

export default function RunsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "runs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setRuns(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RunRecord)));
        setLoading(false);
      },
      () => {
        setRuns([]);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading) return <div className="text-center py-16">Loading...</div>;
  if (!user) return null;

  const validatedRuns = runs.filter((r) => r.status === "validated");
  const totalDistance = validatedRuns.reduce((s, r) => s + r.distance, 0);
  const totalDuration = validatedRuns.reduce((s, r) => s + r.duration, 0);
  const totalTkEarned = validatedRuns.reduce((s, r) => s + r.tkEarned, 0);
  const avgPace =
    totalDistance > 0 ? totalDuration / 60 / totalDistance : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white">
          &larr; Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Run History</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{validatedRuns.length}</p>
          <p className="text-gray-400 text-sm">Validated Runs</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{totalDistance.toFixed(1)} km</p>
          <p className="text-gray-400 text-sm">Total Distance</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-green-400">
            {totalTkEarned.toFixed(0)} TK
          </p>
          <p className="text-gray-400 text-sm">TK Earned</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold">{formatPace(avgPace)}</p>
          <p className="text-gray-400 text-sm">Avg Pace</p>
        </div>
      </div>

      {/* Run List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-lg h-24 animate-pulse border border-gray-800"
            />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-2">No runs yet.</p>
          <p className="text-gray-600 text-sm">
            Download the TAKA Run app and start running to earn TK!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      run.status === "validated"
                        ? "bg-green-500/20 text-green-400"
                        : run.status === "rejected"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {run.status === "validated"
                      ? "\u2713"
                      : run.status === "rejected"
                      ? "\u2717"
                      : "\u25CF"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {run.distance.toFixed(2)} km
                    </p>
                    <p className="text-sm text-gray-500">
                      {run.startTime?.seconds
                        ? new Date(
                            run.startTime.seconds * 1000
                          ).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex gap-4 text-sm text-gray-400">
                    <span>{formatDuration(run.duration)}</span>
                    <span>{formatPace(run.pace)}</span>
                  </div>
                  {run.status === "validated" && (
                    <p className="text-green-400 font-medium text-sm">
                      +{run.tkEarned.toFixed(1)} TK
                    </p>
                  )}
                  {run.status === "rejected" && run.validationErrors && (
                    <p className="text-red-400 text-xs">
                      {run.validationErrors.join("; ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
