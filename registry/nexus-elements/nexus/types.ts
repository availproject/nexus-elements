import * as React from "react";
import {
  EthereumProvider,
  NexusNetwork,
  NexusSDK,
  OnAllowanceHookData,
  OnIntentHookData,
  SupportedChainsResult,
  UserAsset,
} from "@avail-project/nexus-core";

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
  supportedChainsAndTokens: SupportedChainsResult | null;
  network?: NexusNetwork;
  loading: boolean;
}
