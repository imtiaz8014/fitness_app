import {ethers} from "ethers";

// Network config — Monad mainnet
const MONAD_RPC = "https://rpc.monad.xyz";
const CHAIN_ID = 143;

const TK_CONTRACT = "0x16ce50D6143E2dD33df3Ab1E4089cB5f51540Dc9";
// TakaPrediction mainnet address (deployed via BDT_coin/scripts/deploy-prediction.js)
// Update this after running: node scripts/deploy-prediction.js --network=monadMainnet
const PREDICTION_CONTRACT = process.env.PREDICTION_CONTRACT_MAINNET || "";

export const EXPLORER_BASE_URL = "https://monadexplorer.com";

export function getRpcUrl(): string {
  return MONAD_RPC;
}

export function getChainId(): number {
  return CHAIN_ID;
}

export function getTkAddress(): string {
  return TK_CONTRACT;
}

export function getPredictionAddress(): string {
  return PREDICTION_CONTRACT;
}

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(getRpcUrl(), {
    name: "monad",
    chainId: CHAIN_ID,
  });
}

// Minimal ERC20 ABI for TKCoin interactions
export const TK_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// TakaPrediction ABI
export const PREDICTION_ABI = [
  "function createMarket(string title, string description, uint256 deadline) returns (uint256)",
  "function resolveMarket(uint256 marketId, bool outcome)",
  "function cancelMarket(uint256 marketId)",
  "function closeMarket(uint256 marketId)",
  "function placeBet(uint256 marketId, bool isYes, uint256 amount)",
  "function claimWinnings(uint256 marketId)",
  "function refund(uint256 marketId)",
  "function getMarket(uint256 marketId) view returns (tuple(uint256 id, string title, string description, uint256 deadline, uint256 totalYesAmount, uint256 totalNoAmount, uint8 status, uint256 resolvedAt))",
  "function getUserBets(uint256 marketId, address user) view returns (uint256 yesBet, uint256 noBet)",
  "function calculatePayout(uint256 marketId, address user) view returns (uint256)",
  "function getOdds(uint256 marketId) view returns (uint256 yesPercent, uint256 noPercent)",
  "function getMarketBetCount(uint256 marketId) view returns (uint256)",
  "function nextMarketId() view returns (uint256)",
  "function platformFeeBps() view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, string title, uint256 deadline)",
  "event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount)",
  "event MarketResolved(uint256 indexed marketId, bool outcome)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout)",
  "event MarketCancelled(uint256 indexed marketId)",
];
