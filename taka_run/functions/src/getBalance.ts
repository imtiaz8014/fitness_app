import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {Constants} from "./constants";
import {createCustodialWallet, syncUserBalance} from "./blockchain/walletUtils";

const db = admin.firestore();

const BALANCE_STALE_MS = 5 * 60 * 1000; // 5 minutes

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
    // Create a real custodial wallet (lazy migration)
    const walletAddress = await createCustodialWallet(uid);
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

  // Lazy wallet migration: if user has no wallet doc, create one
  const walletDoc = await db.collection("wallets").doc(uid).get();
  let walletAddress = data.walletAddress;
  if (!walletDoc.exists) {
    try {
      walletAddress = await createCustodialWallet(uid);
    } catch (err) {
      functions.logger.error("Lazy wallet migration failed", {uid, error: String(err)});
    }
  }

  // Sync on-chain balance if cache is stale
  let tkBalance = data.tkBalance ?? 0;
  const lastSync = data.balanceSyncedAt?.toMillis?.() ?? 0;
  if (Date.now() - lastSync > BALANCE_STALE_MS && walletDoc.exists) {
    try {
      tkBalance = await syncUserBalance(uid);
    } catch (err) {
      functions.logger.error("Balance sync failed, using cached", {uid, error: String(err)});
    }
  }

  return {
    tkBalance,
    totalDistance: data.totalDistance ?? 0,
    totalRuns: data.totalRuns ?? 0,
    walletAddress: walletAddress ?? null,
  };
});
