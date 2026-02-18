import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface PlaceBetData {
  marketId: string;
  isYes: boolean;
  amount: number;
}

export const placeBet = functions.https.onCall(async (data, context) => {
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

  return result;
});
