import { Timestamp } from "firebase/firestore";

export interface Market {
  id: string;
  onChainId?: number;
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  status: "open" | "closed" | "resolved" | "cancelled";
  resolution: "yes" | "no" | null;
  createdBy: string;
  totalYesAmount: number;
  totalNoAmount: number;
  totalVolume: number;
  deadline: Timestamp;
  resolvedAt: Timestamp | null;
  createdAt: Timestamp;
  txHash?: string;
}
