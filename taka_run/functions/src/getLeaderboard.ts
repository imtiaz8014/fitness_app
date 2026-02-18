import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface GetLeaderboardData {
  field?: "tkBalance" | "totalDistance" | "totalRuns";
  limit?: number;
}

/**
 * Returns leaderboard data using Admin SDK (bypasses security rules).
 * Strips sensitive fields (email, walletAddress, role) from the response.
 */
export const getLeaderboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const input = (data || {}) as GetLeaderboardData;
  const sortField = input.field || "tkBalance";
  const resultLimit = Math.min(input.limit || 50, 100);

  // Validate sort field
  const allowedFields = ["tkBalance", "totalDistance", "totalRuns"];
  if (!allowedFields.includes(sortField)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Invalid sort field. Must be one of: ${allowedFields.join(", ")}`
    );
  }

  const snap = await db
    .collection("users")
    .orderBy(sortField, "desc")
    .limit(resultLimit)
    .get();

  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      uid: doc.id,
      displayName: d.displayName || "Anonymous",
      tkBalance: d.tkBalance || 0,
      totalDistance: d.totalDistance || 0,
      totalRuns: d.totalRuns || 0,
    };
  });
});
