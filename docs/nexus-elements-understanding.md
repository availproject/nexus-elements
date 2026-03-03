# Nexus Elements: Current Functional Understanding

Last updated: March 3, 2026

## Why this doc exists

This is a working implementation map of the current Nexus Elements codebase so we do not lose context. It focuses on real behavior from code, not just docs copy.

## Element inventory (what exists today)

Exported from `registry/nexus-elements/all/index.ts`:

- `NexusProvider`
- `FastBridge`
- `FastTransfer`
- `Deposit` (the newer swap-and-execute deposit widget)
- `BridgeDeposit` (the older/simple bridge-and-execute deposit flow)
- `SwapWidget`
- `UnifiedBalance`
- `ViewHistory`

## The brain: `NexusProvider`

File: `registry/nexus-elements/nexus/NexusProvider.tsx`

`NexusProvider` is the shared state and SDK control plane used by all widgets.

### What it initializes

- Creates one `NexusSDK` instance.
- On `handleInit(provider)`:
  - initializes SDK
  - loads supported chains/tokens (`getSupportedChains`, `getSwapSupportedChainsAndTokens`)
  - fetches bridge balances (`getBalancesForBridge`)
  - fetches rates (`utils.getCoinbaseRates`) and normalizes to USD-per-unit
  - attaches hooks (`setOnAllowanceHook`, `setOnIntentHook`, `setOnSwapIntentHook`)

### Important shared state

- `bridgableBalance`: from `sdk.getBalancesForBridge()`
- `swapBalance`: from `sdk.getBalancesForSwap()` (lazy, only when explicitly fetched)
- `intent`, `allowance`, `swapIntent`: refs to active hook payloads that power confirm/deny UX
- `supportedChainsAndTokens`, `swapSupportedChainsAndTokens`
- pricing helpers: `getFiatValue`, `resolveTokenUsdRate`

### Important behavior

- On wallet disconnect, it deinitializes SDK and clears provider state.
- `swapBalance` is not fetched during initial setup by default; widgets call `fetchSwapBalance()` when needed.

## Shared transaction engine used by bridge + transfer

Files:

- `registry/nexus-elements/common/hooks/useTransactionFlow.ts`
- `registry/nexus-elements/common/hooks/useTransactionExecution.ts`

`FastBridge` and `FastTransfer` both run on this same engine.

### Core responsibilities

- Input state and validation (`token`, `chain`, `amount`, `recipient`)
- Max checks (`maxAmount` prop + SDK `calculateMaxForBridge`)
- Source-chain selection and coverage checks
- Intent refresh + polling (every 15s while reviewing intent)
- Step event handling (`STEPS_LIST`, `STEP_COMPLETE`)
- Execution lifecycle (`idle -> executing -> success/error`)
- Allowance modal handoff
- History refresh event dispatch on success

## Element-by-element understanding

## 1) `FastBridge`

Files:

- `registry/nexus-elements/fast-bridge/fast-bridge.tsx`
- `registry/nexus-elements/fast-bridge/hooks/useBridge.ts`

### SDK operation used

- `sdk.bridge(...)`

### When it is used

- User wants to bridge to another chain, optionally to self or another recipient.

### UX flow

1. User selects destination chain/token, amount, recipient.
2. Transaction is simulated via intent path and shows source breakdown + fees.
3. User can customize source chains used to fund the bridge.
4. User accepts (intent `allow()`), then transaction executes.
5. Progress modal shows milestones and explorer link.

### Notes

- Uses `bridgableBalance` (not `swapBalance`).
- Supports `maxAmount` cap and `prefill`.
- Uses `notifyIntentHistoryRefresh` after success.

## 2) `FastTransfer`

Files:

- `registry/nexus-elements/transfer/transfer.tsx`
- `registry/nexus-elements/transfer/hooks/useTransfer.ts`

### SDK operation used

- `sdk.bridgeAndTransfer(...)`

### When it is used

- User wants cross-chain transfer to a recipient address.

### UX flow

- Same shared engine as FastBridge (source customization, intent acceptance, allowance, progress), but execution call is transfer-specific.

### Notes

- Uses `bridgableBalance`.
- Shares most UX/logic with `FastBridge`, but semantic output is transfer-to-recipient.

## 3) `SwapWidget`

Files:

- `registry/nexus-elements/swaps/swap-widget.tsx`
- `registry/nexus-elements/swaps/hooks/useSwaps.ts`
- `registry/nexus-elements/swaps/components/*`

### SDK operations used

- Exact-in mode: `sdk.swapWithExactIn(...)`
- Exact-out mode: `sdk.swapWithExactOut(...)`

### Modes

- `exactIn`: source amount is user-controlled (`Sell` input).
- `exactOut`: destination amount is user-controlled (`Buy` input).

### How mode switches happen

- Typing on source amount sets `exactIn`.
- Typing on destination amount sets `exactOut`.
- Center toggle swaps token/chain direction and resets mode to `exactIn`.

### Exact-out special behavior

- Computes source options from `swapBalance` + current intent sources.
- User can toggle exact-out source set before final continue.
- If source selection changed, `continueSwap` reruns simulation to get a fresh intent with new sources before allowing execution.

