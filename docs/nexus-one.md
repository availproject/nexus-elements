# Nexus One (Tentative Name) - Build Plan

Last updated: 2026-03-03

## 1) Goal
Build a brand-new unified Nexus element from scratch that supports `swap`, `bridge`, `transfer`, and `deposit` in one pleasant, simple UX, while still allowing deep configurability for integrators.

## 2) Product Outcomes
1. End users can complete cross-chain actions with minimal cognitive load.
2. Integrators can enable only the flows they need using booleans on the main component.
3. The element auto-picks the right operation by default, with optional manual override.
4. Existing elements remain unchanged during development.
5. Work happens on a separate branch and is not published to the registry in this phase.

## 3) V1 Scope
1. Supported flows: `swap`, `bridge`, `transfer`, `deposit`.
2. Swap supports `exactIn` and `exactOut`.
3. Deposit presets: `Aave`, `Hyperliquid`, `Custom`.
4. Inline balance view is included.
5. Intent history is not included in this element.
6. Advanced source controls are progressive disclosure.
7. Simulation and allowance are optional states and only appear when relevant.

## 4) Non-Goals (V1)
1. No multi-step chained orchestration (example: force bridge then swap as one composed plan).
2. No public registry/docs/showcase release in this phase.
3. No feature flags required.

## 5) UX Principles (Pleasant + Simple)
1. Outcome-first input model: user describes desired result, not protocol mechanics.
2. One primary action per screen: avoid multiple competing CTAs.
3. Progressive disclosure: advanced controls hidden by default.
4. Smart defaults: auto mode, preselected best route, prefilled likely values.
5. Fast feedback: quote and route clarity appear early.
6. Calm language: direct, low-jargon text and actionable errors.
7. Safe control: users can override auto mode if they want.

## 6) User Experience Flow

## 6.1 Main Journey
1. User sets outcome: from token/chain, to token/chain, amount, optional recipient.
2. Element selects operation in `auto` mode.
3. User reviews quote and route breakdown.
4. User optionally opens advanced controls.
5. User confirms.
6. Transaction executes with contextual progress UI.
7. Success screen gives clear result and explorer links.

## 6.2 Optional Journey Branches
1. Simulation appears only when a route needs quote/intent verification.
2. Allowance step appears only when SDK requires approvals.
3. For direct-eligible paths, flow can skip simulation and/or allowance.

## 7) ASCII Wireframes

## 7.1 Main Screen
```text
+----------------------------------------------------------------------------------+
| Unified Element (name TBD)                                          [⚙ Settings] |
|----------------------------------------------------------------------------------|
| Goal                                                                            |
| From: [Token ▼] [Chain ▼] [Amount ___________________________]                  |
| To:   [Token ▼] [Chain ▼]                                                       |
| Recipient (optional): [0x.................................................]      |
| Deposit Target (optional): [None | Aave | Hyperliquid | Custom ▼]              |
|----------------------------------------------------------------------------------|
| Route: [AUTO]  Selected: [Bridge]                           [Override ▼]        |
| Enabled: [Swap ✓] [Bridge ✓] [Transfer ✓] [Deposit ✓]                          |
|----------------------------------------------------------------------------------|
| Balance: Bridgeable $X,XXX | Swappable $Y,YYY                      [Details ▸] |
|----------------------------------------------------------------------------------|
| Quote                                                                            |
| You pay: ...                                                                     |
| You receive: ...                                                                 |
| Fees: ...                                                                        |
| ETA: ...                                                                         |
| [Advanced ▸] Source constraints / source chain selection                         |
|----------------------------------------------------------------------------------|
| [Reset]                                                      [Continue / Execute]|
+----------------------------------------------------------------------------------+
```

## 7.2 Progress State
```text
+--------------------------------------------------------------+
| Transaction Progress                                         |
|--------------------------------------------------------------|
| [✓] Intent confirmed (if required)                           |
| [~] Approval (if required)                                   |
| [ ] Source execution                                         |
| [ ] Destination execution                                    |
|--------------------------------------------------------------|
| Status: Executing...                                         |
| Explorer: [View transaction]                                 |
|--------------------------------------------------------------|
| [Close]                                                      |
+--------------------------------------------------------------+
```

## 7.3 Single-Flow Locked UX
```text
Config: { bridge: true, swap: false, transfer: false, deposit: false }

Behavior:
- Mode selector hidden
- Bridge-specific labels and CTA
- Only bridge-compatible fields shown
```

## 8) Configurability Model

## 8.1 Core Props
```ts
type UnifiedMode = "auto" | "swap" | "bridge" | "transfer" | "deposit";

interface EnabledFlows {
  swap: boolean;
  bridge: boolean;
  transfer: boolean;
  deposit: boolean;
}

interface UnifiedPrefill {
  fromChainId?: number;
  fromTokenAddress?: `0x${string}`;
  toChainId?: number;
  toTokenAddress?: `0x${string}`;
  amount?: string;
  recipient?: `0x${string}`;
  swapAmountMode?: "exactIn" | "exactOut";
  depositPreset?: "aave" | "hyperliquid" | "custom";
}

interface UnifiedElementProps {
  connectedAddress?: `0x${string}`;
  mode?: UnifiedMode;
  enabledFlows?: Partial<EnabledFlows>;
  prefill?: UnifiedPrefill;
  maxAmount?: string | number;
  allowModeOverride?: boolean;
  showInlineBalance?: boolean;
  showAdvancedControls?: boolean;
  depositPresets?: {
    aave?: { enabled: boolean; poolByChain: Record<number, `0x${string}`>; referralCode?: number };
    hyperliquid?: { enabled: boolean; contractByChain: Record<number, `0x${string}`>; functionName?: string };
    custom?: {
      enabled: boolean;
      executeBuilder: (
        tokenSymbol: string,
        tokenAddress: `0x${string}`,
        amount: bigint,
        chainId: number,
        user: `0x${string}`
      ) => Omit<ExecuteParams, "toChainId">;
    };
  };
  onModeResolved?: (mode: "swap" | "bridge" | "transfer" | "deposit") => void;
  onStart?: (ctx: { mode: "swap" | "bridge" | "transfer" | "deposit" }) => void;
  onError?: (ctx: { mode?: "swap" | "bridge" | "transfer" | "deposit"; message: string }) => void;
  onComplete?: (ctx: { mode: "swap" | "bridge" | "transfer" | "deposit"; explorerUrl?: string; amount?: string; txHashes?: string[] }) => void;
}
```

