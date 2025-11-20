import { type RefObject, useEffect, useMemo, useState } from "react";
import {
  NexusSDK,
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type ExactOutSwapInput,
  NEXUS_EVENTS,
  type SwapStepType,
  type UserAsset,
  type OnSwapIntentHookData,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import { resolveDestinationFromPrefill } from "../../utils/prefill";
import {
  useStopwatch,
  useTransactionSteps,
  SWAP_EXPECTED_STEPS,
  useNexusError,
} from "../../../common";

type DestinationTokenInfo = {
  tokenAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};

interface SwapInputs {
  toAmount?: string;
  toChainID: SUPPORTED_CHAINS_IDS;
  toToken?: DestinationTokenInfo;
}

interface UseExactOutProps {
  nexusSDK: NexusSDK | null;
  address?: Address;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  unifiedBalance: UserAsset[] | null;
  fetchBalance: () => Promise<void>;
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  prefill?: {
    toAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const useExactOut = ({
  nexusSDK,
  swapIntent,
  unifiedBalance,
  fetchBalance,
  onComplete,
  onStart,
  onError,
  prefill,
}: UseExactOutProps) => {
  const handleNexusError = useNexusError();

  const [inputs, setInputs] = useState<SwapInputs>({
    toChainID:
      (prefill?.toChainID as SUPPORTED_CHAINS_IDS) ?? SUPPORTED_CHAINS.OPTIMISM,
    toAmount: prefill?.toAmount ?? undefined,
  });
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [sourceExplorerUrl, setSourceExplorerUrl] = useState<string>("");
  const [destinationExplorerUrl, setDestinationExplorerUrl] =
    useState<string>("");
  const {
    steps,
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();
  const swapCompleted = useMemo(
    () => steps.some((s) => s.step?.type === "SWAP_COMPLETE" && s.completed),
    [steps]
  );
  const stopwatch = useStopwatch({
    running: isDialogOpen && !swapCompleted,
    intervalMs: 100,
  });

  const areInputsValid = useMemo(() => {
    return (
      inputs.toChainID !== undefined &&
      inputs.toToken &&
      inputs.toAmount &&
      Number(inputs.toAmount) > 0
    );
  }, [inputs]);

  const handleSwap = async () => {
    if (!nexusSDK || !areInputsValid || !inputs.toToken || !inputs.toAmount)
      return;
    try {
      onStart?.();
      setLoading(true);
      setTxError(null);
      seed(SWAP_EXPECTED_STEPS);

      const amountBigInt = nexusSDK.convertTokenReadableAmountToBigInt(
        inputs.toAmount,
        inputs.toToken.symbol,
        inputs.toChainID
      );
      const swapInput: ExactOutSwapInput = {
        toAmount: amountBigInt,
        toChainId: inputs.toChainID,
        toTokenAddress: inputs.toToken.tokenAddress,
      };
      const result = await nexusSDK.swapWithExactOut(swapInput, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args as SwapStepType & {
              explorerURL?: string;
              completed?: boolean;
            };
            if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
              setSourceExplorerUrl(step.explorerURL);
            }
            if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
              setDestinationExplorerUrl(step.explorerURL);
            }
            onStepComplete(step);
          }
        },
      });
      if (!result?.success) {
        throw new Error(result?.error || "Swap failed");
      }
      onComplete?.(swapIntent.current?.intent?.destination?.amount);
      swapIntent.current = null;

      await fetchBalance();
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      onError?.(message);
      swapIntent.current = null;
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      stopwatch.stop();
    }
  };

  const resetLocal = () => {
    setInputs({
      toChainID:
        (prefill?.toChainID as SUPPORTED_CHAINS_IDS) ??
        SUPPORTED_CHAINS.OPTIMISM,
      toAmount: prefill?.toAmount ?? undefined,
      toToken: undefined,
    });
    setIsDialogOpen(false);
    setTxError(null);
    resetSteps();
    swapIntent.current = null;
    setSourceExplorerUrl("");
    setDestinationExplorerUrl("");
    setLoading(false);
    stopwatch.stop();
  };

  useEffect(() => {
    if (prefill?.toToken && inputs.toChainID !== undefined && !inputs.toToken) {
      const tok = resolveDestinationFromPrefill(
        inputs.toChainID,
        prefill.toToken
      );
      if (tok) {
        setInputs((prev) => ({
          ...prev,
          toToken: tok,
        }));
      }
    }
  }, [prefill, unifiedBalance, inputs.toChainID, inputs.toToken]);

  useEffect(() => {
    if (!swapIntent || isDialogOpen) return;
    const id = setInterval(async () => {
      try {
        const updated = await swapIntent.current?.refresh();
        if (updated) {
          swapIntent.current!.intent = updated;
        }
      } catch (e) {
        console.error(e);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [swapIntent.current, isDialogOpen]);

  return {
    inputs,
    setInputs,
    loading,
    isDialogOpen,
    setIsDialogOpen,
    txError,
    setTxError,
    timer: stopwatch.seconds,
    steps,
    sourceExplorerUrl,
    destinationExplorerUrl,
    handleSwap,
    reset: resetLocal,
  };
};

export default useExactOut;