### Notes

- Uses `swapBalance`.
- Auto-runs debounced simulation when inputs are valid.
- Polls `swapIntent.refresh()` every 15s while simulating.

## 4) `Deposit` (newer widget, `nexus-deposit.tsx`)

Files:

- `registry/nexus-elements/deposit/nexus-deposit.tsx`
- `registry/nexus-elements/deposit/hooks/use-deposit-widget.ts`
- `registry/nexus-elements/deposit/hooks/use-deposit-state.ts`
- `registry/nexus-elements/deposit/hooks/use-deposit-computed.ts`
- `registry/nexus-elements/deposit/hooks/use-asset-selection.ts`

### SDK operation used

- `sdk.swapAndExecute(...)`

### When it is used

- User wants to deposit into a destination protocol/contract, potentially funding from many cross-chain token balances.

### How it thinks about amount

- User enters amount in USD.
- Hook resolves destination token USD rate and converts to destination token amount for `toAmount`.

### UX flow

1. Amount screen (`amount`)
2. Confirmation (`confirmation`) with source/fee breakdown
3. Transaction status (`transaction-status`)
4. Success or failure screens

### Swap-skip optimization

- Watches swap events for `SWAP_SKIPPED`.
- If skipped, it jumps directly into execute path visualization and marks `skipSwap = true`.
- Transaction status then shows a reduced flow.

### Notes

- Uses `swapBalance`.
- Performs quote/simulation-style loop by starting `swapAndExecute` and waiting for swap intent readiness.
- Polls `swapIntent.refresh()` while in preview state.

## 5) `BridgeDeposit` (older/simple deposit)

Files:

- `registry/nexus-elements/bridge-deposit/deposit.tsx`
- `registry/nexus-elements/bridge-deposit/hooks/useDeposit.ts`
- `registry/nexus-elements/bridge-deposit/components/*`

### SDK operations used

- Simulation: `sdk.simulateBridgeAndExecute(...)`
- Execution: `sdk.bridgeAndExecute(...)`

### When it is used

- Deposit flow where token is fixed and user customizes bridge source chains explicitly, then executes contract call.

### UX flow

1. Select source chains + amount
2. Simulate bridge+execute quote
3. Show source breakdown/fees
4. Start execution
5. Show transaction status and explorer links

### Notes

- Uses `bridgableBalance`.
- Supports path where bridge may be skipped and execute happens directly.
- This is functionally different from the newer `Deposit` widget.

## 6) `UnifiedBalance`

File: `registry/nexus-elements/unified-balance/unified-balance.tsx`

### Purpose

- Visualizes user balances in two buckets:
  - Bridgeable balance (`bridgableBalance`)
  - Swappable balance (`swapBalance`)

### Behavior

- If `swapBalance` is not loaded, it shows only the bridgeable view.
- Once `swapBalance` exists, it shows tabbed `Bridgeable Balance` and `Swappable Balance`.
- Each tab shows per-token and per-chain breakdown, only for positive balances.

## 7) `ViewHistory`

Files:

- `registry/nexus-elements/view-history/view-history.tsx`
- `registry/nexus-elements/view-history/hooks/useViewHistory.ts`
- `registry/nexus-elements/view-history/history-events.ts`

### SDK operation used

- `sdk.getMyIntents()`

### Behavior

- Fetches intent history and renders status cards.
- Supports infinite-scroll style paging in UI.
- Listens for global `nexus:intent-history:refresh` events to refresh after tx success.
- Used inline and as modal depending on `viewAsModal`.

## Data model split: bridgeable vs swappable balances

This split is intentional and used throughout:

- Bridge/transfer/bridge-deposit rely on `bridgableBalance`.
- Swap/deposit rely on `swapBalance`.
- UnifiedBalance exposes both to users.

Operationally:

- `bridgableBalance` is populated during initial provider setup.
- `swapBalance` is fetched lazily by swap/deposit hooks.

## Current architecture summary

- `NexusProvider` = SDK lifecycle + shared data + hooks
- `FastBridge` + `FastTransfer` = common flow engine with different execute function
- `SwapWidget` = exact-in/exact-out swap engine
- `Deposit` (new) = swap-and-execute deposit product
- `BridgeDeposit` (old/simple) = bridge-and-execute deposit product
- `UnifiedBalance` = bridgeable/swappable balance presentation
- `ViewHistory` = intent history + refresh bus

## Useful references

- Export map: `registry/nexus-elements/all/index.ts`
- Provider brain: `registry/nexus-elements/nexus/NexusProvider.tsx`
- Shared bridge/transfer engine:
  - `registry/nexus-elements/common/hooks/useTransactionFlow.ts`
  - `registry/nexus-elements/common/hooks/useTransactionExecution.ts`
- Swap engine: `registry/nexus-elements/swaps/hooks/useSwaps.ts`
- New deposit engine: `registry/nexus-elements/deposit/hooks/use-deposit-widget.ts`
- Bridge-deposit engine: `registry/nexus-elements/bridge-deposit/hooks/useDeposit.ts`

