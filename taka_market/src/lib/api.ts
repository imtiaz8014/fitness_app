import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { Market, Bet } from "./types";

export async function callFunction<T>(name: string, data?: unknown): Promise<T> {
  const fn = httpsCallable(functions, name);
  const result = await fn(data);
  return result.data as T;
}

// Market APIs
export const getMarkets = (filters?: {
  status?: string;
  category?: string;
  limit?: number;
}) => callFunction<Market[]>("getMarkets", filters);

export const createMarket = (data: {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  deadline: string;
}) => callFunction<{ marketId: string; txHash: string }>("createMarket", data);

export const resolveMarket = (marketId: string, outcome: boolean) =>
  callFunction<{ txHash: string }>("resolveMarket", { marketId, outcome });

export const cancelMarket = (marketId: string) =>
  callFunction<{ txHash: string }>("cancelMarket", { marketId });

// Bet APIs
export const placeBet = (marketId: string, isYes: boolean, amount: number) =>
  callFunction<{ betId: string; txHash: string }>("placeBet", {
    marketId,
    isYes,
    amount,
  });

export const claimWinnings = (marketId: string) =>
  callFunction<{ payout: number; txHash: string }>("claimWinnings", {
    marketId,
  });

export const getUserBets = (marketId?: string) =>
  callFunction<Bet[]>("getUserBets", { marketId });

// Balance
export const getBalance = () =>
  callFunction<{ balance: string; address: string }>("getBalance");
