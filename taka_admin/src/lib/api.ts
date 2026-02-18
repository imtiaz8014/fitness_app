import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export async function callFunction<T>(name: string, data?: unknown): Promise<T> {
  const fn = httpsCallable(functions, name);
  const result = await fn(data);
  return result.data as T;
}

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
