import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";

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

export const createMarketGroup = functions.https.onCall(
  async (data, context) => {
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

    const groupId = db.collection("markets").doc().id;
    const batch = db.batch();
    const marketIds: string[] = [];

    for (const m of input.markets) {
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
      });
    }

    await batch.commit();
    return {groupId, marketIds};
  }
);
