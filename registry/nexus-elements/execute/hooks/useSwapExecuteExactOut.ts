import { useEffect, useMemo, useRef, useState } from "react";
import {
  type NexusSDK,
  NEXUS_EVENTS,
  type SwapStepType,
  type BridgeStepType,
  parseUnits,
  SUPPORTED_CHAINS,
  type ExactOutSwapInput,
  type ExecuteResult,
  type ExecuteParams,
  TOKEN_CONTRACT_ADDRESSES,
} from "@avail-project/nexus-core";
import { formatUnits, type Address } from "viem";
import { useNexus } from "../../nexus/NexusProvider";

type ProgressStep = SwapStepType | BridgeStepType;

interface UseSwapExecuteExactOutProps {
  nexusSDK: NexusSDK | null;
  address: Address;
  executeBuilder: (
    amount: string,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
}

const EXPECTED_SWAP_STEPS: SwapStepType[] = [
  { type: "SWAP_START", typeID: "SWAP_START" } as SwapStepType,
  { type: "DETERMINING_SWAP", typeID: "DETERMINING_SWAP" } as SwapStepType,
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
  {
    type: "CREATE_PERMIT_FOR_SOURCE_SWAP",
    typeID:
      "CREATE_PERMIT_FOR_SOURCE_SWAP" as unknown as SwapStepType["typeID"],
  } as SwapStepType,
  {
    type: "CREATE_PERMIT_EOA_TO_EPHEMERAL",
    typeID:
      "CREATE_PERMIT_EOA_TO_EPHEMERAL" as unknown as SwapStepType["typeID"],
  } as SwapStepType,
  { type: "SWAP_COMPLETE", typeID: "SWAP_COMPLETE" } as SwapStepType,
];

interface InputsState {
  amount?: string; // destination amount (USDT on Arbitrum)
}

const useSwapExecuteExactOut = ({
  nexusSDK,
  address,
  executeBuilder,
}: UseSwapExecuteExactOutProps) => {
  const { handleNexusError, swapIntent, setSwapIntent } = useNexus();

  const [inputs, setInputs] = useState<InputsState>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: ProgressStep }>
  >([]);
  const [swapExplorerUrl, setSwapExplorerUrl] = useState<string>("");
  const [executeExplorerUrl, setExecuteExplorerUrl] = useState<string>("");
  const [executeSimGas, setExecuteSimGas] = useState<string | null>(null);
  const [executeCompleted, setExecuteCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const areInputsValid = useMemo(() => {
    return inputs.amount !== undefined && Number(inputs.amount) > 0;
  }, [inputs]);

  const startTimer = () => {
    if (!timerRef.current) {
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((prev) => prev + 0.1), 100);
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStart = async () => {
    if (!nexusSDK || !areInputsValid) return;
    setLoading(true);
    setTxError(null);
    setExecuteCompleted(false);
    setSteps(
      EXPECTED_SWAP_STEPS.map((st, idx) => ({
        id: idx,
        completed: false,
        step: st,
      }))
    );
    try {
      const toAmount = parseUnits(inputs.amount as string, 6);
      const input: ExactOutSwapInput = {
        toChainId: SUPPORTED_CHAINS.ARBITRUM,
        toTokenAddress: TOKEN_CONTRACT_ADDRESSES.USDT[
          SUPPORTED_CHAINS.ARBITRUM
        ] as `0x${string}`,
        toAmount,
      };

      // Begin swap to raise intent; keep promise to await after accept
      const result = await nexusSDK.swapWithExactOut(input, {
        onEvent: (event) => {
          console.log("swap event", event);
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step: any = event.args;
            setSteps((prev) =>
              prev.map((s) =>
                s.step?.type === step?.type
                  ? {
                      ...s,
                      completed: true,
                      step: {
                        ...(s.step as SwapStepType),
                        ...step,
                      },
                    }
                  : s
              )
            );
            // Capture explorer URLs from source/destination hash events when available
            const url: string | undefined = step?.explorerURL;
            if (url && step?.type === "SOURCE_SWAP_HASH") {
              setSwapExplorerUrl(url);
            }
            if (url && step?.type === "DESTINATION_SWAP_HASH") {
              // Prefer destination tx URL if provided
              setSwapExplorerUrl((prev) => prev || url);
            }
          }
        },
      });
      console.log("exact out swap result", result);
      if (!result?.success) throw new Error("Swap failed");
      setSwapExplorerUrl((prev) => prev || result.result.explorerURL);

      const builder = executeBuilder(
        swapIntent?.intent.destination.amount ?? (inputs.amount as string),
        address
      );
      const execParams = {
        toChainId: SUPPORTED_CHAINS.ARBITRUM,
        ...builder,
      } as const;

      const execRes: ExecuteResult = await nexusSDK.execute(execParams);
      if (!execRes?.transactionHash) throw new Error("Execute failed");
      setExecuteExplorerUrl(execRes.explorerUrl);
      setExecuteCompleted(true);
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setIsDialogOpen(false);
      setLoading(false);
    } finally {
      setLoading(false);
      stopTimer();
      setSwapIntent(null);
      setInputs({});
      stopTimer();
    }
  };

  const acceptAndRun = async () => {
    if (!nexusSDK || !swapIntent) return;
    swapIntent.allow();
    startTimer();
    setIsDialogOpen(true);
  };

  const simulateExecute = async () => {
    if (!nexusSDK || !swapIntent) return;
    try {
      const builder = executeBuilder(
        swapIntent.intent.destination.amount,
        address
      );
      const sim = await nexusSDK.simulateExecute({
        toChainId: SUPPORTED_CHAINS.ARBITRUM,
        ...builder,
      });
      console.log("simulate execute", sim);
      if (sim) {
        setExecuteSimGas(formatUnits(sim.gasFee, 18));
      } else {
        setExecuteSimGas(null);
      }
    } catch (error) {
      console.error(error);
      setExecuteSimGas(null);
    }
  };

  const deny = () => {
    if (swapIntent) swapIntent.deny();
    reset();
  };

  const reset = () => {
    setSwapIntent(null);
    setInputs({});
    setTxError(null);
    setSteps([]);
    setSwapExplorerUrl("");
    setExecuteExplorerUrl("");
    setExecuteCompleted(false);
    setIsDialogOpen(false);
    setLoading(false);
    stopTimer();
    setExecuteSimGas(null);
  };

  // Auto-refresh swap intent every 15s during review phase
  useEffect(() => {
    if (!swapIntent || isDialogOpen) return;
    const id = setInterval(async () => {
      setRefreshing(true);
      try {
        const updated = await swapIntent.refresh();
        setSwapIntent({ ...swapIntent, intent: updated });
        await simulateExecute();
      } catch (error) {
        console.error(error);
      } finally {
        setRefreshing(false);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [swapIntent, setSwapIntent]);

  useEffect(() => {
    if (!swapIntent || refreshing) return;
    if (!executeSimGas) {
      void simulateExecute();
    }
  }, [swapIntent, executeSimGas, refreshing]);

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
    swapExplorerUrl,
    executeExplorerUrl,
    executeSimGas,
    setExecuteSimGas,
    executeCompleted,
    handleStart,
    acceptAndRun,
    simulateExecute,
    deny,
    reset,
    refreshing,
  };
};

export default useSwapExecuteExactOut;
