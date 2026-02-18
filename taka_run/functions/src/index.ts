import * as admin from "firebase-admin";

admin.initializeApp();

export {submitRun} from "./submitRun";
export {getBalance} from "./getBalance";
export {onUserCreated} from "./onUserCreated";
