import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ethers} from "ethers";
import {Constants} from "./constants";
import {createCustodialWallet, getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getTkContract} from "./blockchain/contracts";

const db = admin.firestore();

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
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

  // Transfer welcome bonus on-chain (fire-and-forget)
  if (Constants.welcomeBonusTk > 0) {
    try {
      const treasuryKey = await getTreasuryKey();
      const treasuryWallet = getWalletFromKey(treasuryKey);
      const tkContract = getTkContract(treasuryWallet);
      const amount = ethers.parseEther(Constants.welcomeBonusTk.toString());
      const tx = await tkContract.transfer(walletAddress, amount);
      await tx.wait();
      functions.logger.info("Welcome bonus sent on-chain", {
        userId: user.uid,
        txHash: tx.hash,
        amount: Constants.welcomeBonusTk,
      });
    } catch (err) {
      functions.logger.error("Failed to send welcome bonus on-chain", {
        userId: user.uid,
        error: String(err),
      });
    }
  }
});
