import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";
import {getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";
import {withTreasuryNonce} from "./blockchain/nonceManager";

const db = admin.firestore();

interface CreateMarketData {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  deadline: string; // ISO date string
  groupId?: string | null;
  groupTitle?: string | null;
}

export const createMarket = functions
  .runWith({timeoutSeconds: 120})
  .https.onCall(async (data, context) => {
    const uid = await requireAdmin(context);
    const input = data as CreateMarketData;

    if (!input.title || !input.description || !input.category || !input.deadline) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "title, description, category, and deadline are required."
      );
    }

    const deadlineDate = new Date(input.deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Deadline must be a valid future date."
      );
    }

    const deadlineUnix = Math.floor(deadlineDate.getTime() / 1000);

    // Try to create market on-chain first
    let onChainId: number | null = null;
    let txHash: string | null = null;
    let blockchainStatus = "pending";

    if (getPredictionAddress()) {
      try {
        const treasuryKey = await getTreasuryKey();
        const treasuryWallet = getWalletFromKey(treasuryKey);

        const tx = await withTreasuryNonce(
          treasuryWallet.address,
          async (nonce) => {
            const prediction = getPredictionContract(treasuryWallet);
            const txResp = await prediction.createMarket(
              input.title,
              input.description,
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

        txHash = tx.hash;
        blockchainStatus = "confirmed";

        functions.logger.info("Market created on-chain", {onChainId, txHash});
      } catch (err) {
        functions.logger.error("On-chain market creation failed", {
          error: String(err),
        });
        blockchainStatus = "pending";
      }
    } else {
      blockchainStatus = "off-chain";
    }

    const marketRef = db.collection("markets").doc();
    await marketRef.set({
      title: input.title,
      description: input.description,
      category: input.category,
      imageUrl: input.imageUrl || null,
      status: "open",
      resolution: null,
      createdBy: uid,
      totalYesAmount: 0,
      totalNoAmount: 0,
      totalVolume: 0,
      deadline: admin.firestore.Timestamp.fromDate(deadlineDate),
      resolvedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      groupId: input.groupId || null,
      groupTitle: input.groupTitle || null,
      onChainId,
      txHash,
      blockchainStatus,
    });

    return {marketId: marketRef.id, onChainId, txHash};
  });
