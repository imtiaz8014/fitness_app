import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";
import {getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getPredictionContract} from "./blockchain/contracts";
import {withTreasuryNonce} from "./blockchain/nonceManager";

const db = admin.firestore();

interface MigrationDetail {
  marketId: string;
  title: string;
  onChainId?: number;
  txHash?: string;
  status: "migrated" | "skipped" | "failed";
  reason?: string;
}

/**
 * One-time admin-only callable function to migrate existing Firestore markets
 * onto the TakaPrediction smart contract on Monad mainnet.
 *
 * Processes markets sequentially to avoid nonce conflicts.
 * Timeout set to 540s (max) since 17 on-chain txns may take a while.
 */
export const migrateMarketsOnChain = functions
  .runWith({timeoutSeconds: 540, memory: "512MB"})
  .https.onCall(async (_data, context) => {
    await requireAdmin(context);

    const snapshot = await db
      .collection("markets")
      .where("blockchainStatus", "!=", "confirmed")
      .get();

    if (snapshot.empty) {
      return {migrated: 0, skipped: 0, failed: 0, details: []};
    }

    const treasuryKey = await getTreasuryKey();
    const treasuryWallet = getWalletFromKey(treasuryKey);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;
    const details: MigrationDetail[] = [];

    const now = Math.floor(Date.now() / 1000);

    // Process sequentially to avoid nonce conflicts
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const title = data.title || "Untitled";
      const description = data.description || "";
      const deadlineTimestamp = data.deadline;

      // Get deadline as unix seconds
      const deadlineUnix = deadlineTimestamp?.seconds ?? 0;

      if (deadlineUnix <= now) {
        skipped++;
        details.push({
          marketId: doc.id,
          title,
          status: "skipped",
          reason: "Deadline is in the past",
        });
        functions.logger.warn("migrateMarketsOnChain: skipping past-deadline market", {
          marketId: doc.id,
          title,
          deadline: new Date(deadlineUnix * 1000).toISOString(),
        });
        continue;
      }

      try {
        let onChainId: number | null = null;
        const tx = await withTreasuryNonce(
          treasuryWallet.address,
          async (nonce) => {
            const prediction = getPredictionContract(treasuryWallet);
            const txResp = await prediction.createMarket(
              title,
              description,
              deadlineUnix,
              {nonce}
            );
            const receipt = await txResp.wait();

            // Parse MarketCreated event to get onChainId
            const event = receipt.logs
              .map((log: {topics: string[]; data: string}) => {
                try {
                  return prediction.interface.parseLog(log);
                } catch {
                  return null;
                }
              })
              .find((e: {name: string} | null) => e?.name === "MarketCreated");

            if (event) {
              onChainId = Number(event.args.marketId);
            }

            return txResp;
          }
        );

        const txHash = tx.hash;

        // Update Firestore doc with on-chain data
        await db.collection("markets").doc(doc.id).update({
          onChainId,
          txHash,
          blockchainStatus: "confirmed",
        });

        migrated++;
        details.push({
          marketId: doc.id,
          title,
          onChainId: onChainId ?? undefined,
          txHash,
          status: "migrated",
        });

        functions.logger.info("migrateMarketsOnChain: market migrated", {
          marketId: doc.id,
          title,
          onChainId,
          txHash,
        });
      } catch (err) {
        failed++;
        details.push({
          marketId: doc.id,
          title,
          status: "failed",
          reason: String(err),
        });

        functions.logger.error("migrateMarketsOnChain: market migration failed", {
          marketId: doc.id,
          title,
          error: String(err),
        });
      }
    }

    functions.logger.info("migrateMarketsOnChain: migration complete", {
      migrated,
      skipped,
      failed,
    });

    return {migrated, skipped, failed, details};
  });
