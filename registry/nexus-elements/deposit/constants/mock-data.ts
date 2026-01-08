/**
 * Mock data constants for development/demo purposes.
 * In production, these values would come from APIs, wallet connections, etc.
 */

// ============================================================================
// Wallet & Balance Mocks
// ============================================================================

export const MOCK_WALLET_BALANCE = 3259.37;

export const MOCK_WALLETS = {
  ethereum: {
    name: "MetaMask",
    address: "0x4fbr...c253",
    balance: "$1,234.56",
    logo: "/metamask.svg",
  },
  solana: {
    name: "Phantom",
    address: "4nYX...L2i2",
    balance: "$2,024.81",
    logo: "/phantom.svg",
  },
} as const;

// ============================================================================
// Transaction Mocks
// ============================================================================

export const MOCK_TRANSACTION = {
  /** Simulated transaction delay in milliseconds */
  simulationDelayMs: 12500,

  /** Total duration for transaction steps animation */
  stepsDurationMs: 12000,

  /** Mock transaction hash */
  txHash: "0x1e2...c253",

  /** Mock deposit transaction hash */
  depositTxHash: "4xfe2...u248",

  /** Mock explorer URLs */
  explorerUrls: {
    bridge: "https://explorer.example.com/bridge/123",
    execute: "https://explorer.example.com/tx/456",
  },

  /** Source chain collection transactions */
  sourceChains: [
    { name: "Arbitrum", explorerUrl: "https://arbiscan.io/tx/0x123" },
    { name: "Polygon", explorerUrl: "https://polygonscan.com/tx/0x456" },
    {
      name: "Optimism",
      explorerUrl: "https://optimistic.etherscan.io/tx/0x789",
    },
  ],
} as const;

// ============================================================================
// Demo Transaction Values
// ============================================================================

export const MOCK_DEMO_VALUES = {
  /** Amount user spends (before fees) */
  spendAmount: "1,901.37",

  /** Amount user receives (after fees) */
  receiveAmount: "1,901.22",

  /** Formatted receive amount with currency symbol */
  receiveAmountFormatted: "1,901.22",

  /** Total wallet balance display */
  totalWalletBalance: "$3,259.37",

  /** Number of assets being used */
  assetCount: 8,

  /** Number of chains being used */
  chainCount: 4,

  /** Asset summary label */
  assetSummary: "8 Assets; 4 Chains",

  /** Token names summary (for confirmation screen) */
  tokenNamesSummary: "USDC, ETH + 2 more",
} as const;

// ============================================================================
// Fee Mocks
// ============================================================================

export const MOCK_FEES = {
  /** Total fees in USD */
  totalUsd: "0.15",

  /** Total fees formatted */
  totalFormatted: "0.15 USD",

  /** Fee description */
  description: "Network & protocol",
} as const;

// ============================================================================
// Time Estimates
// ============================================================================

export const MOCK_TIME_ESTIMATES = {
  /** Estimated time for confirmation screen */
  confirmation: "in about 10s",

  /** Actual time taken for completion screen */
  completion: "in 12s",
} as const;

// ============================================================================
// Transaction Steps
// ============================================================================

export const TRANSACTION_STEPS = [
  {
    id: "intent-verification",
    label: "Intent verification",
    groupWithNext: true,
  },
  { id: "collection-on-sources", label: "Collecting on sources" },
  { id: "deposit-transaction", label: "Deposit transaction" },
] as const;

export type TransactionStep = (typeof TRANSACTION_STEPS)[number];
