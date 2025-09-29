import {
  ReadableIntent,
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
  UserAsset,
} from "@avail-project/nexus-core";

export interface FastBridgeProps {
  connectedAddress: `0x${string}`;
}

export interface FastBridgeState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient?: `0x${string}`;
}

export interface AmountInputProps {
  amount?: string;
  onChange: (value: string) => void;
  sources?: {
    amount: string;
    chainID: number;
    chainLogo: string | undefined;
    chainName: string;
    contractAddress: `0x${string}`;
  }[];
  unifiedBalance?: UserAsset;
}

export interface ChainSelectProps {
  selectedChain: number;
  disabled?: boolean;
  hidden?: boolean;
  className?: string;
  label?: string;
  handleSelect: (chainId: SUPPORTED_CHAINS_IDS) => void;
}

export interface FeeBreakdownProps {
  intent: ReadableIntent;
}

export interface ReceipientAddressProps {
  address?: `0x${string}`;
  onChange: (address: string) => void;
}

export interface TokenSelectProps {
  selectedToken?: SUPPORTED_TOKENS;
  selectedChain: SUPPORTED_CHAINS_IDS;
  handleTokenSelect: (token: SUPPORTED_TOKENS) => void;
  isTestnet?: boolean;
  disabled?: boolean;
  label?: string;
}
