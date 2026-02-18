import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface GetMarketsData {
  status?: string;
  limit?: number;
}

export const getMarkets = functions.https.onCall(async (data) => {
  const input = (data || {}) as GetMarketsData;

  let q: admin.firestore.Query = db.collection("markets");

  if (input.status) {
    q = q.where("status", "==", input.status);
  }

  q = q.orderBy("createdAt", "desc").limit(input.limit || 50);

  const snap = await q.get();
  return snap.docs.map((doc) => ({id: doc.id, ...doc.data()}));
});
