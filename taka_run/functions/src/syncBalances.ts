import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getTkBalance} from "./blockchain/contracts";

const db = admin.firestore();
const BATCH_SIZE = 50;

/**
 * Check if a user has any pending blockchain operations.
 * If so, on-chain balance doesn't reflect pending transfers yet — skip sync.
 */
async function hasPendingOps(userId: string): Promise<boolean> {
  // Check pending runs
  const pendingRuns = await db
    .collection("runs")
    .where("userId", "==", userId)
    .where("blockchainStatus", "==", "pending")
    .limit(1)
    .get();
  if (!pendingRuns.empty) return true;

  // Check pending bets
  const pendingBets = await db
    .collection("bets")
    .where("userId", "==", userId)
    .where("blockchainStatus", "==", "pending")
    .limit(1)
    .get();
  if (!pendingBets.empty) return true;

  return false;
}

/**
 * Scheduled function that syncs on-chain TK balances for all users with wallets.
 * Runs every 60 minutes to correct any drift between Firestore and on-chain state.
 * Skips users with pending blockchain operations to avoid overwriting optimistic balances.
 */
export const syncBalances = functions
  .runWith({timeoutSeconds: 540, memory: "512MB"})
  .pubsub.schedule("every 60 minutes")
  .onRun(async () => {
    functions.logger.info("syncBalances: starting scheduled sync");

    let lastDoc: FirebaseFirestore.DocumentSnapshot | undefined;
    let totalSynced = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

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
          // Skip users with pending blockchain operations
          if (await hasPendingOps(userId)) {
            totalSkipped++;
            return;
          }

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
          await db.collection("users").doc(userId).set(
            {lastSyncError: String(err)},
            {merge: true}
          );
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

    functions.logger.info("syncBalances: completed", {
      totalSynced,
      totalErrors,
      totalSkipped,
    });
  });
