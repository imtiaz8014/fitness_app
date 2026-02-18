import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";

const db = admin.firestore();

interface CancelMarketData {
  marketId: string;
}

export const cancelMarket = functions.https.onCall(async (data, context) => {
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

  return {success: true};
});
