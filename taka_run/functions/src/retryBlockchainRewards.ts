import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ethers} from "ethers";
import {getUserWalletAddress, getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getTkContract} from "./blockchain/contracts";

const db = admin.firestore();

/**
 * Scheduled function that retries failed on-chain reward transfers.
 * Runs every 15 minutes, picks up runs where blockchainStatus == "pending".
 */
export const retryBlockchainRewards = functions
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .pubsub.schedule("every 15 minutes")
  .onRun(async () => {
    functions.logger.info("retryBlockchainRewards: starting");

    const pendingRuns = await db
      .collection("runs")
      .where("blockchainStatus", "==", "pending")
      .where("status", "==", "validated")
      .limit(50)
      .get();

    if (pendingRuns.empty) {
      functions.logger.info("retryBlockchainRewards: no pending runs");
      return;
    }

    let treasuryKey: string;
    try {
      treasuryKey = await getTreasuryKey();
    } catch (err) {
      functions.logger.error("retryBlockchainRewards: treasury key unavailable", {
        error: String(err),
      });
      return;
    }

    const treasuryWallet = getWalletFromKey(treasuryKey);
    const tkContract = getTkContract(treasuryWallet);

    let succeeded = 0;
    let failed = 0;

    for (const runDoc of pendingRuns.docs) {
      const run = runDoc.data();
      try {
        const userAddress = await getUserWalletAddress(run.userId);
        const amount = ethers.parseEther(run.tkEarned.toString());
        const tx = await tkContract.transfer(userAddress, amount);
        await tx.wait();

        await runDoc.ref.update({
          txHash: tx.hash,
          blockchainStatus: "confirmed",
        });

        succeeded++;
        functions.logger.info("retryBlockchainRewards: succeeded", {
          runId: runDoc.id,
          txHash: tx.hash,
        });
      } catch (err) {
        failed++;
        functions.logger.error("retryBlockchainRewards: still failing", {
          runId: runDoc.id,
          userId: run.userId,
          error: String(err),
        });
      }
    }

    functions.logger.info("retryBlockchainRewards: completed", {succeeded, failed});
  });
