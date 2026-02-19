import * as functions from "firebase-functions";
import {ethers} from "ethers";
import {getProvider} from "./blockchain/config";
import {getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey} from "./blockchain/contracts";

const LOW_GAS_THRESHOLD = ethers.parseEther("0.1");
const CRITICAL_GAS_THRESHOLD = ethers.parseEther("0.01");

/**
 * Scheduled function that monitors the treasury wallet's MON balance.
 * Runs every 6 hours.
 */
export const gasMonitor = functions
  .runWith({timeoutSeconds: 60})
  .pubsub.schedule("every 6 hours")
  .onRun(async () => {
    try {
      const treasuryKey = await getTreasuryKey();
      const treasuryWallet = getWalletFromKey(treasuryKey);
      const provider = getProvider();
      const balance = await provider.getBalance(treasuryWallet.address);

      const balanceMon = ethers.formatEther(balance);

      if (balance < CRITICAL_GAS_THRESHOLD) {
        functions.logger.error(
          "CRITICAL: Treasury MON balance critically low!",
          {
            address: treasuryWallet.address,
            balanceMon,
            threshold: "0.01 MON",
          }
        );
      } else if (balance < LOW_GAS_THRESHOLD) {
        functions.logger.warn("WARNING: Treasury MON balance low", {
          address: treasuryWallet.address,
          balanceMon,
          threshold: "0.1 MON",
        });
      } else {
        functions.logger.info("gasMonitor: treasury balance OK", {
          address: treasuryWallet.address,
          balanceMon,
        });
      }
    } catch (err) {
      functions.logger.error("gasMonitor: failed to check balance", {
        error: String(err),
      });
    }
  });
