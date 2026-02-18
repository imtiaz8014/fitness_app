import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {Constants} from "./constants";

const db = admin.firestore();

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const walletAddress = "0x" + crypto.randomBytes(20).toString("hex");

  // Use merge: true to avoid overwriting if sibling project's trigger also fires
  await db.collection("users").doc(user.uid).set(
    {
      email: user.email || null,
      displayName: user.displayName || null,
      walletAddress,
      tkBalance: Constants.welcomeBonusTk,
      totalDistance: 0,
      totalRuns: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
});
