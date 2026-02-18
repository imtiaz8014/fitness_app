import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {Constants} from "./constants";

const db = admin.firestore();

export const getBalance = functions.https.onCall(async (_data, context) => {
  functions.logger.info("getBalance called", {
    hasAuth: !!context?.auth,
    authUid: context?.auth?.uid ?? "NO_AUTH",
  });

  if (!context.auth) {
    functions.logger.error("getBalance: Auth is null — rejecting");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const uid = context.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    // Upsert: create profile for pre-existing user without a doc
    const walletAddress = "0x" + crypto.randomBytes(20).toString("hex");
    const newProfile = {
      email: context.auth.token.email || null,
      displayName: context.auth.token.name || null,
      walletAddress,
      tkBalance: Constants.welcomeBonusTk,
      totalDistance: 0,
      totalRuns: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await userRef.set(newProfile, {merge: true});
    return {
      tkBalance: Constants.welcomeBonusTk,
      totalDistance: 0,
      totalRuns: 0,
      walletAddress,
    };
  }

  const data = doc.data()!;
  return {
    tkBalance: data.tkBalance ?? 0,
    totalDistance: data.totalDistance ?? 0,
    totalRuns: data.totalRuns ?? 0,
    walletAddress: data.walletAddress ?? null,
  };
});
