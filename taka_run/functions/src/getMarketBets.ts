import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface GetMarketBetsData {
  marketId: string;
}

/**
 * Returns recent bets for a market with anonymized data (no userId).
 * Requires authentication.
 */
export const getMarketBets = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const input = data as GetMarketBetsData;

  if (!input.marketId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "marketId is required."
    );
  }

  const snap = await db
    .collection("bets")
    .where("marketId", "==", input.marketId)
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      position: d.position,
      amount: d.amount,
      status: d.status,
      createdAt: d.createdAt,
    };
  });
});
