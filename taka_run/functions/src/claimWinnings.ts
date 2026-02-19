import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getUserPrivateKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";

const db = admin.firestore();

interface ClaimWinningsData {
  marketId: string;
}

export const claimWinnings = functions
  .runWith({timeoutSeconds: 120})
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be signed in."
      );
    }

    const uid = context.auth.uid;
    const input = data as ClaimWinningsData;

    if (!input.marketId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "marketId is required."
      );
    }

    // Read-only: returns total payout for user's winning bets
    // (payouts already credited by resolveMarket)
    const betsSnap = await db
      .collection("bets")
      .where("userId", "==", uid)
      .where("marketId", "==", input.marketId)
      .where("status", "==", "won")
      .get();

    let totalPayout = 0;
    for (const betDoc of betsSnap.docs) {
      totalPayout += betDoc.data().payout || 0;
    }

    // On-chain claim fallback: if market has onChainId and user hasn't claimed yet
    let txHash: string | undefined;
    const marketDoc = await db.collection("markets").doc(input.marketId).get();
    const marketData = marketDoc.data();

    if (
      marketData?.onChainId != null &&
      getPredictionAddress() &&
      betsSnap.docs.length > 0
    ) {
      const hasClaimedOnChain = betsSnap.docs.some(
        (d) => d.data().claimTxHash
      );

      if (!hasClaimedOnChain) {
        try {
          const userKey = await getUserPrivateKey(uid);
          const userWallet = getWalletFromKey(userKey);
          const prediction = getPredictionContract(userWallet);

          const claimTx = await prediction.claimWinnings(marketData.onChainId);
          await claimTx.wait();
          txHash = claimTx.hash;

          for (const betDoc of betsSnap.docs) {
            await betDoc.ref.update({claimTxHash: claimTx.hash});
          }

          functions.logger.info("Manual claim on-chain", {
            userId: uid,
            marketId: input.marketId,
            txHash: claimTx.hash,
          });
        } catch (err) {
          functions.logger.error("Manual on-chain claim failed", {
            userId: uid,
            marketId: input.marketId,
            error: String(err),
          });
        }
      }
    }

    return {payout: totalPayout, txHash};
  });
