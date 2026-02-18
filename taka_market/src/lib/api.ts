import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { Bet } from "./types";

export async function callFunction<T>(name: string, data?: unknown): Promise<T> {
  const fn = httpsCallable(functions, name);
  const result = await fn(data);
  return result.data as T;
}

// Market APIs
export const getMarkets = (filters?: {
  status?: string;
  limit?: number;
}) => callFunction<{ id: string; title: string; description: string; category: string; status: string; totalYesAmount: number; totalNoAmount: number; totalVolume: number }[]>("getMarkets", filters);

export const createMarket = (data: {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  deadline: string;
}) => callFunction<{ marketId: string }>("createMarket", data);

export const resolveMarket = (marketId: string, outcome: boolean) =>
  callFunction<{ success: boolean }>("resolveMarket", { marketId, outcome });

export const cancelMarket = (marketId: string) =>
  callFunction<{ success: boolean }>("cancelMarket", { marketId });

// Bet APIs
export const placeBet = (marketId: string, isYes: boolean, amount: number) =>
  callFunction<{ betId: string }>("placeBet", {
    marketId,
    isYes,
    amount,
  });

export const claimWinnings = (marketId: string) =>
  callFunction<{ payout: number }>("claimWinnings", {
    marketId,
  });

export const getUserBets = (marketId?: string) =>
  callFunction<Bet[]>("getUserBets", { marketId });

// Comments
export const addComment = (marketId: string, text: string) =>
  callFunction<{ commentId: string }>("addComment", { marketId, text });

// Platform Stats
export const getPlatformStats = () =>
  callFunction<{ totalMarkets: number; totalVolume: number; activeUsers: number; tkDistributed: number }>("getPlatformStats");

// Balance
export const getBalance = () =>
  callFunction<{ tkBalance: number; totalDistance: number; totalRuns: number; walletAddress: string | null }>("getBalance");
