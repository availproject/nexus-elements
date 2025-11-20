import { type RefObject, useEffect, useMemo, useState } from "react";
import {
  NexusSDK,
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type ExactInSwapInput,
  NEXUS_EVENTS,
  type SwapStepType,
  type OnSwapIntentHookData,
  type UserAsset,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import {
  resolveDestinationFromPrefill,
  resolveSourceFromPrefill,
} from "../../utils/prefill";
import {
  useStopwatch,
  useTransactionSteps,
  SWAP_EXPECTED_STEPS,
  useNexusError,
} from "../../../common";

type SourceTokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};
type DestinationTokenInfo = {
  tokenAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};

interface SwapInputs {
  fromChainID: SUPPORTED_CHAINS_IDS;
  fromToken?: SourceTokenInfo;
  fromAmount?: string;
  toChainID: SUPPORTED_CHAINS_IDS;
  toToken?: DestinationTokenInfo;
}

interface UseExactInProps {
  nexusSDK: NexusSDK | null;
  address?: Address;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  unifiedBalance: UserAsset[] | null;
  fetchBalance: () => Promise<void>;
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  prefill?: {
    fromChainID?: number;
    fromToken?: string;
    fromAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const useExactIn = ({
  nexusSDK,
  swapIntent,
  unifiedBalance,
  fetchBalance,
  onComplete,
  onStart,
  onError,
  prefill,
}: UseExactInProps) => {
  const handleNexusError = useNexusError();

  const [inputs, setInputs] = useState<SwapInputs>({
    fromChainID:
      (prefill?.fromChainID as SUPPORTED_CHAINS_IDS) ?? SUPPORTED_CHAINS.BASE,
    toChainID:
      (prefill?.toChainID as SUPPORTED_CHAINS_IDS) ?? SUPPORTED_CHAINS.OPTIMISM,
    fromAmount: prefill?.fromAmount ?? undefined,
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
      inputs.fromChainID !== undefined &&
      inputs.toChainID !== undefined &&
      inputs.fromToken &&
      inputs.toToken &&
      inputs.fromAmount &&
      Number(inputs.fromAmount) > 0
    );
  }, [inputs]);

  const handleSwap = async () => {
    if (
      !nexusSDK ||
      !areInputsValid ||
      !inputs.fromToken ||
      !inputs.toToken ||
      !inputs.fromAmount
    )
      return;
    try {
      onStart?.();
      setLoading(true);
      setTxError(null);
      seed(SWAP_EXPECTED_STEPS);
      const amountBigInt = nexusSDK.convertTokenReadableAmountToBigInt(
        inputs.fromAmount,
        inputs.fromToken.symbol,
        inputs.fromChainID
      );
      const swapInput: ExactInSwapInput = {
        from: [
          {
            chainId: inputs.fromChainID,
            amount: amountBigInt,
            tokenAddress: inputs.fromToken.contractAddress,
          },
        ],
        toChainId: inputs.toChainID,
        toTokenAddress: inputs.toToken.tokenAddress,
      };
      const result = await nexusSDK.swapWithExactIn(swapInput, {
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
      fromChainID:
        (prefill?.fromChainID as SUPPORTED_CHAINS_IDS) ?? SUPPORTED_CHAINS.BASE,
      toChainID:
        (prefill?.toChainID as SUPPORTED_CHAINS_IDS) ??
        SUPPORTED_CHAINS.OPTIMISM,
      fromAmount: prefill?.fromAmount ?? undefined,
      fromToken: undefined,
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
    if (
      prefill?.fromToken &&
      inputs.fromChainID !== undefined &&
      !inputs.fromToken
    ) {
      const src = resolveSourceFromPrefill(
        unifiedBalance,
        inputs.fromChainID,
        prefill.fromToken
      );
      if (src) {
        setInputs((prev) => ({ ...prev, fromToken: src }));
      }
    }
    if (prefill?.toToken && inputs.toChainID !== undefined && !inputs.toToken) {
      const dst = resolveDestinationFromPrefill(
        inputs.toChainID,
        prefill.toToken
      );
      if (dst) {
        setInputs((prev) => ({ ...prev, toToken: dst }));
      }
    }
  }, [
    prefill,
    unifiedBalance,
    inputs.fromChainID,
    inputs.toChainID,
    inputs.fromToken,
    inputs.toToken,
  ]);

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
    areInputsValid,
  };
};

export default useExactIn;
