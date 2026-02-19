import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ethers} from "ethers";
import {getUserPrivateKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getTkContract, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";

const db = admin.firestore();

interface PlaceBetData {
  marketId: string;
  isYes: boolean;
  amount: number;
}

export const placeBet = functions
  .runWith({timeoutSeconds: 120})
  .https.onCall(async (data, context) => {
  functions.logger.info("placeBet called", {
    hasAuth: !!context.auth,
    authUid: context.auth?.uid,
    data,
  });

  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in to place a bet."
    );
  }

  const uid = context.auth.uid;
  const input = data as PlaceBetData;

  if (!input.marketId || typeof input.isYes !== "boolean" || !input.amount) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "marketId, isYes (boolean), and amount are required."
    );
  }

  if (input.amount <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Bet amount must be positive."
    );
  }

  const position: "yes" | "no" = input.isYes ? "yes" : "no";

  try {
  const result = await db.runTransaction(async (tx) => {
    // Check market is open
    const marketRef = db.collection("markets").doc(input.marketId);
    const marketSnap = await tx.get(marketRef);

    if (!marketSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Market not found.");
    }

    const market = marketSnap.data()!;
    if (market.status !== "open") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Market is not open for betting."
      );
    }

    // Check user balance
    const userRef = db.collection("users").doc(uid);
    const userSnap = await tx.get(userRef);

    if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "User profile not found.");
    }

    const user = userSnap.data()!;
    if ((user.tkBalance || 0) < input.amount) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Insufficient TK balance."
      );
    }

    // Deduct balance
    tx.update(userRef, {
      tkBalance: admin.firestore.FieldValue.increment(-input.amount),
    });

    // Update market totals
    const updateField = position === "yes" ? "totalYesAmount" : "totalNoAmount";
    tx.update(marketRef, {
      [updateField]: admin.firestore.FieldValue.increment(input.amount),
      totalVolume: admin.firestore.FieldValue.increment(input.amount),
    });

    // Create bet doc
    const betRef = db.collection("bets").doc();
    tx.set(betRef, {
      userId: uid,
      marketId: input.marketId,
      position,
      amount: input.amount,
      status: "active",
      payout: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {betId: betRef.id};
  });

  // Step 2: On-chain bet if market has onChainId
  const marketSnap = await db.collection("markets").doc(input.marketId).get();
  const marketData = marketSnap.data();

  if (marketData?.onChainId != null && getPredictionAddress()) {
    try {
      const userKey = await getUserPrivateKey(uid);
      const userWallet = getWalletFromKey(userKey);
      const tkContract = getTkContract(userWallet);
      const predictionContract = getPredictionContract(userWallet);
      const predictionAddr = getPredictionAddress();
      const amountWei = ethers.parseEther(input.amount.toString());

      // Approve TK spending
      const approveTx = await tkContract.approve(predictionAddr, amountWei);
      await approveTx.wait();

      // Place bet on-chain
      const betTx = await predictionContract.placeBet(
        marketData.onChainId,
        input.isYes,
        amountWei
      );
      await betTx.wait();

      // Update bet doc with tx hash
      await db.collection("bets").doc(result.betId).update({
        txHash: betTx.hash,
        blockchainStatus: "confirmed",
      });

      functions.logger.info("Bet placed on-chain", {
        betId: result.betId,
        txHash: betTx.hash,
        onChainId: marketData.onChainId,
      });
    } catch (err) {
      // Firestore bet stands — syncBalances will correct drift
      await db.collection("bets").doc(result.betId).update({
        blockchainStatus: "failed",
      });
      functions.logger.error("On-chain bet failed", {
        betId: result.betId,
        error: String(err),
      });
    }
  }

  return result;
  } catch (err) {
    functions.logger.error("placeBet error", { error: String(err), stack: (err as Error).stack });
    throw err;
  }
});
