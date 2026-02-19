import {ethers} from "ethers";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {getTkBalance} from "./contracts";

const db = admin.firestore();

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

async function getEncryptionKey(): Promise<Buffer> {
  const configDoc = await db.collection("config").doc("app").get();
  const key = configDoc.data()?.walletEncryptionKey;
  if (!key) throw new Error("Wallet encryption key not configured");
  return Buffer.from(key, "hex");
}

function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Creates a custodial wallet for a user.
 * Returns the wallet address. Private key is stored encrypted in Firestore.
 */
export async function createCustodialWallet(
  userId: string
): Promise<string> {
  // Check if wallet already exists
  const existing = await db.collection("wallets").doc(userId).get();
  if (existing.exists) {
    return existing.data()!.address;
  }

  const wallet = ethers.Wallet.createRandom();
  const encryptionKey = await getEncryptionKey();
  const encryptedPrivateKey = encrypt(wallet.privateKey, encryptionKey);

  await db.collection("wallets").doc(userId).set({
    address: wallet.address,
    encryptedPrivateKey,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update user profile with real wallet address
  await db.collection("users").doc(userId).set(
    {walletAddress: wallet.address},
    {merge: true}
  );

  return wallet.address;
}

/**
 * Get user's decrypted private key for server-side signing.
 */
export async function getUserPrivateKey(userId: string): Promise<string> {
  const doc = await db.collection("wallets").doc(userId).get();
  if (!doc.exists) throw new Error("Wallet not found for user " + userId);

  const data = doc.data()!;

  // Handle unencrypted legacy keys (pre-migration)
  if (data.privateKey && !data.encryptedPrivateKey) {
    return data.privateKey;
  }

  const encryptionKey = await getEncryptionKey();
  return decrypt(data.encryptedPrivateKey, encryptionKey);
}

/**
 * Get user's wallet address.
 */
export async function getUserWalletAddress(userId: string): Promise<string> {
  const doc = await db.collection("wallets").doc(userId).get();
  if (!doc.exists) throw new Error("Wallet not found for user " + userId);
  return doc.data()!.address;
}

/**
 * Get treasury wallet private key from config.
 */
export async function getTreasuryKey(): Promise<string> {
  const configDoc = await db.collection("config").doc("app").get();
  const key = configDoc.data()?.treasuryPrivateKey;
  if (!key) throw new Error("Treasury key not configured");
  return key;
}

/**
 * Sync user's on-chain TK balance to Firestore.
 */
export async function syncUserBalance(userId: string): Promise<number> {
  const address = await getUserWalletAddress(userId);
  const balanceStr = await getTkBalance(address);
  const balance = parseFloat(balanceStr);

  await db.collection("users").doc(userId).set(
    {
      tkBalance: balance,
      balanceSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );

  return balance;
}
