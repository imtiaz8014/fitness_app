import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

// In-memory cache for secrets (lives for the function instance lifetime)
const secretCache = new Map<string, string>();

/**
 * Retrieves a secret value. Tries Google Cloud Secret Manager first,
 * falls back to Firestore config/app.{name}.
 *
 * Results are cached in-memory for the function instance lifetime.
 */
export async function getSecret(name: string): Promise<string> {
  // Check cache first
  const cached = secretCache.get(name);
  if (cached) return cached;

  // Try Google Cloud Secret Manager
  try {
    const {SecretManagerServiceClient} = await import(
      "@google-cloud/secret-manager"
    );
    const client = new SecretManagerServiceClient();
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (projectId) {
      const [version] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${name}/versions/latest`,
      });
      const payload = version.payload?.data;
      if (payload) {
        const value =
          typeof payload === "string"
            ? payload
            : Buffer.from(payload).toString("utf8");
        secretCache.set(name, value);
        functions.logger.info("getSecret: loaded from Secret Manager", {name});
        return value;
      }
    }
  } catch (err) {
    // Secret Manager not available or secret not found — fall back to Firestore
    functions.logger.warn("getSecret: Secret Manager fallback to Firestore", {
      name,
      error: String(err),
    });
  }

  // Fallback: read from Firestore config/app
  const configDoc = await db.collection("config").doc("app").get();
  const value = configDoc.data()?.[name];
  if (!value) {
    throw new Error(`Secret "${name}" not found in Secret Manager or Firestore`);
  }

  secretCache.set(name, value);
  functions.logger.info("getSecret: loaded from Firestore fallback", {name});
  return value;
}
