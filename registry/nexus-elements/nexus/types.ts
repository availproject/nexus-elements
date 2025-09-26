import * as React from "react";
import {
  EthereumProvider,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
  UserAsset,
} from "@avail-project/nexus";

export type SupportedChainsAndTokens = Array<{
  id: number;
  name: string;
  logo: string;
  tokens: Array<{
    contractAddress: `0x${string}`;
    decimals: string;
    logo: string;
    name: string;
    symbol: string;
  }>;
}>;

export interface NexusContextType {
  nexusSDK: NexusSDK | null;
  unifiedBalance: UserAsset[] | null;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  deinitializeNexus: () => Promise<void>;
  attachEventHooks: () => void;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  allowance: OnAllowanceHookData | null;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  supportedChainsAndTokens: SupportedChainsAndTokens | null;
}
