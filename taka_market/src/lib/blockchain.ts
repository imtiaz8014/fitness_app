import { ethers } from "ethers";

const MONAD_RPC = "https://rpc.monad.xyz";
const PREDICTION_CONTRACT = "0xd09742B0Ca9A810547E22f40301b580bD4f95888";

const PREDICTION_ABI = [
  "function getMarket(uint256) view returns (uint256 id, string title, string description, uint256 deadline, uint256 totalYesAmount, uint256 totalNoAmount, uint8 status, uint256 resolvedAt)",
  "function getOdds(uint256) view returns (uint256 yesPercent, uint256 noPercent)",
  "function getMarketBetCount(uint256) view returns (uint256)",
  "function nextMarketId() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, string title, uint256 deadline)",
  "event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount)",
  "event MarketResolved(uint256 indexed marketId, bool outcome)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout)",
  "event MarketCancelled(uint256 indexed marketId)",
];

export const PREDICTION_CONTRACT_ADDRESS = PREDICTION_CONTRACT;

export interface OnChainMarket {
  id: number;
  title: string;
  description: string;
  deadline: number;
  totalYesAmount: string;
  totalNoAmount: string;
  status: number; // 0=Open, 1=Closed, 2=Resolved, 3=Cancelled
  resolvedAt: number;
}

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(MONAD_RPC, {
    name: "monad",
    chainId: 143,
  });
}

function getContract(): ethers.Contract {
  return new ethers.Contract(PREDICTION_CONTRACT, PREDICTION_ABI, getProvider());
}

export async function getOnChainMarket(onChainId: number): Promise<OnChainMarket> {
  const contract = getContract();
  const result = await contract.getMarket(onChainId);
  return {
    id: Number(result.id),
    title: result.title,
    description: result.description,
    deadline: Number(result.deadline),
    totalYesAmount: ethers.formatEther(result.totalYesAmount),
    totalNoAmount: ethers.formatEther(result.totalNoAmount),
    status: Number(result.status),
    resolvedAt: Number(result.resolvedAt),
  };
}

export async function getOnChainOdds(onChainId: number): Promise<{ yesPercent: number; noPercent: number }> {
  const contract = getContract();
  const result = await contract.getOdds(onChainId);
  return {
    yesPercent: Number(result.yesPercent),
    noPercent: Number(result.noPercent),
  };
}

export async function getOnChainBetCount(onChainId: number): Promise<number> {
  const contract = getContract();
  const result = await contract.getMarketBetCount(onChainId);
  return Number(result);
}

export type ActivityEventType =
  | "MarketCreated"
  | "BetPlaced"
  | "MarketResolved"
  | "WinningsClaimed"
  | "MarketCancelled";

export interface OnChainEvent {
  type: ActivityEventType;
  txHash: string;
  blockNumber: number;
  timestamp: number; // unix seconds, 0 if unavailable
  args: Record<string, string | number | boolean>;
}

export async function getMarketActivity(onChainId: number): Promise<OnChainEvent[]> {
  const contract = getContract();
  const provider = getProvider();
  const marketIdTopic = ethers.zeroPadValue(ethers.toBeHex(onChainId), 32);

  // Query all event types filtered by marketId (indexed param)
  const eventNames: ActivityEventType[] = [
    "MarketCreated",
    "BetPlaced",
    "MarketResolved",
    "WinningsClaimed",
    "MarketCancelled",
  ];

  const allLogs: OnChainEvent[] = [];

  for (const name of eventNames) {
    const filter = contract.filters[name](onChainId);
    try {
      const logs = await contract.queryFilter(filter);
      for (const log of logs) {
        const parsed = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (!parsed) continue;

        let timestamp = 0;
        try {
          const block = await provider.getBlock(log.blockNumber);
          if (block) timestamp = block.timestamp;
        } catch {
          // timestamp stays 0
        }

        const args: Record<string, string | number | boolean> = {};
        for (const [key, val] of Object.entries(parsed.args)) {
          if (/^\d+$/.test(key)) continue; // skip positional keys
          if (typeof val === "bigint") {
            // Format amounts as ether, keep IDs as numbers
            args[key] = key.toLowerCase().includes("amount") || key === "payout"
              ? ethers.formatEther(val)
              : Number(val);
          } else {
            args[key] = val;
          }
        }

        allLogs.push({
          type: name,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp,
          args,
        });
      }
    } catch {
      // Skip events that fail to query (e.g., contract too new)
    }
  }

  // Sort by block number ascending
  allLogs.sort((a, b) => a.blockNumber - b.blockNumber);
  return allLogs;
}
