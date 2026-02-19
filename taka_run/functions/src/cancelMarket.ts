import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";
import {getTreasuryKey, getUserPrivateKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";

const db = admin.firestore();

interface CancelMarketData {
  marketId: string;
}

export const cancelMarket = functions
  .runWith({timeoutSeconds: 300})
  .https.onCall(async (data, context) => {
    await requireAdmin(context);
    const input = data as CancelMarketData;

    if (!input.marketId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "marketId is required."
      );
    }

    await db.runTransaction(async (tx) => {
      const marketRef = db.collection("markets").doc(input.marketId);
      const marketSnap = await tx.get(marketRef);

      if (!marketSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Market not found.");
      }

      const market = marketSnap.data()!;
      if (market.status !== "open" && market.status !== "closed") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `Market status is "${market.status}", cannot cancel.`
        );
      }

      // Get all bets for this market
      const betsSnap = await tx.get(
        db.collection("bets").where("marketId", "==", input.marketId)
      );

      // Refund each bet
      for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        tx.update(betDoc.ref, {status: "refunded", payout: bet.amount});

        // Credit refund back to user
        const userRef = db.collection("users").doc(bet.userId);
        tx.set(
          userRef,
          {tkBalance: admin.firestore.FieldValue.increment(bet.amount)},
          {merge: true}
        );
      }

      // Update market
      tx.update(marketRef, {
        status: "cancelled",
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // On-chain cancellation + refunds
    const marketDoc = await db.collection("markets").doc(input.marketId).get();
    const marketData = marketDoc.data();

    if (marketData?.onChainId != null && getPredictionAddress()) {
      try {
        const treasuryKey = await getTreasuryKey();
        const treasuryWallet = getWalletFromKey(treasuryKey);
        const prediction = getPredictionContract(treasuryWallet);

        const cancelTx = await prediction.cancelMarket(marketData.onChainId);
        await cancelTx.wait();

        await marketDoc.ref.update({resolveTxHash: cancelTx.hash});

        functions.logger.info("Market cancelled on-chain", {
          marketId: input.marketId,
          txHash: cancelTx.hash,
        });

        // Auto-refund each bettor on-chain
        const betsSnap = await db
          .collection("bets")
          .where("marketId", "==", input.marketId)
          .where("status", "==", "refunded")
          .get();

        const refundedUserIds = new Set<string>();
        for (const betDoc of betsSnap.docs) {
          const bet = betDoc.data();
          if (refundedUserIds.has(bet.userId)) continue;
          refundedUserIds.add(bet.userId);

          try {
            const userKey = await getUserPrivateKey(bet.userId);
            const userWallet = getWalletFromKey(userKey);
            const userPrediction = getPredictionContract(userWallet);

            const refundTx = await userPrediction.refund(marketData.onChainId);
            await refundTx.wait();

            // Update all bets for this user
            const userBets = betsSnap.docs.filter(
              (d) => d.data().userId === bet.userId
            );
            for (const ub of userBets) {
              await ub.ref.update({claimTxHash: refundTx.hash});
            }

            functions.logger.info("Auto-refund on-chain", {
              userId: bet.userId,
              txHash: refundTx.hash,
            });
          } catch (err) {
            functions.logger.error("Auto-refund failed for user", {
              userId: bet.userId,
              error: String(err),
            });
          }
        }
      } catch (err) {
        functions.logger.error("On-chain market cancellation failed", {
          marketId: input.marketId,
          error: String(err),
        });
      }
    }

    return {success: true};
  });
