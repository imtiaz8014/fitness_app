import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getTkBalance} from "./blockchain/contracts";

const db = admin.firestore();
const BATCH_SIZE = 50;

/**
 * Scheduled function that syncs on-chain TK balances for all users with wallets.
 * Runs every 60 minutes to correct any drift between Firestore and on-chain state.
 */
export const syncBalances = functions
  .runWith({timeoutSeconds: 540, memory: "512MB"})
  .pubsub.schedule("every 60 minutes")
  .onRun(async () => {
    functions.logger.info("syncBalances: starting scheduled sync");

    let lastDoc: FirebaseFirestore.DocumentSnapshot | undefined;
    let totalSynced = 0;
    let totalErrors = 0;

    while (true) {
      let q: FirebaseFirestore.Query = db
        .collection("wallets")
        .orderBy("createdAt")
        .limit(BATCH_SIZE);

      if (lastDoc) {
        q = q.startAfter(lastDoc);
      }

      const snap = await q.get();
      if (snap.empty) break;

      const promises = snap.docs.map(async (walletDoc) => {
        const userId = walletDoc.id;
        const address = walletDoc.data().address;
        if (!address) return;

        try {
          const balanceStr = await getTkBalance(address);
          const balance = parseFloat(balanceStr);

          await db.collection("users").doc(userId).set(
            {
              tkBalance: balance,
              balanceSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            {merge: true}
          );
          totalSynced++;
        } catch (err) {
          totalErrors++;
          functions.logger.error("syncBalances: failed for user", {
            userId,
            address,
            error: String(err),
          });
        }
      });

      await Promise.all(promises);
      lastDoc = snap.docs[snap.docs.length - 1];
    }

    functions.logger.info("syncBalances: completed", {totalSynced, totalErrors});
  });
