import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const SUPER_ADMIN_EMAIL = "imtiaz8014@gmail.com";

/**
 * Bootstrap function: sets admin custom claim on the super admin account.
 * Can only be called by the super admin email itself.
 */
export const setAdminClaim = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be signed in."
    );
  }

  if (context.auth.token.email !== SUPER_ADMIN_EMAIL) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the super admin can call this."
    );
  }

  await admin.auth().setCustomUserClaims(context.auth.uid, {admin: true});

  return {success: true, message: "Admin claim set. Sign out and back in for it to take effect."};
});
