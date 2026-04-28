import type { createNexusClient } from "@avail-project/nexus-sdk-v2";
import type {
  NexusNetwork,
  OnAllowanceHookData,
  OnIntentHookData,
  TokenBalance,
} from "@avail-project/nexus-sdk-v2";
import { useCallback, type RefObject } from "react";
import { type Address } from "viem";
import {
  type TransactionFlowExecuteParams,
  type TransactionFlowInputs,
  type TransactionFlowPrefill,
  useTransactionFlow,
} from "../../common";
import { notifyIntentHistoryRefresh } from "../../view-history/history-events";

type NexusClient = ReturnType<typeof createNexusClient>;

export type FastBridgeState = TransactionFlowInputs;

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress: Address;
  nexusSDK: NexusClient | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: TokenBalance[] | null;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: (explorerUrl?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
  maxAmount?: string | number;
  isSourceMenuOpen?: boolean;
}

const useBridge = ({
  network,
  connectedAddress,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  fetchBalance,
  allowance,
  maxAmount,
  isSourceMenuOpen = false,
}: UseBridgeProps) => {
  const executeTransaction = useCallback(
    async ({
      token,
      amount,
      toChainId,
      recipient,
      sources,
      onEvent,
    }: TransactionFlowExecuteParams) => {
      if (!nexusSDK) return null;
      // v2 params: toTokenSymbol, toAmountRaw, sources (not sourceChains)
      return nexusSDK.bridge(
        {
          toTokenSymbol: token,
          toAmountRaw: amount,
          toChainId,
          recipient: recipient ?? connectedAddress,
          sources,
        },
        {
          onEvent,
          hooks: {
            onIntent: (data) => {
              // hooks are per-operation in v2
              (intent as RefObject<OnIntentHookData | null>).current = data;
            },
            onAllowance: (data) => {
              (allowance as RefObject<OnAllowanceHookData | null>).current = data;
            },
          },
        },
      );
    },
    [connectedAddress, nexusSDK, intent, allowance],
  );

  const flow = useTransactionFlow({
    type: "bridge",
    network,
    connectedAddress,
    nexusSDK,
    intent,
    bridgableBalance,
    prefill: prefill as TransactionFlowPrefill | undefined,
    onComplete,
    onStart,
    onError,
    fetchBalance,
    allowance,
    maxAmount,
    isSourceMenuOpen,
    notifyHistoryRefresh: notifyIntentHistoryRefresh,
    // @ts-expect-error
    executeTransaction,
  });

  return {
    ...flow,
    inputs: flow.inputs as FastBridgeState,
    setInputs: flow.setInputs as (
      next: FastBridgeState | Partial<FastBridgeState>,
    ) => void,
  };
};

export default useBridge;
