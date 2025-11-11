import { useEffect, useMemo, useRef, useState } from "react";
import {
  NexusSDK,
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type SwapResult,
  NEXUS_EVENTS,
  type SwapStepType,
  parseUnits,
  type ExactOutSwapInput,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import { useNexus } from "../../../nexus/NexusProvider";
import {
  DESTINATION_SWAP_TOKENS,
  TOKEN_IMAGES,
} from "../../config/destination";

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
  onComplete?: (amount?: string) => void;
  prefill?: {
    toAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const EXPECTED_SWAP_STEPS: SwapStepType[] = [
  { type: "SWAP_START", typeID: "SWAP_START" } as SwapStepType,
  { type: "DETERMINING_SWAP", typeID: "DETERMINING_SWAP" } as SwapStepType,
  {
    type: "CREATE_PERMIT_FOR_SOURCE_SWAP",
    typeID:
      "CREATE_PERMIT_FOR_SOURCE_SWAP" as unknown as SwapStepType["typeID"],
  } as SwapStepType,
  {
    type: "SOURCE_SWAP_BATCH_TX",
    typeID: "SOURCE_SWAP_BATCH_TX",
  } as SwapStepType,
  {
    type: "SOURCE_SWAP_HASH",
    typeID: "SOURCE_SWAP_HASH" as unknown as SwapStepType["typeID"],
  } as SwapStepType,
  { type: "RFF_ID", typeID: "RFF_ID" } as SwapStepType,
  {
    type: "DESTINATION_SWAP_BATCH_TX",
    typeID: "DESTINATION_SWAP_BATCH_TX",
  } as SwapStepType,
  {
    type: "DESTINATION_SWAP_HASH",
    typeID: "DESTINATION_SWAP_HASH" as unknown as SwapStepType["typeID"],
  } as SwapStepType,
  { type: "SWAP_COMPLETE", typeID: "SWAP_COMPLETE" } as SwapStepType,
];

const useExactOut = ({ nexusSDK, onComplete, prefill }: UseExactOutProps) => {
  const {
    handleNexusError,
    swapIntent,
    setSwapIntent,
    fetchUnifiedBalance,
    unifiedBalance,
  } = useNexus();

  const [inputs, setInputs] = useState<SwapInputs>({
    toChainID:
      (prefill?.toChainID as SUPPORTED_CHAINS_IDS) ?? SUPPORTED_CHAINS.OPTIMISM,
    toAmount: prefill?.toAmount ?? undefined,
  });
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string>("");
  const [sourceExplorerUrl, setSourceExplorerUrl] = useState<string>("");
  const [destinationExplorerUrl, setDestinationExplorerUrl] =
    useState<string>("");
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: SwapStepType }>
  >([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const areInputsValid = useMemo(() => {
    return (
      inputs.toChainID !== undefined &&
      inputs.toToken &&
      inputs.toAmount &&
      Number(inputs.toAmount) > 0
    );
  }, [inputs]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    if (!timerRef.current) {
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((prev) => prev + 0.1), 100);
    }
  };

  const handleSwap = async () => {
    if (!nexusSDK || !areInputsValid || !inputs.toToken || !inputs.toAmount)
      return;
    setLoading(true);
    setTxError(null);
    // Seed steps with expected swap steps, all incomplete initially
    setSteps(
      EXPECTED_SWAP_STEPS.map((st, idx) => ({
        id: idx,
        completed: false,
        step: st,
      }))
    );
    try {
      const amountWei = parseUnits(inputs.toAmount, inputs.toToken.decimals);
      const swapInput: ExactOutSwapInput = {
        toAmount: amountWei,
        toChainId: inputs.toChainID,
        toTokenAddress: inputs.toToken.tokenAddress,
      };

      console.log("swapInput", swapInput);

      const result: SwapResult = await nexusSDK.swapWithExactOut(swapInput, {
        onEvent: (event) => {
          console.log("swap event", event);
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args as SwapStepType & {
              explorerURL?: string;
              completed?: boolean;
            };

            // Capture explorer URLs for source and destination txs
            if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
              setSourceExplorerUrl(step.explorerURL);
            }
            if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
              setDestinationExplorerUrl(step.explorerURL);
            }

            setSteps((prev) => {
              let existingIndex = -1;
              for (let i = 0; i < prev.length; i++) {
                const s = prev[i];
                if (s?.step?.type === step?.type) {
                  existingIndex = i;
                  break;
                }
              }
              if (existingIndex !== -1) {
                const updated = [...prev];
                const wasCompleted = updated[existingIndex].completed;
                const nowCompleted = step.completed === true;
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  completed: wasCompleted || nowCompleted,
                  step: { ...updated[existingIndex].step, ...step },
                };
                return updated;
              }
              return [
                ...prev,
                {
                  id: prev.length,
                  completed: step.completed === true,
                  step: step as SwapStepType,
                },
              ];
            });
          }
        },
      });

      if (!result?.success) {
        throw new Error(result?.error || "Swap failed");
      }
      setSwapIntent(null);
      onComplete?.(swapIntent?.intent?.destination?.amount);
      await fetchUnifiedBalance();
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setSwapIntent(null);
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      stopTimer();
    }
  };

  const reset = () => {
    setInputs({
      toChainID:
        (prefill?.toChainID as SUPPORTED_CHAINS_IDS) ??
        SUPPORTED_CHAINS.OPTIMISM,
      toAmount: prefill?.toAmount ?? undefined,
      toToken: undefined,
    });
    setIsDialogOpen(false);
    setTxError(null);
    setSteps([]);
    setExplorerUrl("");
    setSwapIntent(null);
    setSourceExplorerUrl("");
    setDestinationExplorerUrl("");
    setLoading(false);
    stopTimer();
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  // Start/stop timer based on dialog visibility (Accept clicked)
  useEffect(() => {
    if (isDialogOpen) {
      startTimer();
    } else {
      stopTimer();
    }
  }, [isDialogOpen]);

  // Apply token selections when prefilled and data is available
  useEffect(() => {
    // Source token prefill
    if (
      prefill?.toToken &&
      inputs.toChainID !== undefined &&
      !inputs.toToken &&
      unifiedBalance
    ) {
      const targetAddr = prefill.toToken.toLowerCase();
      let matchedAsset: (typeof unifiedBalance)[number] | undefined;
      let matchedBreakdown:
        | {
            chain?: { id?: number };
            contractAddress: `0x${string}`;
            decimals?: number;
          }
        | undefined;
      for (const a of unifiedBalance) {
        const candidate = a.breakdown?.find(
          (b) =>
            b.contractAddress?.toLowerCase() === targetAddr &&
            (b.chain?.id as number | undefined) === inputs.toChainID
        );
        if (candidate) {
          matchedAsset = a;
          matchedBreakdown = candidate as any;
          break;
        }
      }
      if (matchedAsset && matchedBreakdown) {
        setInputs((prev) => ({
          ...prev,
          toToken: {
            tokenAddress: matchedBreakdown.contractAddress,
            decimals: matchedBreakdown.decimals ?? matchedAsset.decimals,
            logo: TOKEN_IMAGES[matchedAsset.symbol] ?? "",
            name: matchedAsset.symbol,
            symbol: matchedAsset.symbol,
          },
        }));
      }
    }
    // Destination token prefill
    if (prefill?.toToken && inputs.toChainID !== undefined && !inputs.toToken) {
      const list = DESTINATION_SWAP_TOKENS.get(inputs.toChainID);
      const targetAddr = prefill.toToken.toLowerCase();
      const tok = list?.find(
        (t) => t.tokenAddress?.toLowerCase() === targetAddr
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
    // Do not refresh after the user has accepted the intent (dialog open)
    if (!swapIntent || isDialogOpen) return;
    const id = setInterval(async () => {
      try {
        const updated = await swapIntent.refresh();
        setSwapIntent({ ...swapIntent, intent: updated });
      } catch (e) {
        console.error(e);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [swapIntent, setSwapIntent, isDialogOpen]);

  return {
    inputs,
    setInputs,
    loading,
    isDialogOpen,
    setIsDialogOpen,
    txError,
    setTxError,
    timer,
    steps,
    explorerUrl,
    sourceExplorerUrl,
    destinationExplorerUrl,
    handleSwap,
    reset,
  };
};

export default useExactOut;
