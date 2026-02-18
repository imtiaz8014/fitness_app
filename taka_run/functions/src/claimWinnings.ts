import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ClaimWinningsData {
  marketId: string;
}

export const claimWinnings = functions.https.onCall(async (data, context) => {
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

  return {payout: totalPayout};
});