## 8.2 Flow Enablement Rules
1. If one flow is enabled, lock to that flow and hide selector.
2. If multiple flows are enabled, run auto-route and optionally show override.
3. If explicit mode is disabled by config, show clear config error state.
4. If all flows are disabled, block render with configuration guidance.

## 9) Routing Logic (Rule-Based)
1. If deposit target/preset is chosen and deposit is enabled -> `deposit`.
2. Else if recipient exists and recipient differs from connected wallet and transfer is enabled -> `transfer`.
3. Else if token differs and swap is enabled -> `swap`.
4. Else if chain differs and token same and bridge is enabled -> `bridge`.
5. Else fallback to first compatible enabled flow.
6. If no compatible flow exists, show `Flow Disabled by Config` state.

## 10) State Machine (Optional Steps Explicit)
```text
idle -> editing -> [optional simulating] -> review -> [optional awaitingAllowance]
-> executing -> success | error
```

Transition notes:
1. `simulating` is conditional.
2. `awaitingAllowance` is conditional.
3. Some routes can go directly to review or execute.
4. Cancel/deny returns to editing with inputs preserved by default.

## 11) Architecture (Dedicated Provider)
1. Create a dedicated internal provider for this element: `UnifiedFlowProvider`.
2. Keep this provider inside the component boundary so host usage stays simple.
3. Continue to rely on external `NexusProvider` for SDK access.

Proposed module layout:
1. `registry/nexus-elements/unified-flow/unified-flow.tsx`
2. `registry/nexus-elements/unified-flow/provider/UnifiedFlowProvider.tsx`
3. `registry/nexus-elements/unified-flow/hooks/useUnifiedFlowRouter.ts`
4. `registry/nexus-elements/unified-flow/hooks/useUnifiedFlowSimulation.ts`
5. `registry/nexus-elements/unified-flow/hooks/useUnifiedFlowExecution.ts`
6. `registry/nexus-elements/unified-flow/hooks/useUnifiedFlowBalances.ts`
7. `registry/nexus-elements/unified-flow/presets/builders.ts`
8. `registry/nexus-elements/unified-flow/components/*`
9. `registry/nexus-elements/unified-flow/types.ts`

## 12) Functional Details Per Flow
1. Swap uses `swapWithExactIn` / `swapWithExactOut`.
2. Bridge uses `bridge`.
3. Transfer uses `bridgeAndTransfer`.
4. Deposit uses `swapAndExecute` with preset/custom execute builder.
5. Shared progress renderer normalizes step messaging across all flows.
6. Shared error normalization maps SDK errors to user-safe messages.

## 13) UX Copy + Interaction Details
1. CTA labels:
- Editing: `Continue`
- Review: `Confirm and Execute`
- Executing: `Processing...`
- Success: `Done`
2. Validation copy:
- `Enter a valid amount`
- `Recipient address is invalid`
- `This route is disabled by configuration`
- `No available balance for this operation`
3. Empty states:
- `No supported assets found`
- `Connect wallet to continue`
4. Advanced controls label:
- `Advanced route controls`
5. Reduce anxiety:
- Always show what user pays, receives, fees, and ETA before final confirm.

## 14) Accessibility and Responsiveness
1. Keyboard navigable controls end-to-end.
2. Proper labels/aria for all form inputs.
3. Focus management for modals/progress dialogs.
4. Mobile-first layout with single-column flow.
5. Large tap targets and legible spacing.
6. High-contrast status and error states.

## 15) Performance Expectations
1. Debounced simulation requests.
2. Minimize re-renders with memoized selectors in provider.
3. Lazy-render advanced sections.
4. Fast initial paint with skeleton placeholders for async balance/quote areas.

## 16) Testing Plan
1. Config matrix tests for all enabled-flow combinations.
2. Router tests for token/chain/recipient/deposit target permutations.
3. State machine tests for optional simulation and allowance branches.
4. Flow tests for swap exact-in/exact-out.
5. Deposit preset encoding tests for Aave and Hyperliquid.
6. Custom builder success/failure tests.
7. UX tests for lock-to-single-flow behavior.
8. Mobile and accessibility checks.
9. Callback payload contract tests.

## 17) Acceptance Criteria
1. One component can run any enabled subset of flows.
2. Optional states appear only when required.
3. UX remains simple with advanced options hidden by default.
4. No public registry exposure in this phase.
5. Internal beta passes route and execution matrix without blocker issues.

## 18) Assumptions
1. Final component name is still TBD.
2. Work occurs in a dedicated branch.
3. Existing elements remain untouched during this build.
4. No registry or docs publication until explicitly approved.
