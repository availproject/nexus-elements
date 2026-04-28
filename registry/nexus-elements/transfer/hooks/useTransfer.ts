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

export type FastTransferState = TransactionFlowInputs;

interface UseTransferProps {
  network: NexusNetwork;
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

const useTransfer = ({
  network,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  allowance,
  fetchBalance,
  maxAmount,
  isSourceMenuOpen = false,
}: UseTransferProps) => {
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
      // v2 params: toTokenSymbol, toAmountRaw, sources (not token/amount/sourceChains)
      return nexusSDK.bridgeAndTransfer(
        {
          toTokenSymbol: token,
          toAmountRaw: amount,
          toChainId,
          recipient,
          sources,
        },
        {
          onEvent,
          hooks: {
            onIntent: (data) => {
              (intent as RefObject<OnIntentHookData | null>).current = data;
            },
            onAllowance: (data) => {
              (allowance as RefObject<OnAllowanceHookData | null>).current = data;
            },
          },
        },
      );
    },
    [nexusSDK, intent, allowance],
  );

  const flow = useTransactionFlow({
    type: "transfer",
    network,
    nexusSDK,
    intent,
    bridgableBalance,
    prefill: prefill as TransactionFlowPrefill | undefined,
    onComplete,
    onStart,
    onError,
    allowance,
    fetchBalance,
    maxAmount,
    isSourceMenuOpen,
    notifyHistoryRefresh: notifyIntentHistoryRefresh,
    // @ts-expect-error
    executeTransaction,
  });

  return {
    ...flow,
    inputs: flow.inputs as FastTransferState,
    setInputs: flow.setInputs as (
      next: FastTransferState | Partial<FastTransferState>,
    ) => void,
  };
};

export default useTransfer;
