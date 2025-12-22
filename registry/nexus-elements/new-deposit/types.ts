export type WidgetStep =
  | "deposit-options"
  | "amount"
  | "confirmation"
  | "transaction-status"
  | "transaction-complete"
  | "asset-selection";

export type DepositStatus =
  | "idle"
  | "previewing"
  | "executing"
  | "success"
  | "error";

export type NavigationDirection = "forward" | "backward" | null;

export type AssetFilterType = "all" | "stablecoins" | "native" | "custom";

// Token-related types
export type TokenCategory = "stablecoin" | "native" | "memecoin";

export interface ChainItem {
  id: string;
  name: string;
  usdValue: string;
  amount: string;
}

export interface Token {
  id: string;
  symbol: string;
  chainsLabel: string;
  usdValue: string;
  amount: string;
  logo: string;
  category: TokenCategory;
  chains: ChainItem[];
}

export interface DepositInputs {
  amount?: string;
  selectedToken: string;
}

export interface AssetSelectionState {
  selectedChainIds: Set<string>;
  filter: AssetFilterType;
  expandedTokens: Set<string>;
}

export interface DepositWidgetContextValue {
  // Core state
  step: WidgetStep;
  inputs: DepositInputs;
  status: DepositStatus;

  // Input management
  setInputs: (inputs: Partial<DepositInputs>) => void;

  // Explorer URLs
  explorerUrls: {
    intentUrl: string | null;
    executeUrl: string | null;
  };

  // Derived state
  isProcessing: boolean;
  isSuccess: boolean;
  isError: boolean;

  // Error handling
  txError: string | null;
  setTxError: (error: string | null) => void;

  // Navigation
  goToStep: (step: WidgetStep) => void;
  goBack: () => void;
  reset: () => void;
  navigationDirection: NavigationDirection;

  // Transaction actions
  startTransaction: () => void;

  // Results
  lastResult: unknown;

  // Asset selection
  assetSelection: AssetSelectionState;
  setAssetSelection: (selection: Partial<AssetSelectionState>) => void;
}

// Props interface for the main component (following nexus-elements pattern)
export interface BaseDepositWidgetProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface DepositWidgetProps extends BaseDepositWidgetProps {
  heading?: string;
  embed?: boolean;
  className?: string;
  onClose?: () => void;
}
