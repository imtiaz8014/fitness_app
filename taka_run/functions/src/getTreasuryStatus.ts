import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {ethers} from "ethers";
import {getProvider} from "./blockchain/config";
import {getTreasuryKey} from "./blockchain/walletUtils";
import {getWalletFromKey, getTkContract} from "./blockchain/contracts";
import {requireAdmin} from "./adminCheck";

const db = admin.firestore();

const LOW_GAS_THRESHOLD = ethers.parseEther("0.1");
const CRITICAL_GAS_THRESHOLD = ethers.parseEther("0.01");

/**
 * Admin-only callable function that returns treasury status,
 * pending/abandoned operation counts, and platform stats.
 */
export const getTreasuryStatus = functions
  .runWith({timeoutSeconds: 60})
  .https.onCall(async (_data, context) => {
    await requireAdmin(context);

    // --- Treasury balances ---
    let treasuryAddress = "";
    let monBalance = "0";
    let tkBalance = "0";
    let monStatus: "ok" | "low" | "critical" = "ok";

    try {
      const treasuryKey = await getTreasuryKey();
      const treasuryWallet = getWalletFromKey(treasuryKey);
      treasuryAddress = treasuryWallet.address;
      const provider = getProvider();

      const [monBalanceWei, tkBalanceRaw] = await Promise.all([
        provider.getBalance(treasuryAddress),
        getTkContract().balanceOf(treasuryAddress) as Promise<bigint>,
      ]);

      monBalance = ethers.formatEther(monBalanceWei);
      tkBalance = ethers.formatEther(tkBalanceRaw);

      if (monBalanceWei < CRITICAL_GAS_THRESHOLD) {
        monStatus = "critical";
      } else if (monBalanceWei < LOW_GAS_THRESHOLD) {
        monStatus = "low";
      }
    } catch (err) {
      functions.logger.error("getTreasuryStatus: failed to read balances", {
        error: String(err),
      });
    }

    // --- Pending & abandoned operation counts ---
    const [
      pendingRunsSnap,
      pendingBetsSnap,
      pendingMarketsSnap,
      pendingBonusesSnap,
      pendingClaimsSnap,
      abandonedRunsSnap,
      abandonedBetsSnap,
      abandonedMarketsSnap,
    ] = await Promise.all([
      db.collection("runs")
        .where("blockchainStatus", "==", "pending")
        .count().get(),
      db.collection("bets")
        .where("blockchainStatus", "==", "pending")
        .count().get(),
      db.collection("markets")
        .where("blockchainStatus", "==", "pending")
        .count().get(),
      db.collection("users")
        .where("welcomeBonusPending", "==", true)
        .count().get(),
      db.collection("bets")
        .where("claimStatus", "==", "pending")
        .count().get(),
      db.collection("runs")
        .where("blockchainStatus", "==", "abandoned")
        .count().get(),
      db.collection("bets")
        .where("blockchainStatus", "==", "abandoned")
        .count().get(),
      db.collection("markets")
        .where("blockchainStatus", "==", "abandoned")
        .count().get(),
    ]);

    // --- Platform stats ---
    const [marketsSnap, usersSnap] = await Promise.all([
      db.collection("markets").get(),
      db.collection("users").get(),
    ]);

    let totalVolume = 0;
    let tkDistributed = 0;
    marketsSnap.docs.forEach((doc) => {
      totalVolume += doc.data().totalVolume || 0;
    });
    usersSnap.docs.forEach((doc) => {
      tkDistributed += doc.data().tkBalance || 0;
    });

    return {
      treasuryAddress,
      monBalance,
      tkBalance,
      monStatus,
      pendingOps: {
        runs: pendingRunsSnap.data().count,
        bets: pendingBetsSnap.data().count,
        markets: pendingMarketsSnap.data().count,
        welcomeBonuses: pendingBonusesSnap.data().count,
        claims: pendingClaimsSnap.data().count,
      },
      abandonedOps: {
        runs: abandonedRunsSnap.data().count,
        bets: abandonedBetsSnap.data().count,
        markets: abandonedMarketsSnap.data().count,
      },
      platformStats: {
        totalMarkets: marketsSnap.size,
        totalVolume: Math.round(totalVolume),
        activeUsers: usersSnap.size,
        tkDistributed: Math.round(tkDistributed),
      },
    };
  });
