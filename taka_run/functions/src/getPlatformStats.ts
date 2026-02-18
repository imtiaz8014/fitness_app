import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const getPlatformStats = functions.https.onCall(async () => {
  const [marketsSnap, usersSnap] = await Promise.all([
    db.collection("markets").get(),
    db.collection("users").get(),
  ]);

  let totalVolume = 0;
  let tkDistributed = 0;

  marketsSnap.docs.forEach((doc) => {
    const data = doc.data();
    totalVolume += data.totalVolume || 0;
  });

  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    tkDistributed += data.tkBalance || 0;
  });

  return {
    totalMarkets: marketsSnap.size,
    totalVolume: Math.round(totalVolume),
    activeUsers: usersSnap.size,
    tkDistributed: Math.round(tkDistributed),
  };
});
