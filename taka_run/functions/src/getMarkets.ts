import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface GetMarketsData {
  status?: string;
  limit?: number;
  groupId?: string;
}

export const getMarkets = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const input = (data || {}) as GetMarketsData;

  let q: admin.firestore.Query = db.collection("markets");

  if (input.status) {
    q = q.where("status", "==", input.status);
  }

  if (input.groupId) {
    q = q.where("groupId", "==", input.groupId);
  }

  q = q.orderBy("createdAt", "desc").limit(input.limit || 50);

  const snap = await q.get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    // Strip createdBy to avoid leaking UIDs
    const {createdBy, ...rest} = d;
    return {id: doc.id, ...rest};
  });
});
