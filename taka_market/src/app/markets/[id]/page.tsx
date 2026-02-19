"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth, useUserProfile } from "@/lib/hooks";
import { placeBet, claimWinnings, callFunction, addComment } from "@/lib/api";
import { Market, Comment } from "@/lib/types";
import { PREDICTION_CONTRACT_ADDRESS } from "@/lib/blockchain";
import VerifyOnChain from "@/components/VerifyOnChain";
import OnChainActivity from "@/components/OnChainActivity";
import Link from "next/link";

const EXPLORER_BASE_URL = "https://monadexplorer.com";

interface MarketBet {
  id: string;
  position: "yes" | "no";
  amount: number;
  status: string;
  txHash?: string;
  createdAt: { seconds: number } | null;
}

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

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      <div>
        <div className="h-4 w-32 bg-gray-800 rounded mb-4" />
        <div className="flex gap-2 mb-2">
          <div className="h-5 w-16 bg-gray-800 rounded-full" />
          <div className="h-5 w-14 bg-gray-800 rounded-full" />
        </div>
        <div className="h-8 w-3/4 bg-gray-800 rounded mb-2" />
        <div className="h-4 w-full bg-gray-800 rounded mb-1" />
        <div className="h-4 w-2/3 bg-gray-800 rounded" />
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-900 rounded-xl h-40 border border-gray-800" />
          <div className="bg-gray-900 rounded-xl h-64 border border-gray-800" />
        </div>
        <div className="space-y-4">
          <div className="h-6 w-24 bg-gray-800 rounded" />
          <div className="bg-gray-900 rounded-lg h-16 border border-gray-800" />
          <div className="bg-gray-900 rounded-lg h-16 border border-gray-800" />
        </div>
      </div>
    </div>
  );
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
  const [betSuccess, setBetSuccess] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Sibling markets (for grouped events)
  const [siblings, setSiblings] = useState<Market[]>([]);

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

  // Fetch sibling markets when market has a groupId
  useEffect(() => {
    if (!market?.groupId || !user) {
      setSiblings([]);
      return;
    }
    const q = query(
      collection(db, "markets"),
      where("groupId", "==", market.groupId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Market))
          .filter((m) => m.id !== id)
          .sort((a, b) => (a.deadline?.seconds ?? 0) - (b.deadline?.seconds ?? 0));
        setSiblings(data);
      },
      () => {}
    );
    return unsubscribe;
  }, [market?.groupId, id, user]);

  // Real-time comments listener
  useEffect(() => {
    if (!id || !user) return;
    const q = query(
      collection(db, "comments"),
      where("marketId", "==", id),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment)));
      },
      () => {}
    );
    return unsubscribe;
  }, [id, user]);

  if (loading) return <DetailSkeleton />;
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
  if (!market) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold mb-2">Market Not Found</h2>
        <p className="text-gray-400 mb-6">This market may have been removed or the link is incorrect.</p>
        <Link
          href="/markets"
          className="bg-green-500 hover:bg-green-600 text-black font-medium px-6 py-3 rounded-lg transition inline-block"
        >
          Browse Markets
        </Link>
      </div>
    );
  }

  const total = market.totalYesAmount + market.totalNoAmount;
  const yesPercent = total > 0 ? Math.round((market.totalYesAmount / total) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const deadline = new Date(market.deadline.seconds * 1000);
  const isOpen = market.status === "open" && deadline > new Date();
  const timeLeft = getTimeRemaining(deadline);
  const hoursLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);

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
    setBetSuccess(false);
    try {
      await placeBet(id, betSide === "yes", parseFloat(betAmount));
      setBetAmount("");
      setBetSuccess(true);
      setTimeout(() => setBetSuccess(false), 4000);
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

  async function handleComment() {
    if (!user || !commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      await addComment(id, commentText.trim());
      setCommentText("");
    } catch {
      // Comment failed silently - user can retry
    }
    setCommentSubmitting(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        {market.groupId ? (
          <Link href={`/events/${market.groupId}`} className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            &larr; Back to Event
          </Link>
        ) : (
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white mb-4 inline-block">
            &larr; Back to Markets
          </button>
        )}
        <div className="flex items-center gap-2 mb-2">
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
              Resolved: {market.resolution.toUpperCase()}
            </span>
          )}
          {market.groupId && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Grouped Event
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold">{market.title}</h1>
        {market.groupTitle && (
          <p className="text-sm text-purple-400 mt-1">
            Part of: <Link href={`/events/${market.groupId}`} className="hover:underline">{market.groupTitle}</Link>
          </p>
        )}
        <p className="text-gray-400 mt-2">{market.description}</p>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          <span>Volume: {total.toFixed(0)} TK</span>
          <span>|</span>
          <span className={
            hoursLeft <= 0 ? "text-gray-500" :
            hoursLeft < 24 ? "text-yellow-400 font-medium" :
            "text-gray-500"
          }>
            {timeLeft}
          </span>
        </div>
      </div>

      {/* Bet success banner */}
      {betSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-4 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Bet placed successfully!
        </div>
      )}

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

          {/* On-Chain Activity */}
          {market.onChainId != null ? (
            <OnChainActivity onChainId={market.onChainId} />
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 px-5 py-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-400">On-Chain Activity</p>
                <p className="text-xs text-gray-500">This market has not been recorded on the blockchain yet. On-chain verification will be available once migrated.</p>
              </div>
            </div>
          )}

          {/* Discussion / Comments */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="font-semibold mb-4">
              Discussion {comments.length > 0 && <span className="text-gray-500 font-normal">({comments.length})</span>}
            </h2>

            {/* Comment input */}
            {user && (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">
                  {(profile?.displayName || user.email || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    maxLength={500}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 focus:border-green-500 focus:outline-none resize-none text-sm"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-600">{commentText.length}/500</span>
                    <button
                      onClick={handleComment}
                      disabled={commentSubmitting || !commentText.trim()}
                      className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium px-4 py-1.5 rounded-lg text-sm transition"
                    >
                      {commentSubmitting ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Comment list */}
            {comments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first to share your thoughts!</p>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {c.displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.displayName}</span>
                        <span className="text-xs text-gray-600">
                          {c.createdAt?.seconds
                            ? new Date(c.createdAt.seconds * 1000).toLocaleString()
                            : "just now"}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Outcomes (for grouped markets) */}
          {siblings.length > 0 && (
            <div>
              <h2 className="font-semibold mb-3">Related Outcomes</h2>
              <div className="space-y-2">
                {siblings.map((s) => {
                  const sTotal = s.totalYesAmount + s.totalNoAmount;
                  const sYes = sTotal > 0 ? Math.round((s.totalYesAmount / sTotal) * 100) : 50;
                  return (
                    <Link key={s.id} href={`/markets/${s.id}`}>
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-800 hover:border-purple-500/30 transition cursor-pointer">
                        <p className="text-sm font-medium truncate mb-1.5">{s.title}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                            <div className="bg-green-500" style={{ width: `${sYes}%` }} />
                            <div className="bg-red-500" style={{ width: `${100 - sYes}%` }} />
                          </div>
                          <span className="text-green-400 text-xs">{sYes}%</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* On-Chain Info */}
          <div>
            <h2 className="font-semibold mb-3">On-Chain Info</h2>
            {market.onChainId != null ? (
              <>
                <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market ID</span>
                    <span className="text-purple-400 font-mono">#{market.onChainId}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      market.blockchainStatus === "confirmed"
                        ? "bg-green-500/15 text-green-400 border border-green-500/30"
                        : market.blockchainStatus === "pending"
                        ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                        : "bg-gray-700 text-gray-400 border border-gray-600"
                    }`}>
                      {market.blockchainStatus || "off-chain"}
                    </span>
                  </div>
                  {market.txHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Created</span>
                      <a
                        href={`${EXPLORER_BASE_URL}/tx/${market.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono text-xs truncate max-w-[120px]"
                      >
                        {market.txHash.slice(0, 10)}...
                      </a>
                    </div>
                  )}
                  {market.resolveTxHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Resolved</span>
                      <a
                        href={`${EXPLORER_BASE_URL}/tx/${market.resolveTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono text-xs truncate max-w-[120px]"
                      >
                        {market.resolveTxHash.slice(0, 10)}...
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Contract</span>
                    <a
                      href={`${EXPLORER_BASE_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-mono text-xs truncate max-w-[120px]"
                    >
                      {PREDICTION_CONTRACT_ADDRESS.slice(0, 10)}...
                    </a>
                  </div>
                  <div className="text-xs text-gray-600 pt-1 border-t border-gray-800">
                    Monad Mainnet
                  </div>
                </div>
                <VerifyOnChain market={market} />
              </>
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-400 border border-gray-600">
                    off-chain
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Contract</span>
                  <a
                    href={`${EXPLORER_BASE_URL}/address/${PREDICTION_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-mono text-xs truncate max-w-[120px]"
                  >
                    {PREDICTION_CONTRACT_ADDRESS.slice(0, 10)}...
                  </a>
                </div>
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
                  This market is pending blockchain migration. Once migrated, you can verify all activity directly on Monad Mainnet.
                </div>
              </div>
            )}
          </div>

          {/* Recent Bets */}
          <div>
            <h2 className="font-semibold mb-3">Recent Bets</h2>
            {bets.length === 0 ? (
              <p className="text-gray-500 text-sm">No bets yet.</p>
            ) : (
              <div className="space-y-2">
                {bets.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-gray-900 rounded-lg p-3 border border-gray-800 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className={bet.position === "yes" ? "text-green-400" : "text-red-400"}>
                        {bet.position.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{bet.amount.toFixed(1)} TK</span>
                        {bet.txHash && (
                          <a
                            href={`${EXPLORER_BASE_URL}/tx/${bet.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                            title="View on explorer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {bet.createdAt?.seconds
                        ? new Date(bet.createdAt.seconds * 1000).toLocaleString()
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
