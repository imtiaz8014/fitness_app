import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ethers} from "ethers";
import {getUserWalletAddress, getTreasuryKey, getUserPrivateKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getTkContract, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";
import {withTreasuryNonce} from "./blockchain/nonceManager";

const db = admin.firestore();

const MAX_RETRIES = 10;

/**
 * Checks if a document should be retried based on exponential backoff.
 * Delay = min(2^retryCount * 60, 3600) seconds.
 */
function shouldRetryNow(
  retryCount: number,
  lastAttempt?: FirebaseFirestore.Timestamp
): boolean {
  if (!lastAttempt) return true;
  const delaySec = Math.min(Math.pow(2, retryCount) * 60, 3600);
  const nextRetryAt = lastAttempt.toMillis() + delaySec * 1000;
  return Date.now() >= nextRetryAt;
}

/**
 * Unified scheduled function that retries ALL failed blockchain operations:
 * - Runs with blockchainStatus == "pending" (treasury transfer)
 * - Bets with blockchainStatus == "pending" (approve + placeBet)
 * - Markets with blockchainStatus == "pending" (on-chain creation)
 * - Welcome bonuses (users with welcomeBonusPending == true)
 *
 * Features exponential backoff, max retries, sequential processing.
 */
export const retryBlockchainOps = functions
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .pubsub.schedule("every 15 minutes")
  .onRun(async () => {
    functions.logger.info("retryBlockchainOps: starting");

    let treasuryKey: string;
    try {
      treasuryKey = await getTreasuryKey();
    } catch (err) {
      functions.logger.error("retryBlockchainOps: treasury key unavailable", {
        error: String(err),
      });
      return;
    }

    const treasuryWallet = getWalletFromKey(treasuryKey);
    const stats = {runs: 0, bets: 0, markets: 0, bonuses: 0, abandoned: 0, skipped: 0};

    // --- 1. Retry pending run rewards ---
    const pendingRuns = await db
      .collection("runs")
      .where("blockchainStatus", "==", "pending")
      .where("status", "==", "validated")
      .limit(50)
      .get();

    for (const runDoc of pendingRuns.docs) {
      const run = runDoc.data();
      const retryCount = run.retryCount ?? 0;

      if (retryCount >= MAX_RETRIES) {
        await runDoc.ref.update({blockchainStatus: "abandoned"});
        stats.abandoned++;
        functions.logger.error("retryBlockchainOps: run abandoned after max retries", {
          runId: runDoc.id,
        });
        continue;
      }

      if (!shouldRetryNow(retryCount, run.lastRetryAt)) {
        stats.skipped++;
        continue;
      }

      try {
        const userAddress = await getUserWalletAddress(run.userId);
        const amount = ethers.parseEther(run.tkEarned.toString());

        const tx = await withTreasuryNonce(
          treasuryWallet.address,
          async (nonce) => {
            const tkContract = getTkContract(treasuryWallet);
            const txResp = await tkContract.transfer(userAddress, amount, {nonce});
            await txResp.wait();
            return txResp;
          }
        );

        await runDoc.ref.update({
          txHash: tx.hash,
          blockchainStatus: "confirmed",
        });
        stats.runs++;
      } catch (err) {
        await runDoc.ref.update({
          retryCount: retryCount + 1,
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.error("retryBlockchainOps: run retry failed", {
          runId: runDoc.id,
          retryCount: retryCount + 1,
          error: String(err),
        });
      }
    }

    // --- 2. Retry pending bets ---
    const pendingBets = await db
      .collection("bets")
      .where("blockchainStatus", "==", "pending")
      .limit(50)
      .get();

    for (const betDoc of pendingBets.docs) {
      const bet = betDoc.data();
      const retryCount = bet.retryCount ?? 0;

      if (retryCount >= MAX_RETRIES) {
        await betDoc.ref.update({blockchainStatus: "abandoned"});
        stats.abandoned++;
        continue;
      }

      if (!shouldRetryNow(retryCount, bet.lastRetryAt)) {
        stats.skipped++;
        continue;
      }

      // Get market data for onChainId
      const marketSnap = await db.collection("markets").doc(bet.marketId).get();
      const marketData = marketSnap.data();
      if (!marketData?.onChainId || !getPredictionAddress()) {
        stats.skipped++;
        continue;
      }

      try {
        const userKey = await getUserPrivateKey(bet.userId);
        const userWallet = getWalletFromKey(userKey);
        const tkContract = getTkContract(userWallet);
        const predictionContract = getPredictionContract(userWallet);
        const predictionAddr = getPredictionAddress();
        const amountWei = ethers.parseEther(bet.amount.toString());

        const approveTx = await tkContract.approve(predictionAddr, amountWei);
        await approveTx.wait();

        const betTx = await predictionContract.placeBet(
          marketData.onChainId,
          bet.position === "yes",
          amountWei
        );
        await betTx.wait();

        await betDoc.ref.update({
          txHash: betTx.hash,
          blockchainStatus: "confirmed",
        });
        stats.bets++;
      } catch (err) {
        await betDoc.ref.update({
          retryCount: retryCount + 1,
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.error("retryBlockchainOps: bet retry failed", {
          betId: betDoc.id,
          retryCount: retryCount + 1,
          error: String(err),
        });
      }
    }

    // --- 3. Retry pending market creations ---
    const pendingMarkets = await db
      .collection("markets")
      .where("blockchainStatus", "==", "pending")
      .limit(20)
      .get();

    for (const marketDoc of pendingMarkets.docs) {
      const market = marketDoc.data();
      const retryCount = market.retryCount ?? 0;

      if (retryCount >= MAX_RETRIES) {
        await marketDoc.ref.update({blockchainStatus: "abandoned"});
        stats.abandoned++;
        continue;
      }

      if (!shouldRetryNow(retryCount, market.lastRetryAt)) {
        stats.skipped++;
        continue;
      }

      if (!getPredictionAddress()) {
        stats.skipped++;
        continue;
      }

      try {
        const deadlineUnix = market.deadline?.seconds ?? 0;

        const tx = await withTreasuryNonce(
          treasuryWallet.address,
          async (nonce) => {
            const prediction = getPredictionContract(treasuryWallet);
            const txResp = await prediction.createMarket(
              market.title,
              market.description,
              deadlineUnix,
              {nonce}
            );
            const receipt = await txResp.wait();

            // Parse MarketCreated event
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
              await marketDoc.ref.update({onChainId: Number(event.args.marketId)});
            }

            return txResp;
          }
        );

        await marketDoc.ref.update({
          txHash: tx.hash,
          blockchainStatus: "confirmed",
        });
        stats.markets++;
      } catch (err) {
        await marketDoc.ref.update({
          retryCount: retryCount + 1,
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.error("retryBlockchainOps: market retry failed", {
          marketId: marketDoc.id,
          retryCount: retryCount + 1,
          error: String(err),
        });
      }
    }

    // --- 4. Retry welcome bonuses ---
    const pendingBonuses = await db
      .collection("users")
      .where("welcomeBonusPending", "==", true)
      .limit(50)
      .get();

    for (const userDoc of pendingBonuses.docs) {
      const userData = userDoc.data();
      const retryCount = userData.welcomeBonusRetryCount ?? 0;

      if (retryCount >= MAX_RETRIES) {
        await userDoc.ref.update({
          welcomeBonusPending: false,
          welcomeBonusStatus: "abandoned",
        });
        stats.abandoned++;
        continue;
      }

      if (!shouldRetryNow(retryCount, userData.welcomeBonusLastRetryAt)) {
        stats.skipped++;
        continue;
      }

      try {
        const walletAddress = userData.walletAddress;
        if (!walletAddress) {
          stats.skipped++;
          continue;
        }

        const {Constants} = await import("./constants");
        const amount = ethers.parseEther(Constants.welcomeBonusTk.toString());

        const tx = await withTreasuryNonce(
          treasuryWallet.address,
          async (nonce) => {
            const tkContract = getTkContract(treasuryWallet);
            const txResp = await tkContract.transfer(walletAddress, amount, {nonce});
            await txResp.wait();
            return txResp;
          }
        );

        await userDoc.ref.update({
          welcomeBonusPending: false,
          welcomeBonusTxHash: tx.hash,
        });
        stats.bonuses++;
      } catch (err) {
        await userDoc.ref.update({
          welcomeBonusRetryCount: retryCount + 1,
          welcomeBonusLastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        functions.logger.error("retryBlockchainOps: welcome bonus retry failed", {
          userId: userDoc.id,
          retryCount: retryCount + 1,
          error: String(err),
        });
      }
    }

    // --- 5. Retry pending claim payouts (from resolveMarket overflow) ---
    const pendingClaims = await db
      .collection("bets")
      .where("claimStatus", "==", "pending")
      .where("status", "==", "won")
      .limit(20)
      .get();

    let claimsProcessed = 0;
    const claimedUserMarkets = new Set<string>();

    for (const betDoc of pendingClaims.docs) {
      const bet = betDoc.data();
      const key = `${bet.userId}-${bet.marketId}`;
      if (claimedUserMarkets.has(key)) continue;
      claimedUserMarkets.add(key);

      const marketSnap = await db.collection("markets").doc(bet.marketId).get();
      const marketData = marketSnap.data();
      if (!marketData?.onChainId || !getPredictionAddress()) continue;

      try {
        const userKey = await getUserPrivateKey(bet.userId);
        const userWallet = getWalletFromKey(userKey);
        const userPrediction = getPredictionContract(userWallet);
        const claimTx = await userPrediction.claimWinnings(marketData.onChainId);
        await claimTx.wait();

        // Update all bets for this user+market
        const userBets = pendingClaims.docs.filter(
          (d) => d.data().userId === bet.userId && d.data().marketId === bet.marketId
        );
        for (const ub of userBets) {
          await ub.ref.update({claimStatus: "claimed", claimTxHash: claimTx.hash});
        }
        claimsProcessed++;
      } catch (err) {
        functions.logger.error("retryBlockchainOps: claim retry failed", {
          betId: betDoc.id,
          userId: bet.userId,
          error: String(err),
        });
      }
    }

    functions.logger.info("retryBlockchainOps: completed", {
      ...stats,
      claims: claimsProcessed,
    });
  });
