import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface AddCommentData {
  marketId: string;
  text: string;
}

export const addComment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in to comment."
    );
  }

  const uid = context.auth.uid;
  const input = data as AddCommentData;

  if (!input.marketId || typeof input.text !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "marketId and text are required."
    );
  }

  const text = input.text.trim();
  if (text.length === 0 || text.length > 500) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Comment must be between 1 and 500 characters."
    );
  }

  // Verify market exists
  const marketSnap = await db.collection("markets").doc(input.marketId).get();
  if (!marketSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Market not found.");
  }

  // Get user's display name
  const userSnap = await db.collection("users").doc(uid).get();
  const displayName = userSnap.exists
    ? userSnap.data()?.displayName || "Anonymous"
    : "Anonymous";

  const commentRef = db.collection("comments").doc();
  await commentRef.set({
    marketId: input.marketId,
    userId: uid,
    displayName,
    text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {commentId: commentRef.id};
});
