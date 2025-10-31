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
  BridgeAndExecuteSimulationResult,
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNexus } from "../../nexus/NexusProvider";

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
  executeConfig,
}: UseDepositProps) => {
  const { fetchUnifiedBalance } = useNexus();
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
    // keep default sources in sync if options change
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

  // Track in-flight simulation requests to prevent stale updates
  const simulationRequestIdRef = useRef(0);
  const activeSimulationIdRef = useRef<number | null>(null);

  useMemo(() => {
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    return hasChain && hasAmount;
  }, [inputs]);

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === token);
  }, [unifiedBalance]);

  const handleTransaction = async () => {
    if (!inputs?.amount || !inputs?.chain) return;
    setLoading(true);
    setTxError(null);
    try {
      if (!nexusSDK) throw new Error("Nexus SDK not initialized");

      const params: BridgeAndExecuteParams = {
        token,
        amount: inputs.amount,
        toChainId: inputs.chain,
        sourceChains: inputs.selectedSources?.length
          ? inputs.selectedSources
          : allSourceIds,
        execute: executeConfig,
        waitForReceipt: true,
      };

      const result: BridgeAndExecuteResult = await nexusSDK.bridgeAndExecute(
        params
      );
      console.log("result", result);

      if (!result?.success) {
        setTxError(result?.error || "Transaction rejected by user");
        setIsDialogOpen(false);
        resetState();
        return;
      }
      setLastResult(result);
      await onSuccess();
    } catch (error) {
      const msg = (error as Error)?.message || "Transaction failed";
      setTxError(
        msg.includes("User rejected") ? "User rejected the transaction" : msg
      );
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
      // Invalidate any pending simulation and clear result if input is empty
      activeSimulationIdRef.current = null;
      setSimulation(null);
      return;
    }
    const requestId = ++simulationRequestIdRef.current;
    activeSimulationIdRef.current = requestId;
    setSimulating(true);
    try {
      const params: BridgeAndExecuteParams = {
        token,
        amount: amountToUse,
        toChainId: inputs.chain,
        sourceChains: inputs.selectedSources?.length
          ? inputs.selectedSources
          : allSourceIds,
        execute: executeConfig,
        waitForReceipt: false,
      };
      console.log("simulation params", params);
      const sim = await nexusSDK.simulateBridgeAndExecute(params);
      console.log("simulation result", sim);
      // Ignore if this request is no longer the active one
      if (activeSimulationIdRef.current !== requestId) {
        return;
      }
      if (sim?.success) {
        setTxError(null);
        setSimulation(sim);
      } else {
        setSimulation(null);
        setTxError(sim?.error || "Simulation failed");
      }
    } catch (error) {
      if (activeSimulationIdRef.current !== requestId) {
        return;
      }
      const msg = (error as Error)?.message || "Simulation failed";
      setSimulation(null);
      setTxError(
        msg.includes("User rejected") ? "User rejected the simulation" : msg
      );
    } finally {
      if (activeSimulationIdRef.current === requestId) {
        setSimulating(false);
      }
    }
  };

  const refreshSimulation = async () => {
    if (simulating || refreshing) return;
    if (!simulation?.success || !simulation?.bridgeSimulation?.intent) return;
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
    setIntent(null);
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
    console.log("reset");
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
    if (
      simulation?.success &&
      simulation?.bridgeSimulation?.intent &&
      !isDialogOpen
    ) {
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
  }, [simulation?.success, simulation?.bridgeSimulation, isDialogOpen]);

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
