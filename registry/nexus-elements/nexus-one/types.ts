import { type Address } from "viem";
import { type SUPPORTED_CHAINS_IDS, type SUPPORTED_TOKENS } from "@avail-project/nexus-core";

export type NexusOneMode = /* "bridge" | */ "swap" | "transfer" | "deposit";

/** Exact In: user specifies the "from" amount. Exact Out: user specifies the "to" amount. */
export type SwapType = "exactIn" | "exactOut";

/**
 * A single DeFi yield/deposit opportunity that can be listed in the deposit widget.
 * Devs pass an array of these so users can pick which protocol to deposit into.
 */
export interface DepositOpportunity {
  id: string;
  /** Display label, e.g. "Aave USDC on Polygon" */
  label: string;
  /** Protocol name, e.g. "Aave" */
  protocol: string;
  /** Optional URL to a protocol/token logo */
  logo?: string;
  chainId: SUPPORTED_CHAINS_IDS;
  tokenSymbol: string;
  tokenAddress: `0x${string}`;
  /** Optional APY string shown in the card, e.g. "4.2%" */
  apy?: string;
  /** Short description shown in the card */
  description?: string;
}

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
  /** For deposit mode: list of DeFi opportunities the user can pick from */
  opportunities?: DepositOpportunity[];
}

export interface NexusOneProps {
  config: NexusOneConfig;
  connectedAddress?: Address;
  onComplete?: (explorerUrl?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}

