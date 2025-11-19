"use client";

import {
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
  NexusSDK,
  type OnIntentHookData,
  type OnAllowanceHookData,
  type ExecuteParams,
  type BridgeAndExecuteParams,
  type BridgeAndExecuteResult,
  type BridgeAndExecuteSimulationResult,
  TOKEN_METADATA,
  NEXUS_EVENTS,
  type BridgeStepType,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useReducer,
  RefObject,
} from "react";
import { useNexus } from "../../nexus/NexusProvider";
import { type Address } from "viem";
import {
  TransactionStatus,
  useDebouncedValue,
  useNexusError,
  usePolling,
  useStopwatch,
  useTransactionSteps,
} from "../../common";

interface DepositInputs {
  chain: SUPPORTED_CHAINS_IDS;
  amount?: string;
  selectedSources: number[];
}

interface UseDepositProps {
  token: SUPPORTED_TOKENS;
  chain: SUPPORTED_CHAINS_IDS;
  nexusSDK: NexusSDK | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  unifiedBalance: UserAsset[] | null;
  chainOptions?: { id: number; name: string; logo: string }[];
  address: Address;
  executeBuilder?: (
    token: SUPPORTED_TOKENS,
    amount: string,
    chainId: SUPPORTED_CHAINS_IDS,
    userAddress: `0x${string}`
  ) => Omit<ExecuteParams, "toChainId">;
  executeConfig?: Omit<ExecuteParams, "toChainId">;
}

type DepositState = {
  inputs: DepositInputs;
  status: TransactionStatus;
};
type Action =
  | { type: "setInputs"; payload: Partial<DepositInputs> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus };

