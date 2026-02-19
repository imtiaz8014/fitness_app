import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";
import {getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getPredictionContract} from "./blockchain/contracts";
import {getPredictionAddress} from "./blockchain/config";
import {withTreasuryNonce} from "./blockchain/nonceManager";

const db = admin.firestore();

interface MarketOutcome {
  title: string;
  deadline: string; // ISO date string
}

interface CreateMarketGroupData {
  groupTitle: string;
  description: string;
  category: string;
  markets: MarketOutcome[];
}

export const createMarketGroup = functions
  .runWith({timeoutSeconds: 300})
  .https.onCall(async (data, context) => {
    const uid = await requireAdmin(context);
    const input = data as CreateMarketGroupData;

    if (!input.groupTitle || !input.description || !input.category) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "groupTitle, description, and category are required."
      );
    }

    if (!input.markets || input.markets.length < 2) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "At least 2 market outcomes are required for a group."
      );
    }

    // Validate all deadlines
    for (const m of input.markets) {
      if (!m.title || !m.deadline) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Each market outcome must have a title and deadline."
        );
      }
      const d = new Date(m.deadline);
      if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Deadline for "${m.title}" must be a valid future date.`
        );
      }
    }

    // Try to create each sub-market on-chain sequentially with nonce management
    let treasuryWallet: ReturnType<typeof getWalletFromKey> | undefined;
    const hasBlockchain = !!getPredictionAddress();

    if (hasBlockchain) {
      try {
        const treasuryKey = await getTreasuryKey();
        treasuryWallet = getWalletFromKey(treasuryKey);
      } catch (err) {
        functions.logger.error("Failed to initialize blockchain for group", {
          error: String(err),
        });
      }
    }

    const groupId = db.collection("markets").doc().id;
    const batch = db.batch();
    const marketIds: string[] = [];

    for (const m of input.markets) {
      let onChainId: number | null = null;
      let txHash: string | null = null;
      let blockchainStatus = hasBlockchain ? "pending" : "off-chain";

      if (treasuryWallet) {
        try {
          const deadlineUnix = Math.floor(new Date(m.deadline).getTime() / 1000);

          const tx = await withTreasuryNonce(
            treasuryWallet.address,
            async (nonce) => {
              const prediction = getPredictionContract(treasuryWallet!);
              const txResp = await prediction.createMarket(
                m.title,
                input.description,
                deadlineUnix,
                {nonce}
              );
              const receipt = await txResp.wait();

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
        } catch (err) {
          functions.logger.error("On-chain group sub-market creation failed", {
            title: m.title,
            error: String(err),
          });
        }
      }

      const ref = db.collection("markets").doc();
      marketIds.push(ref.id);
      batch.set(ref, {
        title: m.title,
        description: input.description,
        category: input.category,
        imageUrl: null,
        status: "open",
        resolution: null,
        createdBy: uid,
        totalYesAmount: 0,
        totalNoAmount: 0,
        totalVolume: 0,
        deadline: admin.firestore.Timestamp.fromDate(new Date(m.deadline)),
        resolvedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        groupId,
        groupTitle: input.groupTitle,
        onChainId,
        txHash,
        blockchainStatus,
      });
    }

    await batch.commit();
    return {groupId, marketIds};
  });
