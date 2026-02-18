import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {requireAdmin} from "./adminCheck";

const db = admin.firestore();

interface CreateMarketData {
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  deadline: string; // ISO date string
}

export const createMarket = functions.https.onCall(async (data, context) => {
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
  });

  return {marketId: marketRef.id};
});
