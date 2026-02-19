import * as functions from "firebase-functions";

const SUPER_ADMIN_EMAIL = "imtiaz8014@gmail.com";

/**
 * Verifies the caller is authenticated and has admin custom claim.
 * Falls back to checking the super admin email for bootstrapping.
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
  const token = context.auth.token;

  // Check custom claim first, fall back to super admin email
  if (token.admin === true || token.email === SUPER_ADMIN_EMAIL) {
    return uid;
  }

  throw new functions.https.HttpsError(
    "permission-denied",
    "Admin access required."
  );
}
