"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks";
import { createMarket, resolveMarket, cancelMarket } from "@/lib/api";
import { Market } from "@/lib/types";
import Link from "next/link";

const CATEGORIES = ["sports", "politics", "entertainment", "crypto", "other"];

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("sports");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Check admin role
  useEffect(() => {
    if (authLoading || !user) return;
    const checkAdminRole = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data()?.role === "admin") {
          setIsAdmin(true);
        }
      } catch {
        // Not admin
      }
      setCheckingAdmin(false);
    };
    checkAdminRole();
  }, [user, authLoading]);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "markets"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMarkets(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Market)));
    });
    return unsubscribe;
  }, [isAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const result = await createMarket({ title, description, category, deadline });
      setSuccess(`Market created! ID: ${result.marketId}`);
      setTitle("");
      setDescription("");
      setDeadline("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create market");
    }
    setCreating(false);
  }

  const [confirmAction, setConfirmAction] = useState<{
    type: "resolve" | "cancel";
    marketId: string;
    outcome?: boolean;
  } | null>(null);
  const [actionError, setActionError] = useState("");

  async function handleResolve(marketId: string, outcome: boolean) {
    setConfirmAction({ type: "resolve", marketId, outcome });
  }

  async function handleCancel(marketId: string) {
    setConfirmAction({ type: "cancel", marketId });
  }

  async function executeConfirmedAction() {
    if (!confirmAction) return;
    setActionError("");
    try {
      if (confirmAction.type === "resolve") {
        await resolveMarket(confirmAction.marketId, confirmAction.outcome!);
        setSuccess(`Market resolved as ${confirmAction.outcome ? "YES" : "NO"}`);
      } else {
        await cancelMarket(confirmAction.marketId);
        setSuccess("Market cancelled. Bets will be refunded.");
      }
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    }
    setConfirmAction(null);
  }

  if (authLoading || (user && checkingAdmin)) return <div className="text-center py-16">Loading...</div>;
  if (!user) return (
    <div className="text-center py-16">
      <p className="text-gray-400 mb-4">Please sign in to access the admin panel.</p>
      <Link href="/login" className="text-green-400 hover:underline">Go to Login</Link>
    </div>
  );
  if (!isAdmin) return <div className="text-center py-16 text-red-400 font-bold">Access denied. Your account does not have admin privileges.</div>;

  return (
    <div>
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-red-400">TAKA Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user.email}</span>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Sign Out
          </button>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h2 className="text-3xl font-bold">Admin Panel</h2>

      {/* Create Market */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-xl font-bold mb-4">Create Market</h3>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 mb-4 text-sm">{success}</div>}
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            placeholder="Market title (e.g., Will Bangladesh win the next match?)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none resize-none"
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-bold px-8 py-3 rounded-lg transition"
          >
            {creating ? "Creating..." : "Create Market"}
          </button>
        </form>
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 max-w-sm mx-4 space-y-4">
            <h3 className="text-lg font-bold">
              {confirmAction.type === "resolve"
                ? `Resolve as ${confirmAction.outcome ? "YES" : "NO"}?`
                : "Cancel this market?"}
            </h3>
            <p className="text-gray-400 text-sm">
              {confirmAction.type === "cancel"
                ? "All bets will be refunded. This cannot be undone."
                : "This will finalize the market outcome. This cannot be undone."}
            </p>
            {actionError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
                {actionError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setConfirmAction(null); setActionError(""); }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedAction}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  confirmAction.type === "cancel"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-black"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Markets */}
      <div>
        <h3 className="text-xl font-bold mb-4">Manage Markets</h3>
        <div className="space-y-3">
          {markets.map((market) => (
            <div key={market.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium">{market.title}</h4>
                  <p className="text-sm text-gray-500">
                    Status: {market.status} | Volume: {market.totalVolume?.toFixed(0) || 0} TK | ID: {market.id}
                  </p>
                </div>
                {(market.status === "open" || market.status === "closed") && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResolve(market.id, true)}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30"
                    >
                      YES
                    </button>
                    <button
                      onClick={() => handleResolve(market.id, false)}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
                    >
                      NO
                    </button>
                    <button
                      onClick={() => handleCancel(market.id)}
                      className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {market.status === "resolved" && (
                  <span className={`px-3 py-1 rounded text-sm font-bold ${
                    market.resolution === "yes" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {market.resolution?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
