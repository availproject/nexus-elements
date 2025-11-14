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
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState, useReducer } from "react";
import { useNexus } from "../../nexus/NexusProvider";
import { type Address } from "viem";
import { useStopwatch } from "../../common/hooks/useStopwatch";
import { usePolling } from "../../common/hooks/usePolling";
import { useTransactionSteps } from "../../common/tx/useTransactionSteps";
import type { TransactionStatus } from "../../common/tx/types";

interface DepositInputs {
  chain: SUPPORTED_CHAINS_IDS;
  amount?: string;
  selectedSources: number[];
}

type ExecuteConfig = Omit<ExecuteParams, "toChainId">;

interface UseDepositProps {
  token: SUPPORTED_TOKENS;
  chain: SUPPORTED_CHAINS_IDS;
  nexusSDK: NexusSDK | null;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  allowance: OnAllowanceHookData | null;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  unifiedBalance: UserAsset[] | null;
  chainOptions?: { id: number; name: string; logo: string }[];
  address: Address;
  executeBuilder?: (
    token: SUPPORTED_TOKENS,
    amount: string,
    chainId: SUPPORTED_CHAINS_IDS,
    userAddress: `0x${string}`
  ) => ExecuteConfig;
  executeConfig?: ExecuteConfig;
}

const useDeposit = ({
  token,
  chain,
  nexusSDK,
  intent,
  setIntent,
  allowance,
  setAllowance,
  unifiedBalance,
  chainOptions,
  address,
  executeBuilder,
  executeConfig,
}: UseDepositProps) => {
  const { fetchUnifiedBalance, handleNexusError } = useNexus();
  const allSourceIds = useMemo(
    () => chainOptions?.map((c) => c.id) ?? [],
    [chainOptions]
  );

  interface DepositState {
    inputs: DepositInputs;
    status: TransactionStatus;
  }
  type Action =
    | { type: "setInputs"; payload: Partial<DepositInputs> }
    | { type: "resetInputs" }
    | { type: "setStatus"; payload: TransactionStatus };

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

  useEffect(() => {
    dispatch({ type: "setInputs", payload: { selectedSources: allSourceIds } });
  }, [allSourceIds]);

  const [loading, setLoading] = useState(false);
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

  const stopwatch = useStopwatch({ running: isDialogOpen, intervalMs: 100 });

  const handleTransaction = async () => {
    if (!inputs?.amount || !inputs?.chain) return;
    setLoading(true);
    setTxError(null);
    try {
      if (!nexusSDK) throw new Error("Nexus SDK not initialized");
      const decimals = TOKEN_METADATA[token].decimals;
      const amountBigInt = nexusSDK?.utils?.parseUnits(inputs.amount, decimals);
      const executeParams: ExecuteConfig | undefined = executeBuilder
        ? executeBuilder(token, inputs.amount, inputs.chain, address)
        : executeConfig;
      const params: BridgeAndExecuteParams = {
        token,
        amount: amountBigInt,
        toChainId: inputs.chain,
        sourceChains: inputs.selectedSources?.length
          ? inputs.selectedSources
          : allSourceIds,
        execute: executeParams as ExecuteConfig,
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
      const executeParams: ExecuteConfig | undefined = executeBuilder
        ? executeBuilder(token, amountToUse, inputs.chain, address)
        : executeConfig;
      const params: BridgeAndExecuteParams = {
        token,
        amount: amountBigInt,
        toChainId: inputs.chain,
        sourceChains: inputs.selectedSources?.length
          ? inputs.selectedSources
          : allSourceIds,
        execute: executeParams as ExecuteConfig,
        waitForReceipt: false,
      };
      const sim = await nexusSDK.simulateBridgeAndExecute(params);
      console.log("sim", sim);
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
    await fetchUnifiedBalance();
  };

  const resetState = () => {
    setAllowance(null);
    setInputs({
      chain,
      amount: undefined,
      selectedSources: allSourceIds,
    });
    setLoading(false);
    setRefreshing(false);
    setSimulation(null);
    setIntent(null);
    activeSimulationIdRef.current = null;
    setSimulating(false);
    resetSteps();
    stopwatch.stop();
    stopwatch.reset();
  };

  const reset = () => {
    intent?.deny();
    resetState();
  };

  const startTransaction = () => {
    setIsDialogOpen(true);
    setTxError(null);
    setAutoAllow(true);
    void handleTransaction();
  };

  useEffect(() => {
    if (autoAllow && intent) {
      intent.allow();
      setAutoAllow(false);
    }
  }, [autoAllow, intent]);

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

  const stopTimer = () => {
    stopwatch.stop();
  };

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
    stopTimer,
    simulate,
    clearSimulation: () => reset(),
    cancelSimulation: () => {
      activeSimulationIdRef.current = null;
      setSimulating(false);
      setRefreshing(false);
      setSimulation(null);
    },
  };
};

export default useDeposit;
