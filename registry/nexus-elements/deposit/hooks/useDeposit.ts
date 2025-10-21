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
  const [simulation, setSimulation] =
    useState<BridgeAndExecuteSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [autoAllow, setAutoAllow] = useState(false);
  const [lastResult, setLastResult] = useState<BridgeAndExecuteResult | null>(
    null
  );

  useMemo(() => {
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    return hasChain && hasAmount;
  }, [inputs]);

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.filter((bal) => bal?.symbol === "USDC")[0];
  }, [unifiedBalance]);

  const handleTransaction = async () => {
    if (!inputs?.amount || !inputs?.chain) return;
    setLoading(true);
    setTxError(null);
    try {
      if (!nexusSDK) throw new Error("Nexus SDK not initialized");

      const params: BridgeAndExecuteParams = {
        token: "USDC" as SUPPORTED_TOKENS,
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
        throw new Error(result?.error || "Transaction rejected by user");
      }
      setLastResult(result);

      await onSuccess();
    } catch (error) {
      const msg = (error as Error)?.message || "Transaction failed";
      setTxError(
        msg.includes("User rejected") ? "User rejected the transaction" : msg
      );
      // Reset inputs and avoid immediate resimulation
      setIsDialogOpen(false);
      setStartTxn(false);
      setSimulation(null);
      setInputs({ chain, amount: undefined, selectedSources: allSourceIds });
    } finally {
      setLoading(false);
      setStartTxn(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const simulate = async () => {
    if (!nexusSDK) return;
    if (!inputs?.amount || !inputs?.chain) {
      setSimulation(null);
      return;
    }
    setSimulating(true);
    try {
      const params: BridgeAndExecuteParams = {
        token: "USDC" as SUPPORTED_TOKENS,
        amount: inputs.amount,
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
      setSimulation(sim?.success ? sim : null);
    } catch (error) {
      setSimulation(null);
      if (!(error as Error)?.message?.includes("User rejected")) {
        setTxError((error as Error)?.message || "Simulation failed");
      }
    } finally {
      setSimulating(false);
    }
  };

  const onSuccess = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStartTxn(false);
    setIntent(null);
    setAllowance(null);
    setInputs({
      chain,
      amount: undefined,
      selectedSources: allSourceIds,
    });
    setRefreshing(false);
    await fetchUnifiedBalance();
  };

  const reset = () => {
    intent?.deny();
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
  };

  const startTransaction = () => {
    setTimer(0);
    setStartTxn(true);
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
    if (loading || isDialogOpen || startTxn) return;
    const timeout = setTimeout(() => {
      void simulate();
    }, 800);
    return () => clearTimeout(timeout);
  }, [inputs, executeConfig, loading, isDialogOpen, startTxn]);

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
    if (txError) setTxError(null);
  }, [inputs]);

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
    clearSimulation: () => setSimulation(null),
  };
};

export default useDeposit;
