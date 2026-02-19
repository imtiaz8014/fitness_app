import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";
import {getTreasuryKey, getUserPrivateKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";
import {withTreasuryNonce} from "./blockchain/nonceManager";

const db = admin.firestore();
const FEE_RATE = 0.02; // 2% platform fee
const MAX_INLINE_CLAIMS = 20;

interface ResolveMarketData {
  marketId: string;
  outcome: boolean; // true = "yes", false = "no"
}

export const resolveMarket = functions
  .runWith({timeoutSeconds: 300})
  .https.onCall(async (data, context) => {
  functions.logger.info("resolveMarket called", {
    hasAuth: !!context.auth,
    authUid: context.auth?.uid,
    data,
  });

  try {
    await requireAdmin(context);
    const input = data as ResolveMarketData;

    if (!input.marketId || typeof input.outcome !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "marketId and outcome (boolean) are required."
      );
    }

    const resolution: "yes" | "no" = input.outcome ? "yes" : "no";

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
          `Market status is "${market.status}", cannot resolve.`
        );
      }

      // Get all bets for this market
      const betsSnap = await tx.get(
        db.collection("bets").where("marketId", "==", input.marketId)
      );

      functions.logger.info("resolveMarket transaction", {
        marketId: input.marketId,
        resolution,
        betsCount: betsSnap.size,
        totalYesAmount: market.totalYesAmount,
        totalNoAmount: market.totalNoAmount,
      });

      const totalPool = market.totalYesAmount + market.totalNoAmount;
      const winningPool = resolution === "yes" ? market.totalYesAmount : market.totalNoAmount;

      // Process each bet
      for (const betDoc of betsSnap.docs) {
        const bet = betDoc.data();
        const isWinner = bet.position === resolution;

        if (isWinner && winningPool > 0) {
          const share = bet.amount / winningPool;
          const grossPayout = share * totalPool;
          const payout = grossPayout * (1 - FEE_RATE);

          tx.update(betDoc.ref, {status: "won", payout});

          const userRef = db.collection("users").doc(bet.userId);
          tx.set(
            userRef,
            {tkBalance: admin.firestore.FieldValue.increment(payout)},
            {merge: true}
          );
        } else {
          tx.update(betDoc.ref, {status: "lost", payout: 0});
        }
      }

      tx.update(marketRef, {
        status: "resolved",
        resolution,
        resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Step 2: On-chain resolution if market has onChainId
    const marketDoc = await db.collection("markets").doc(input.marketId).get();
    const marketData = marketDoc.data();

    if (marketData?.onChainId != null && getPredictionAddress()) {
      try {
        const treasuryKey = await getTreasuryKey();
        const treasuryWallet = getWalletFromKey(treasuryKey);

        const resolveTx = await withTreasuryNonce(
          treasuryWallet.address,
          async (nonce) => {
            const prediction = getPredictionContract(treasuryWallet);
            const txResp = await prediction.resolveMarket(
              marketData!.onChainId,
              input.outcome,
              {nonce}
            );
            await txResp.wait();
            return txResp;
          }
        );

        await marketDoc.ref.update({resolveTxHash: resolveTx.hash});

        functions.logger.info("Market resolved on-chain", {
          marketId: input.marketId,
          resolveTxHash: resolveTx.hash,
        });

        // Step 3: Auto-claim for winners (capped at MAX_INLINE_CLAIMS)
        const winningBets = await db
          .collection("bets")
          .where("marketId", "==", input.marketId)
          .where("status", "==", "won")
          .get();

        // Deduplicate by userId
        const uniqueWinners: {userId: string; betDocs: FirebaseFirestore.QueryDocumentSnapshot[]}[] = [];
        const seenUsers = new Set<string>();
        for (const betDoc of winningBets.docs) {
          const bet = betDoc.data();
          if (seenUsers.has(bet.userId)) {
            // Add to existing entry
            const entry = uniqueWinners.find((w) => w.userId === bet.userId);
            if (entry) entry.betDocs.push(betDoc);
            continue;
          }
          seenUsers.add(bet.userId);
          uniqueWinners.push({userId: bet.userId, betDocs: [betDoc]});
        }

        // Claim first MAX_INLINE_CLAIMS winners inline
        const inlineClaims = uniqueWinners.slice(0, MAX_INLINE_CLAIMS);
        const deferredClaims = uniqueWinners.slice(MAX_INLINE_CLAIMS);

        for (const winner of inlineClaims) {
          try {
            const userKey = await getUserPrivateKey(winner.userId);
            const userWallet = getWalletFromKey(userKey);
            const userPrediction = getPredictionContract(userWallet);
            const claimTx = await userPrediction.claimWinnings(marketData!.onChainId);
            await claimTx.wait();

            for (const ub of winner.betDocs) {
              await ub.ref.update({claimTxHash: claimTx.hash, claimStatus: "claimed"});
            }
          } catch (err) {
            functions.logger.error("Auto-claim failed for user", {
              userId: winner.userId,
              error: String(err),
            });
          }
        }

        // Mark remaining winners as pending for retryBlockchainOps
        if (deferredClaims.length > 0) {
          functions.logger.info("Deferring claims for retryBlockchainOps", {
            count: deferredClaims.length,
          });
          for (const winner of deferredClaims) {
            for (const ub of winner.betDocs) {
              await ub.ref.update({claimStatus: "pending"});
            }
          }
        }
      } catch (err) {
        functions.logger.error("On-chain market resolution failed", {
          marketId: input.marketId,
          error: String(err),
        });
      }
    }

    return {success: true};
  } catch (err) {
    functions.logger.error("resolveMarket error", {
      error: String(err),
      stack: (err as Error).stack,
    });
    throw err;
  }
});
