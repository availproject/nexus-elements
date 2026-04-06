import { type Address } from "viem";
import { type SUPPORTED_CHAINS_IDS, type SUPPORTED_TOKENS } from "@avail-project/nexus-core";

export type NexusOneMode = "bridge" | "swap" | "transfer" | "deposit";

export interface NexusOnePrefill {
  token?: SUPPORTED_TOKENS;
  chainId?: SUPPORTED_CHAINS_IDS;
  amount?: string;
  recipient?: Address;
}

export interface NexusOneConfig {
  mode: NexusOneMode | NexusOneMode[];
  prefill?: NexusOnePrefill;
  allowedChains?: SUPPORTED_CHAINS_IDS[];
  allowedTokens?: SUPPORTED_TOKENS[];
}

export interface NexusOneProps {
  config: NexusOneConfig;
  connectedAddress?: Address;
  onComplete?: (explorerUrl?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}
