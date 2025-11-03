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
import type { Address } from "viem";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: ProgressStep }>
  >([]);
  const [swapExplorerUrl, setSwapExplorerUrl] = useState<string>("");
  const [executeExplorerUrl, setExecuteExplorerUrl] = useState<string>("");
  const [executeSimGas, setExecuteSimGas] = useState<string | null>(null);

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
    console.log("handleStart", nexusSDK, areInputsValid);
    if (!nexusSDK || !areInputsValid) return;
    setLoading(true);
    setTxError(null);
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
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args;
            setSteps((prev) =>
              prev.map((s) =>
                s.step?.typeID === step?.typeID
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
          }
        },
      });
      if (!result?.success) throw new Error(result?.error || "Swap failed");
      setSwapExplorerUrl(result.result.explorerURL);
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setLoading(false);
    }
  };

  const acceptAndRun = async () => {
    if (!nexusSDK || !swapIntent) return;
    try {
      swapIntent.allow();
      startTimer();
      setIsDialogOpen(true);
      await new Promise((r) => setTimeout(r, 1500));

      // Build execute params with exact destination amount via provided builder
      const builder = executeBuilder(
        swapIntent.intent.destination.amount,
        address
      );
      const execParams = {
        toChainId: SUPPORTED_CHAINS.ARBITRUM,
        ...builder,
      } as const;

      // Reset steps for execute phase (bridge-style events)
      setSteps([]);

      const execRes: ExecuteResult = await nexusSDK.execute(execParams);
      if (!execRes?.transactionHash) throw new Error("Execute failed");
      setExecuteExplorerUrl(execRes.explorerUrl);
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      stopTimer();
    }
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
      if (sim?.success) {
        setExecuteSimGas(sim.gasFee.toString());
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
    setSwapIntent(null);
    setIsDialogOpen(false);
    setLoading(false);
  };

  const reset = () => {
    setInputs({});
    setTxError(null);
    setSteps([]);
    setSwapExplorerUrl("");
    setExecuteExplorerUrl("");
    setIsDialogOpen(false);
    setLoading(false);
    stopTimer();
  };

  // Auto-refresh swap intent every 15s during review phase
  useEffect(() => {
    if (!swapIntent) return;
    const id = setInterval(async () => {
      try {
        const updated = await swapIntent.refresh();
        setSwapIntent({ ...swapIntent, intent: updated });
        await simulateExecute();
      } catch (error) {
        console.error(error);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [swapIntent, setSwapIntent]);

  useEffect(() => () => stopTimer(), []);

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
    handleStart,
    acceptAndRun,
    simulateExecute,
    deny,
    reset,
  };
};

export default useSwapExecuteExactOut;
