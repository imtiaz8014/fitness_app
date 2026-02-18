import { Timestamp } from "firebase/firestore";

export interface Market {
  id: string;
  onChainId: number;
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
  txHash: string;
}

export interface Bet {
  id: string;
  userId: string;
  marketId: string;
  position: "yes" | "no";
  amount: number;
  status: "active" | "won" | "lost" | "refunded";
  payout: number;
  txHash: string;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  walletAddress: string | null;
  tkBalance: number;
  totalDistance: number;
  totalRuns: number;
}

export interface RunRecord {
  id: string;
  userId: string;
  distance: number;
  duration: number;
  pace: number;
  tkEarned: number;
  status: "pending" | "validated" | "rejected";
  rejectionReason?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  createdAt: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  tkBalance: number;
  totalDistance: number;
  totalRuns: number;
}
