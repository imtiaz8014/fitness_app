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
