import {ethers} from "ethers";
import {
  getProvider,
  getTkAddress,
  getPredictionAddress,
  TK_ABI,
  PREDICTION_ABI,
} from "./config";

export function getTkContract(
  signerOrProvider?: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(
    getTkAddress(),
    TK_ABI,
    signerOrProvider || getProvider()
  );
}

export function getPredictionContract(
  signerOrProvider?: ethers.Signer | ethers.Provider
): ethers.Contract {
  return new ethers.Contract(
    getPredictionAddress(),
    PREDICTION_ABI,
    signerOrProvider || getProvider()
  );
}

export function getWalletFromKey(privateKey: string): ethers.Wallet {
  return new ethers.Wallet(privateKey, getProvider());
}

export async function getTkBalance(address: string): Promise<string> {
  const tk = getTkContract();
  const balance = await tk.balanceOf(address);
  return ethers.formatEther(balance);
}
