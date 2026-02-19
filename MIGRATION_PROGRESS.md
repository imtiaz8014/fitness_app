# On-Chain Migration Progress

## What's Done

### 1. Cloud Function: `migrateMarketsOnChain` (taka_run)
- **File**: `taka_run/functions/src/migrateMarketsOnChain.ts`
- Admin-only callable function that migrates existing Firestore markets onto the TakaPrediction smart contract
- Processes markets sequentially to avoid nonce conflicts
- Skips markets with past deadlines
- Updates each Firestore doc with `onChainId`, `txHash`, `blockchainStatus: "confirmed"`
- Exported in `taka_run/functions/src/index.ts`

### 2. Blockchain Utility (taka_market)
- **File**: `taka_market/src/lib/blockchain.ts`
- Read-only ethers.js client pointing at Monad RPC (`https://rpc.monad.xyz`, chainId 143)
- Contract address: `0xd09742B0Ca9A810547E22f40301b580bD4f95888`
- Functions: `getOnChainMarket()`, `getOnChainOdds()`, `getOnChainBetCount()`, `getMarketActivity()`
- `getMarketActivity()` queries event logs: MarketCreated, BetPlaced, MarketResolved, WinningsClaimed, MarketCancelled

### 3. VerifyOnChain Component (taka_market)
- **File**: `taka_market/src/components/VerifyOnChain.tsx`
- "Verify on Blockchain" button that fetches on-chain data and shows Firestore vs on-chain comparison table
- Shows match/mismatch for title, description, deadline, pools, status

### 4. OnChainActivity Component (taka_market)
- **File**: `taka_market/src/components/OnChainActivity.tsx`
- Expandable "On-Chain Activity" panel showing all blockchain events for a market
- Color-coded icons per event type (created, bet, resolved, claimed, cancelled)
- Shows wallet addresses, amounts, YES/NO side, timestamps
- Links to Monad block explorer for every tx and address

### 5. Market Detail Page Updates (taka_market)
- **File**: `taka_market/src/app/markets/[id]/page.tsx`
- On-Chain Activity section in main content area (shows for all markets)
- On-Chain Info sidebar section (shows for all markets)
- Markets without `onChainId` show "pending migration" messaging
- Markets with `onChainId` show full interactive verify + activity feed

## What's Left To Do

### Deploy & Run Migration
1. **Deploy the new function**:
   ```bash
   cd taka_run
   firebase deploy --only functions:migrateMarketsOnChain
   ```

2. **Verify prerequisites** in Firestore `config/app` document:
   - `predictionContractMainnet` — the deployed TakaPrediction contract address
   - `treasuryPrivateKey` — treasury wallet private key for signing txns
   - `walletEncryptionKey` — for wallet encryption (already used by other functions)
   - Treasury wallet must have MON for gas fees

3. **Call the migration function** (must be called as an admin user):
   - From the taka_market web app (browser console), or
   - Via a script using Firebase callable:
   ```js
   import { callFunction } from '@/lib/api';
   const result = await callFunction('migrateMarketsOnChain');
   console.log(result); // { migrated: N, skipped: N, failed: N, details: [...] }
   ```

4. **Verify**: After migration, each market's detail page should show:
   - On-Chain Info sidebar with market ID, tx hash, contract link
   - "Verify on Blockchain" button comparing Firestore vs chain
   - "On-Chain Activity" panel with event history

## Notes
- The migration function has a 540s timeout and 512MB memory (max for v1 functions)
- Markets with deadlines in the past are skipped
- Markets already with `blockchainStatus: "confirmed"` are excluded from the query
- The function uses `withTreasuryNonce()` for sequential nonce management
