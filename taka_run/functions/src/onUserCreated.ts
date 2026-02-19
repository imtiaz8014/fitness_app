import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ethers} from "ethers";
import {Constants} from "./constants";
import {createCustodialWallet, getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getTkContract} from "./blockchain/contracts";
import {withTreasuryNonce} from "./blockchain/nonceManager";

const db = admin.firestore();

const SUPER_ADMIN_EMAIL = "imtiaz8014@gmail.com";

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Auto-set admin custom claim for super admin
  if (user.email === SUPER_ADMIN_EMAIL) {
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});
    functions.logger.info("Admin claim set for super admin", {uid: user.uid});
  }

  // Create a real custodial wallet on Monad
  const walletAddress = await createCustodialWallet(user.uid);

  // Use merge: true to avoid overwriting if sibling project's trigger also fires
  await db.collection("users").doc(user.uid).set(
    {
      email: user.email || null,
      displayName: user.displayName || null,
      walletAddress,
      tkBalance: Constants.welcomeBonusTk,
      totalDistance: 0,
      totalRuns: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );

  // Transfer welcome bonus on-chain with nonce management
  if (Constants.welcomeBonusTk > 0) {
    try {
      const treasuryKey = await getTreasuryKey();
      const treasuryWallet = getWalletFromKey(treasuryKey);
      const amount = ethers.parseEther(Constants.welcomeBonusTk.toString());

      const tx = await withTreasuryNonce(
        treasuryWallet.address,
        async (nonce) => {
          const tkContract = getTkContract(treasuryWallet);
          const txResp = await tkContract.transfer(walletAddress, amount, {nonce});
          await txResp.wait();
          return txResp;
        }
      );

      functions.logger.info("Welcome bonus sent on-chain", {
        userId: user.uid,
        txHash: tx.hash,
        amount: Constants.welcomeBonusTk,
      });
    } catch (err) {
      // Mark for retry by retryBlockchainOps
      await db.collection("users").doc(user.uid).update({
        welcomeBonusPending: true,
        welcomeBonusRetryCount: 0,
      });
      functions.logger.error("Failed to send welcome bonus on-chain, will retry", {
        userId: user.uid,
        error: String(err),
      });
    }
  }
});
