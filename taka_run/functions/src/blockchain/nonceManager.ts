import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {ethers} from "ethers";
import {getProvider} from "./config";

const db = admin.firestore();

const LOCK_TTL_MS = 60_000; // 60 seconds
const MAX_RETRIES = 3;
const LOCK_DOC = "config/treasuryNonce";

/**
 * Acquires a Firestore-based distributed lock for the treasury nonce.
 * Returns true if lock acquired, false otherwise.
 */
async function acquireLock(lockId: string): Promise<boolean> {
  const ref = db.doc(LOCK_DOC);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (data?.lockId && data?.lockExpiry) {
        const expiry = data.lockExpiry.toMillis
          ? data.lockExpiry.toMillis()
          : data.lockExpiry;
        if (expiry > Date.now()) {
          throw new Error("lock-held");
        }
      }
      tx.set(
        ref,
        {
          lockId,
          lockExpiry: admin.firestore.Timestamp.fromMillis(
            Date.now() + LOCK_TTL_MS
          ),
        },
        {merge: true}
      );
    });
    return true;
  } catch (err) {
    if (String(err).includes("lock-held")) return false;
    throw err;
  }
}

/**
 * Releases the treasury nonce lock.
 */
async function releaseLock(lockId: string): Promise<void> {
  const ref = db.doc(LOCK_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.data()?.lockId === lockId) {
      tx.update(ref, {
        lockId: admin.firestore.FieldValue.delete(),
        lockExpiry: admin.firestore.FieldValue.delete(),
      });
    }
  });
}

/**
 * Wraps a treasury transaction callback with nonce management.
 *
 * - Acquires a Firestore-based lock on config/treasuryNonce
 * - Reads current nonce from chain, compares with stored nonce, uses the higher
 * - Passes the nonce to the callback
 * - Increments stored nonce on success, releases lock
 * - On nonce error, re-fetches from chain and retries (up to 3 times)
 */
export async function withTreasuryNonce<T>(
  treasuryAddress: string,
  callback: (nonce: number) => Promise<T>
): Promise<T> {
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Wait for lock with polling
  let lockAcquired = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    lockAcquired = await acquireLock(lockId);
    if (lockAcquired) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (!lockAcquired) {
    throw new Error("Failed to acquire treasury nonce lock after 60s");
  }

  try {
    let lastError: Error | null = null;

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
      try {
        // Get nonce from chain
        const provider = getProvider();
        const chainNonce = await provider.getTransactionCount(
          treasuryAddress,
          "pending"
        );

        // Get stored nonce
        const ref = db.doc(LOCK_DOC);
        const snap = await ref.get();
        const storedNonce = snap.data()?.nonce ?? 0;

        // Use whichever is higher
        const nonce = Math.max(chainNonce, storedNonce);

        functions.logger.info("withTreasuryNonce: using nonce", {
          chainNonce,
          storedNonce,
          nonce,
          retry,
        });

        const result = await callback(nonce);

        // Success: increment stored nonce
        await ref.set({nonce: nonce + 1}, {merge: true});

        return result;
      } catch (err) {
        lastError = err as Error;
        const errStr = String(err).toLowerCase();

        // Retry on nonce-related errors
        if (
          errStr.includes("nonce") ||
          errStr.includes("replacement transaction") ||
          errStr.includes("already known")
        ) {
          functions.logger.warn("withTreasuryNonce: nonce error, retrying", {
            retry,
            error: errStr,
          });
          // Brief delay before retry
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (retry + 1))
          );
          continue;
        }

        // Non-nonce error: don't retry
        throw err;
      }
    }

    throw lastError || new Error("withTreasuryNonce: max retries exceeded");
  } finally {
    await releaseLock(lockId).catch((err) => {
      functions.logger.error("withTreasuryNonce: failed to release lock", {
        error: String(err),
      });
    });
  }
}

/**
 * Helper to send a treasury transaction with nonce management.
 * Wraps ethers contract calls by overriding the nonce.
 */
export async function sendTreasuryTx(
  treasuryWallet: ethers.Wallet,
  txFn: (nonce: number) => Promise<ethers.TransactionResponse>
): Promise<ethers.TransactionResponse> {
  return withTreasuryNonce(treasuryWallet.address, async (nonce) => {
    const tx = await txFn(nonce);
    await tx.wait();
    return tx;
  });
}
