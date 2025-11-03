import { useEffect, useMemo, useRef, useState } from "react";
import {
  NexusSDK,
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type ExactInSwapInput,
  type SwapResult,
  NEXUS_EVENTS,
  type SwapStepType,
  parseUnits,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import { useNexus } from "../../../nexus/NexusProvider";

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
}

const useExactIn = ({ nexusSDK }: UseExactInProps) => {
  const { handleNexusError } = useNexus();

  const [inputs, setInputs] = useState<SwapInputs>({
    fromChainID: SUPPORTED_CHAINS.BASE,
    toChainID: SUPPORTED_CHAINS.OPTIMISM,
  });
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string>("");
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: SwapStepType }>
  >([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (
      !nexusSDK ||
      !areInputsValid ||
      !inputs.fromToken ||
      !inputs.toToken ||
      !inputs.fromAmount
    )
      return;
    setLoading(true);
    setIsDialogOpen(true);
    setTxError(null);
    setSteps([]);
    startTimer();
    try {
      const amountWei = parseUnits(
        inputs.fromAmount,
        inputs.fromToken.decimals
      );
      const swapInput: ExactInSwapInput = {
        from: [
          {
            chainId: inputs.fromChainID,
            amount: amountWei,
            tokenAddress: inputs.fromToken.contractAddress,
          },
        ],
        toChainId: inputs.toChainID,
        toTokenAddress: inputs.toToken.tokenAddress,
      };

      console.log("swapInput", swapInput);

      const result: SwapResult = await nexusSDK.swapWithExactIn(swapInput, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args;
            setSteps((prev) => {
              const exists = prev.find((s) => s.step?.typeID === step?.typeID);
              if (exists) {
                return prev.map((s) =>
                  s.step?.typeID === step?.typeID
                    ? { ...s, completed: true }
                    : s
                );
              }
              return [...prev, { id: prev.length, completed: true, step }];
            });
          }
        },
      });

      if (!result?.success) {
        throw new Error(result?.error || "Swap failed");
      }
      setExplorerUrl(result.result.explorerURL);
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      stopTimer();
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

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
    handleSwap,
  };
};

export default useExactIn;
