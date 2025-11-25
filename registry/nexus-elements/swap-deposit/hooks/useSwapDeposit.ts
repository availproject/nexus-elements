import {
  NEXUS_EVENTS,
  NexusSDK,
  type OnSwapIntentHookData,
  type SwapStepType,
  type ExactInSwapInput,
  type ExecuteParams,
  type ExecuteSimulation,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import { RefObject, useMemo, useReducer } from "react";
import {
  SWAP_EXPECTED_STEPS,
  useNexusError,
  usePolling,
  useStopwatch,
  useTransactionSteps,
} from "../../common";
import { type Address } from "viem";
import { useAccount } from "wagmi";
import { useNexus } from "../../nexus/NexusProvider";

export type TransactionStatus =
  | "idle"
  | "set-source-assets"
  | "set-amount"
  | "view-breakdown"
  | "swapping"
  | "depositing"
  | "success"
  | "error";

interface SwapInputs extends ExactInSwapInput {
  toTokenSymbol: string;
}

type SwapDepositState = {
  inputs: SwapInputs | null;
  status: TransactionStatus;
  error: string | null;
  simulation: {
    executeSimulation: ExecuteSimulation;
    swapIntent: OnSwapIntentHookData;
  } | null;
  explorerUrls: {
    source: string | null;
    destination: string | null;
    depositUrl: string | null;
  };
  simulationLoading: boolean;
};

interface UseSwapDepositProps {
  nexusSDK: NexusSDK | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: string,
    amount: bigint,
    chainId: number,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
  fetchBalance: () => Promise<void>;
  onSwapComplete?: (amount?: string, explorerURL?: string) => void;
  onDepositComplete?: (explorerURL?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}

type Action =
  | { type: "setInputs"; payload: Partial<SwapInputs> }
  | {
      type: "setSimulation";
      payload: {
        executeSimulation: ExecuteSimulation;
        swapIntent: OnSwapIntentHookData;
      };
    }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus }
  | { type: "setError"; payload: string | null }
  | { type: "setSimulationLoading"; payload: boolean }
  | {
      type: "setExplorerUrls";
      payload: {
        source: string | null;
        destination: string | null;
        depositUrl: string | null;
      };
    }
  | { type: "reset" };

const initialState: SwapDepositState = {
  inputs: null,
  status: "idle",
  error: null,
  simulation: null,
  explorerUrls: {
    source: null,
    destination: null,
    depositUrl: null,
  },
  simulationLoading: false,
};

function reducer(state: SwapDepositState, action: Action): SwapDepositState {
  switch (action.type) {
    case "setInputs": {
      const merged = state.inputs
        ? { ...state.inputs, ...action.payload }
        : { ...action.payload };
      if (
        merged.from !== undefined &&
        merged.toChainId !== undefined &&
        merged.toTokenAddress !== undefined
      ) {
        // Automatic status transitions based on input state
        let newStatus = state.status;
        const hasSourceAssets =
          merged.from !== undefined && merged.from.length > 0;
        const hasAmount = merged.from?.[0]?.amount !== undefined;

        if (!hasSourceAssets) {
          newStatus = "idle";
        } else if (hasSourceAssets && !hasAmount) {
          newStatus = "set-source-assets";
        } else if (hasSourceAssets && hasAmount) {
          newStatus = "set-amount";
        }

        return {
          ...state,
          inputs: merged as SwapInputs,
          status: newStatus,
          error: null, // Clear error when inputs change
        };
      }
      return state;
    }
    case "setSimulation": {
      return {
        ...state,
        simulation: action.payload,
        status: "view-breakdown", // Transition to view-breakdown when simulation is ready
      };
    }
    case "resetInputs":
      return {
        ...state,
        inputs: null,
      };
    case "setStatus":
      return { ...state, status: action.payload };
    case "setError":
      return { ...state, error: action.payload };
    case "setExplorerUrls":
      return {
        ...state,
        explorerUrls: { ...state.explorerUrls, ...action.payload },
      };
    case "setSimulationLoading":
      return { ...state, simulationLoading: action.payload };
    case "reset":
      return { ...initialState };
    default:
      return state;
  }
}

const useSwapDeposit = ({
  nexusSDK,
  swapIntent,
  fetchBalance,
  onSwapComplete,
  onDepositComplete,
  onStart,
  onError,
  executeDeposit,
}: UseSwapDepositProps) => {
  const { getFiatValue } = useNexus();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { address } = useAccount();
  const loading = state.status === "swapping" || state.status === "depositing";
  const setInputs = (next: SwapInputs | Partial<SwapInputs>) => {
    dispatch({ type: "setInputs", payload: next as Partial<SwapInputs> });
  };
  const handleNexusError = useNexusError();
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
    running:
      (state.status === "swapping" || state.status === "depositing") &&
      !swapCompleted,
    intervalMs: 100,
  });

  const handleSwap = async () => {
    if (!nexusSDK || !state.inputs || loading) return;
    onStart?.();
    dispatch({ type: "setStatus", payload: "swapping" });
    seed(SWAP_EXPECTED_STEPS);
    try {
      const swapResult = await nexusSDK?.swapWithExactIn(state.inputs, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args as SwapStepType & {
              explorerURL?: string;
              completed?: boolean;
            };
            if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: { ...state.explorerUrls, source: step.explorerURL },
              });
            }
            if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: {
                  ...state.explorerUrls,
                  destination: step.explorerURL,
                },
              });
            }
            onStepComplete(step);
          }
        },
      });

      if (!swapResult?.success) {
        throw new Error(swapResult?.error || "Swap failed");
      }

      const finalSwap = swapResult.result.destinationSwap?.swaps[0];
      if (finalSwap) {
        onSwapComplete?.(
          nexusSDK.utils.formatUnits(
            finalSwap?.outputAmount,
            finalSwap?.outputDecimals
          ),
          swapResult.result.explorerURL
        );
        await handleDeposit(finalSwap.outputAmount);
      }

      swapIntent.current = null;
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setError", payload: message });
      dispatch({ type: "setStatus", payload: "error" });
      onError?.(message);
    }
  };

  const handleDeposit = async (amount: bigint) => {
    if (!nexusSDK || !state.inputs || loading || !address) return;
    onStart?.();
    dispatch({ type: "setStatus", payload: "depositing" });
    try {
      const executeParams = executeDeposit(
        state.inputs.toTokenSymbol,
        state.inputs.toTokenAddress,
        amount,
        state.inputs.toChainId,
        address
      );
      const depositResult = await nexusSDK.execute({
        ...executeParams,
        toChainId: state.inputs.toChainId,
      });

      if (!depositResult) {
        throw new Error("Deposit failed");
      }
      dispatch({
        type: "setExplorerUrls",
        payload: {
          ...state.explorerUrls,
          depositUrl: depositResult.explorerUrl,
        },
      });
      onDepositComplete?.(depositResult.explorerUrl);
      await fetchBalance();
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setError", payload: message });
      dispatch({ type: "setStatus", payload: "error" });
      onError?.(message);
    } finally {
      dispatch({ type: "setStatus", payload: "success" });
    }
  };

  const simulateDeposit = async () => {
    if (
      !nexusSDK ||
      !state.inputs ||
      loading ||
      !address ||
      !swapIntent.current
    )
      return;
    onStart?.();
    try {
      const executeParams = executeDeposit(
        state.inputs.toTokenSymbol,
        state.inputs.toTokenAddress,
        nexusSDK.utils.parseUnits(
          swapIntent.current?.intent.destination.amount,
          swapIntent.current?.intent?.destination?.token?.decimals
        ),
        state.inputs.toChainId,
        address
      );
      const depositResult = await nexusSDK.simulateExecute({
        ...executeParams,
        toChainId: state.inputs.toChainId,
      });

      if (!depositResult) {
        throw new Error("Simulation failed");
      }
      dispatch({
        type: "setSimulation",
        payload: {
          executeSimulation: depositResult,
          swapIntent: swapIntent.current,
        },
      });
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setError", payload: message });
      dispatch({ type: "setStatus", payload: "error" });
      onError?.(message);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
      // Status is set to "view-breakdown" via setSimulation action in reducer
    }
  };

  const reset = () => {
    dispatch({ type: "reset" });
    resetSteps();
    swapIntent.current = null;
    stopwatch.stop();
    stopwatch.reset();
  };

  const refreshSimulation = async () => {
    try {
      dispatch({ type: "setSimulationLoading", payload: true });
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current!.intent = updated;
      }
      await simulateDeposit();
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
    }
  };

  const feeBreakdown: {
    totalGasFee: string | number;
    gasUsd: number;
    gasFormatted: string;
  } = useMemo(() => {
    if (!nexusSDK || !state.simulation || !state.inputs)
      return {
        totalGasFee: 0,
        gasUsd: 0,
        gasFormatted: "0",
      };
    const native = CHAIN_METADATA[state.inputs.toChainId]?.nativeCurrency;
    const nativeSymbol = native.symbol;
    const nativeDecimals = native.decimals;

    const gasFormatted =
      nexusSDK?.utils?.formatTokenBalance(
        state.simulation.executeSimulation?.gasFee,
        {
          symbol: nativeSymbol,
          decimals: nativeDecimals,
        }
      ) ?? "0";
    const gasUnits = Number.parseFloat(
      nexusSDK?.utils?.formatUnits(
        state.simulation.executeSimulation?.gasFee,
        nativeDecimals
      )
    );

    const gasUsd = getFiatValue(gasUnits, nativeSymbol);
    return {
      totalGasFee: gasUsd,
      gasUsd,
      gasFormatted,
    };
  }, [nexusSDK, getFiatValue, state.simulation, state.inputs]);

  usePolling(
    Boolean(swapIntent.current) &&
      !(
        state.status === "swapping" ||
        state.status === "depositing" ||
        state.status === "error" ||
        state.status === "success"
      ),
    async () => {
      await refreshSimulation();
    },
    15000
  );

  return {
    loading,
    inputs: state.inputs,
    txError: state.error,
    setTxError: (error: string | null) => {
      dispatch({ type: "setError", payload: error });
    },
    setInputs,
    timer: stopwatch.seconds,
    explorerUrls: state.explorerUrls,
    simulation: state.simulation,
    simulationLoading: state.simulationLoading,
    reset,
    handleSwap,
    status: state.status,
    feeBreakdown,
  };
};

export default useSwapDeposit;
