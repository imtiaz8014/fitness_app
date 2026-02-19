import * as admin from "firebase-admin";

admin.initializeApp();

export {submitRun} from "./submitRun";
export {getBalance} from "./getBalance";
export {onUserCreated} from "./onUserCreated";
export {createMarket} from "./createMarket";
export {resolveMarket} from "./resolveMarket";
export {cancelMarket} from "./cancelMarket";
export {placeBet} from "./placeBet";
export {claimWinnings} from "./claimWinnings";
export {getUserBets} from "./getUserBets";
export {getMarkets} from "./getMarkets";
export {getMarketBets} from "./getMarketBets";
export {getLeaderboard} from "./getLeaderboard";
export {createMarketGroup} from "./createMarketGroup";
export {addComment} from "./addComment";
export {getPlatformStats} from "./getPlatformStats";
export {syncBalances} from "./syncBalances";
export {retryBlockchainOps} from "./retryBlockchainOps";
export {gasMonitor} from "./gasMonitor";
export {getTreasuryStatus} from "./getTreasuryStatus";
