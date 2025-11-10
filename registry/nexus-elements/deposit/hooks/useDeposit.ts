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
  parseUnits,
  NEXUS_EVENTS,
  type BridgeStepType,
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNexus } from "../../nexus/NexusProvider";
import { type Address } from "viem";

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

  const [inputs, setInputs] = useState<DepositInputs>({
    chain,
    amount: undefined,
    selectedSources: allSourceIds,
  });

  useEffect(() => {
    setInputs((prev) => ({ ...prev, selectedSources: allSourceIds }));
  }, [allSourceIds]);

  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [simulation, setSimulation] =
    useState<BridgeAndExecuteSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [autoAllow, setAutoAllow] = useState(false);
  const [lastResult, setLastResult] = useState<BridgeAndExecuteResult | null>(
    null
  );
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: BridgeStepType }>
  >([]);

  const simulationRequestIdRef = useRef(0);
  const activeSimulationIdRef = useRef<number | null>(null);

  useMemo(() => {
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    return hasChain && hasAmount;
  }, [inputs]);

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === token);
  }, [unifiedBalance, token]);

  const handleTransaction = async () => {
    if (!inputs?.amount || !inputs?.chain) return;
    setLoading(true);
    setTxError(null);
    try {
      if (!nexusSDK) throw new Error("Nexus SDK not initialized");
      const decimals = TOKEN_METADATA[token].decimals;
      const amountBigInt = parseUnits(inputs.amount, decimals);
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
              setSteps((prev) => {
                const completedTypes = new Set<string>();
                for (const prevStep of prev) {
                  if (prevStep.completed) {
                    completedTypes.add(prevStep.step?.typeID ?? "");
                  }
                }
                const nextSteps: Array<{
                  id: number;
                  completed: boolean;
                  step: BridgeStepType;
                }> = [];
                for (let index = 0; index < list.length; index++) {
                  const step = list[index];
                  nextSteps.push({
                    id: index,
                    completed: completedTypes.has(step?.typeID ?? ""),
                    step,
                  });
                }
                return nextSteps;
              });
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              const step = event.args;
              setSteps((prev) => {
                const updated: Array<{
                  id: number;
                  completed: boolean;
                  step: BridgeStepType;
                }> = [];
                for (const s of prev) {
                  if (s?.step?.typeID === step?.typeID) {
                    updated.push({ ...s, completed: true });
                  } else {
                    updated.push(s);
                  }
                }
                return updated;
              });
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
      const amountBigInt = parseUnits(amountToUse, decimals);
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
    setStartTxn(false);
    setRefreshing(false);
    setSimulation(null);
    setIntent(null);
    activeSimulationIdRef.current = null;
    setSimulating(false);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const reset = () => {
    intent?.deny();
    resetState();
  };

  const startTransaction = () => {
    setTimer(0);
    setStartTxn(true);
    setIsDialogOpen(true);
    setTxError(null);
    setAutoAllow(true);
    void handleTransaction();
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (autoAllow && intent) {
      intent.allow();
      setAutoAllow(false);
    }
  }, [autoAllow, intent]);

  useEffect(() => {
    if (startTxn) {
      timerRef.current = setInterval(() => setTimer((prev) => prev + 0.1), 100);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTxn]);

  useEffect(() => {
    if (!isDialogOpen) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStartTxn(false);
      setLastResult(null);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (simulation?.bridgeSimulation?.intent && !isDialogOpen) {
      refreshIntervalRef.current ??= setInterval(refreshSimulation, 15000);
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [simulation, isDialogOpen]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStartTxn(false);
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
    timer,
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
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    },
  };
};

export default useDeposit;
