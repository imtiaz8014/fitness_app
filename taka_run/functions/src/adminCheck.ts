import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Verifies the caller is authenticated and has admin role.
 * Throws HttpsError if not.
 */
export async function requireAdmin(
  context: functions.https.CallableContext
): Promise<string> {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  const uid = context.auth.uid;
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required."
    );
  }

  return uid;
}
