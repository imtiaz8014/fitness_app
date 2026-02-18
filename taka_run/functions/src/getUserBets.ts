import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface GetUserBetsData {
  marketId?: string;
}

export const getUserBets = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const uid = context.auth.uid;
  const input = (data || {}) as GetUserBetsData;

  let q: admin.firestore.Query = db
    .collection("bets")
    .where("userId", "==", uid);

  if (input.marketId) {
    q = q.where("marketId", "==", input.marketId);
  }

  q = q.orderBy("createdAt", "desc").limit(100);

  const snap = await q.get();
  return snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
});
