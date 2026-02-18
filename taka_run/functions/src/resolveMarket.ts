import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";

const db = admin.firestore();
const FEE_RATE = 0.02; // 2% platform fee

interface ResolveMarketData {
  marketId: string;
  outcome: boolean; // true = "yes", false = "no"
}

export const resolveMarket = functions.https.onCall(async (data, context) => {
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

    const totalPool = market.totalYesAmount + market.totalNoAmount;
    const winningPool = resolution === "yes" ? market.totalYesAmount : market.totalNoAmount;

    // Process each bet
    for (const betDoc of betsSnap.docs) {
      const bet = betDoc.data();
      const isWinner = bet.position === resolution;

      if (isWinner && winningPool > 0) {
        // Proportional share of total pool minus fee
        const share = bet.amount / winningPool;
        const grossPayout = share * totalPool;
        const payout = grossPayout * (1 - FEE_RATE);

        tx.update(betDoc.ref, {status: "won", payout});

        // Credit user balance
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

    // Update market
    tx.update(marketRef, {
      status: "resolved",
      resolution,
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return {success: true};
});
