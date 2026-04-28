import type { createNexusClient } from "@avail-project/nexus-sdk-v2";
import { type Address } from "viem";

type NexusClient = ReturnType<typeof createNexusClient>;

// v2 uses string token symbols (toTokenSymbol) with number chain IDs
export type TransactionFlowType = "bridge" | "transfer";

export interface TransactionFlowInputs {
  chain: number;
  token: string;
  amount?: string;
  recipient?: `0x${string}`;
}

export interface TransactionFlowPrefill {
  token: string;
  chainId: number;
  amount?: string;
  recipient?: Address;
}

// v2 bridge onEvent uses typed discriminated union, not NEXUS_EVENTS
export type TransactionFlowEvent =
  | { type: "status"; status: string }
  | { type: "plan_preview"; plan: { steps: unknown[] } }
  | { type: "plan_confirmed"; plan: { steps: unknown[] } }
  | { type: "plan_progress"; stepType: string; state: string; step: unknown };

export type TransactionFlowOnEvent = (event: TransactionFlowEvent) => void;

export interface TransactionFlowExecuteParams {
  token: string;
  amount: bigint;
  toChainId: number;
  recipient: `0x${string}`;
  sources?: number[];
  onEvent: TransactionFlowOnEvent;
}

export type TransactionFlowExecutor = (
  params: TransactionFlowExecuteParams,
) => Promise<{ explorerUrl: string } | null>;

export type SourceCoverageState = "healthy" | "warning" | "error";

export interface SourceSelectionValidation {
  coverageState: SourceCoverageState;
  isBelowRequired: boolean;
  missingToProceed: string;
  missingToSafety: string;
}