const useDeposit = ({
  token,
  chain,
  nexusSDK,
  intent,
  unifiedBalance,
  chainOptions,
  address,
  executeBuilder,
  executeConfig,
  allowance,
}: UseDepositProps) => {
  const { fetchUnifiedBalance, getFiatValue } = useNexus();
  const handleNexusError = useNexusError();

  const allSourceIds = useMemo(
    () => chainOptions?.map((c) => c.id) ?? [],
    [chainOptions]
  );
  const initialState: DepositState = {
    inputs: {
      chain,
      amount: undefined,
      selectedSources: allSourceIds,
    },
    status: "idle",
  };

  function reducer(state: DepositState, action: Action): DepositState {
    switch (action.type) {
      case "setInputs":
        return { ...state, inputs: { ...state.inputs, ...action.payload } };
      case "resetInputs":
        return {
          ...state,
          inputs: { chain, amount: undefined, selectedSources: allSourceIds },
        };
      case "setStatus":
        return { ...state, status: action.payload };
      default:
        return state;
    }
  }

  const [state, dispatch] = useReducer(reducer, initialState);
  const inputs = state.inputs;
  const setInputs = (next: Partial<DepositInputs>) => {
    dispatch({ type: "setInputs", payload: next });
  };

  const loading = state.status === "executing";
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [simulation, setSimulation] =
    useState<BridgeAndExecuteSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [autoAllow, setAutoAllow] = useState(false);
  const [lastResult, setLastResult] = useState<BridgeAndExecuteResult | null>(
    null
  );
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<BridgeStepType>();

  const simulationRequestIdRef = useRef(0);
  const activeSimulationIdRef = useRef<number | null>(null);

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === token);
  }, [unifiedBalance, token]);

  const allCompleted = useMemo(
    () => (steps?.length ?? 0) > 0 && steps.every((s) => s.completed),
    [steps]
  );
  const stopwatch = useStopwatch({
    running: isDialogOpen && !allCompleted,
    intervalMs: 100,
  });
  // Debounce amount input for auto-simulation UX
  const debouncedAmount = useDebouncedValue(inputs?.amount ?? "", 1200);

  const feeBreakdown: {
    totalGasFee: string | number;
    bridgeUsd?: number;
    bridgeFormatted?: string;
    gasUsd: number;
    gasFormatted: string;
  } = useMemo(() => {
    if (!nexusSDK || !simulation || !token)
      return {
        totalGasFee: 0,
        bridgeUsd: 0,
        bridgeFormatted: "0",
        gasUsd: 0,
        gasFormatted: "0",
      };
    const native = CHAIN_METADATA[chain]?.nativeCurrency;
    const nativeSymbol = native.symbol;
    const nativeDecimals = native.decimals;

    const gasFormatted =
      nexusSDK?.utils?.formatTokenBalance(
        simulation?.executeSimulation?.gasFee,
        {
          symbol: nativeSymbol,
          decimals: nativeDecimals,
        }
      ) ?? "0";
    const gasUnits = Number.parseFloat(
      nexusSDK?.utils?.formatUnits(
        simulation?.executeSimulation?.gasFee,
        nativeDecimals
      )
    );

    const gasUsd = getFiatValue(gasUnits, nativeSymbol);
    if (simulation?.bridgeSimulation) {
      const tokenDecimals =
        simulation?.bridgeSimulation?.intent?.token?.decimals;
      const bridgeFormatted =
        nexusSDK?.utils?.formatTokenBalance(
          simulation?.bridgeSimulation?.intent?.fees?.total,
          {
            symbol: token,
            decimals: tokenDecimals,
          }
        ) ?? "0";
      const bridgeUsd = getFiatValue(
        Number.parseFloat(simulation?.bridgeSimulation?.intent?.fees?.total),
        token
      );

      const totalGasFee = bridgeUsd + gasUsd;

      return {
        totalGasFee: totalGasFee.toFixed(4),
        bridgeUsd,
        bridgeFormatted,
        gasUsd,
        gasFormatted,
      };
    }
    return {
      totalGasFee: gasUsd,
      gasUsd,
      gasFormatted,
    };
  }, [nexusSDK, simulation, chain, token, getFiatValue]);

  const handleTransaction = async () => {
    if (!inputs?.amount || !inputs?.chain) return;
    dispatch({ type: "setStatus", payload: "executing" });
    setTxError(null);
    try {
      if (!nexusSDK) throw new Error("Nexus SDK not initialized");
      const decimals = TOKEN_METADATA[token].decimals;
      const amountBigInt = nexusSDK?.utils?.parseUnits(inputs.amount, decimals);
      const executeParams: Omit<ExecuteParams, "toChainId"> | undefined =
        executeBuilder
          ? executeBuilder(token, inputs.amount, inputs.chain, address)
          : executeConfig;
      const params: BridgeAndExecuteParams = {
        token,
        amount: amountBigInt,
        toChainId: inputs.chain,
        sourceChains: inputs.selectedSources?.length
          ? inputs.selectedSources
          : allSourceIds,
        execute: executeParams as Omit<ExecuteParams, "toChainId">,
        waitForReceipt: true,
      };

      const result: BridgeAndExecuteResult = await nexusSDK.bridgeAndExecute(
        params,
        {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.STEPS_LIST) {
              const list = Array.isArray(event.args) ? event.args : [];
              onStepsList(list);
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              onStepComplete(event.args);
            }
          },
        }
      );

      if (!result) {
        setTxError("Transaction rejected by user");
        setIsDialogOpen(false);
        resetState();
        return;
      }
      setLastResult(result);
      await onSuccess();
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setIsDialogOpen(false);
      dispatch({ type: "setStatus", payload: "error" });
    } finally {
      resetState();
    }
  };

  const simulate = async (overrideAmount?: string) => {
    if (!nexusSDK) return;

    const amountToUse = overrideAmount ?? inputs?.amount;

    if (!amountToUse || !inputs?.chain) {
      activeSimulationIdRef.current = null;
      setSimulation(null);
      return;
    }
    if (
      Number.parseFloat(amountToUse) >
      Number.parseFloat(filteredUnifiedBalance?.balance ?? "0")
    ) {
      activeSimulationIdRef.current = null;
      setTxError("Insufficient balance");
      setSimulation(null);
      return;
    }
    const requestId = ++simulationRequestIdRef.current;
    activeSimulationIdRef.current = requestId;
    setSimulating(true);
    try {
      const decimals = TOKEN_METADATA[token].decimals;
      const amountBigInt = nexusSDK?.utils?.parseUnits(amountToUse, decimals);
      const executeParams: Omit<ExecuteParams, "toChainId"> | undefined =
        executeBuilder
          ? executeBuilder(token, amountToUse, inputs.chain, address)
          : executeConfig;
      const params: BridgeAndExecuteParams = {
        token,
        amount: amountBigInt,
        toChainId: inputs.chain,
        sourceChains: inputs.selectedSources?.length
          ? inputs.selectedSources
          : allSourceIds,
        execute: executeParams as Omit<ExecuteParams, "toChainId">,
        waitForReceipt: false,
      };
      const sim = await nexusSDK.simulateBridgeAndExecute(params);
      if (activeSimulationIdRef.current !== requestId) {
        return;
      }
      if (sim) {
        setTxError(null);
        setSimulation(sim);
      } else {
        setSimulation(null);
        setTxError("Simulation failed");
      }
    } catch (error) {
      if (activeSimulationIdRef.current !== requestId) {
        return;
      }
      setSimulation(null);
      const { message } = handleNexusError(error);
      setTxError(message);
    } finally {
      if (activeSimulationIdRef.current === requestId) {
        setSimulating(false);
      }
    }
  };

  const refreshSimulation = async () => {
    if (simulating || refreshing) return;
    if (!simulation?.bridgeSimulation?.intent) return;
    if (!inputs?.amount) return;
    setRefreshing(true);
    await simulate(inputs?.amount);
    setRefreshing(false);
  };

  const onSuccess = async () => {
    stopwatch.stop();
    dispatch({ type: "setStatus", payload: "success" });
    await fetchUnifiedBalance();
  };

  const resetState = () => {
    allowance.current = null;
    setInputs({
      chain,
      amount: undefined,
      selectedSources: allSourceIds,
    });
    setRefreshing(false);
    setSimulation(null);
    intent.current = null;
    activeSimulationIdRef.current = null;
    setSimulating(false);
    resetSteps();
    stopwatch.stop();
    stopwatch.reset();
    dispatch({ type: "setStatus", payload: "idle" });
  };

  const reset = () => {
    intent.current?.deny();
    resetState();
  };

  const startTransaction = () => {
    setIsDialogOpen(true);
    setTxError(null);
    setAutoAllow(true);
    void handleTransaction();
  };

  // Automatically simulate once required inputs are present and user stops typing
  useEffect(() => {
    const hasRequiredInputs =
      Boolean(debouncedAmount) && Boolean(inputs?.chain) && Boolean(token);
    if (!hasRequiredInputs) return;
    void simulate(debouncedAmount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAmount, inputs?.chain, token]);

  useEffect(() => {
    if (autoAllow && intent.current) {
      intent.current.allow();
      setAutoAllow(false);
    }
  }, [autoAllow, intent.current]);

  useEffect(() => {
    if (!isDialogOpen) {
      stopwatch.stop();
      stopwatch.reset();
      setLastResult(null);
    }
  }, [isDialogOpen, stopwatch]);

  usePolling(
    Boolean(simulation?.bridgeSimulation?.intent) && !isDialogOpen,
    async () => {
      await refreshSimulation();
    },
    15000
  );

  return {
    inputs,
    setInputs,
    loading,
    simulating,
    refreshing,
    isDialogOpen,
    setIsDialogOpen,
    txError,
    setTxError,
    timer: stopwatch.seconds,
    filteredUnifiedBalance,
    simulation,
    lastResult,
    steps,
    handleTransaction,
    startTransaction,
    reset,
    simulate,
    feeBreakdown,
    cancelSimulation: () => {
      activeSimulationIdRef.current = null;
      setSimulating(false);
      setRefreshing(false);
      setSimulation(null);
    },
  };
};

export default useDeposit;
