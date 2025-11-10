import {
  NEXUS_EVENTS,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  SUPPORTED_CHAINS,
  type SUPPORTED_CHAINS_IDS,
  type SUPPORTED_TOKENS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Address, isAddress } from "viem";
import { useNexus } from "../../nexus/NexusProvider";

export interface FastBridgeState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient?: `0x${string}`;
}

interface UseBridgeProps {
  network: NexusNetwork;
  connectedAddress: Address;
  nexusSDK: NexusSDK | null;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  unifiedBalance: UserAsset[] | null;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
}

const buildInitialInputs = (
  network: NexusNetwork,
  connectedAddress: Address,
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  }
): FastBridgeState => {
  return {
    chain:
      (prefill?.chainId as SUPPORTED_CHAINS_IDS) ??
      (network === "testnet"
        ? SUPPORTED_CHAINS.SEPOLIA
        : SUPPORTED_CHAINS.ETHEREUM),
    token: (prefill?.token as SUPPORTED_TOKENS) ?? "USDC",
    amount: prefill?.amount ?? undefined,
    recipient: (prefill?.recipient as `0x${string}`) ?? connectedAddress,
  };
};

const useBridge = ({
  network,
  connectedAddress,
  nexusSDK,
  intent,
  setIntent,
  setAllowance,
  unifiedBalance,
  prefill,
  onComplete,
}: UseBridgeProps) => {
  const { fetchUnifiedBalance, handleNexusError } = useNexus();
  const [inputs, setInputs] = useState<FastBridgeState>(() =>
    buildInitialInputs(network, connectedAddress, prefill)
  );

  const [timer, setTimer] = useState(0);
  const [startTxn, setStartTxn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commitLockRef = useRef<boolean>(false);
  const [steps, setSteps] = useState<
    Array<{ id: number; completed: boolean; step: any }>
  >([]);

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const handleTransaction = async () => {
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }
    setLoading(true);
    setTxError(null);
    try {
      if (inputs?.recipient !== connectedAddress) {
        // Transfer
        const transferTxn = await nexusSDK?.bridgeAndTransfer(
          {
            token: inputs?.token,
            amount: inputs?.amount,
            toChainId: inputs?.chain,
            recipient: inputs?.recipient,
          },
          {
            onEvent: (event) => {
              if (event.name === NEXUS_EVENTS.STEPS_LIST) {
                const list = Array.isArray(event.args) ? event.args : [];
                setSteps((prev) => {
                  const completedTypes = new Set(
                    prev
                      .filter((s) => s.completed)
                      .map((s) => s.step?.typeID ?? "")
                  );
                  return list.map((step, index) => ({
                    id: index,
                    completed: completedTypes.has(step?.typeID ?? ""),
                    step,
                  }));
                });
              }
              if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
                const step = event.args;
                setSteps((prev) =>
                  prev.map((s) =>
                    s?.step?.typeID === step?.typeID
                      ? { ...s, completed: true }
                      : s
                  )
                );
              }
            },
          }
        );
        if (!transferTxn) {
          throw new Error("Transaction rejected by user");
        }
        if (transferTxn) {
          setLastExplorerUrl(transferTxn.explorerUrl);
          await onSuccess();
        }
        return;
      }
      // Bridge
      const bridgeTxn = await nexusSDK?.bridge(
        {
          token: inputs?.token,
          amount: inputs?.amount,
          toChainId: inputs?.chain,
        },
        {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.STEPS_LIST) {
              const list = Array.isArray(event.args) ? event.args : [];
              setSteps((prev) => {
                const completedTypes = new Set(
                  prev
                    .filter((s) => s.completed)
                    .map((s) => s.step?.typeID ?? "")
                );
                return list.map((step, index) => ({
                  id: index,
                  completed: completedTypes.has(step?.typeID ?? ""),
                  step,
                }));
              });
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              const step = event.args;
              setSteps((prev) =>
                prev.map((s) =>
                  s.step && s.step.typeID === step?.typeID
                    ? { ...s, completed: true }
                    : s
                )
              );
            }
          },
        }
      );
      if (!bridgeTxn) {
        throw new Error("Transaction rejected by user");
      }
      if (bridgeTxn) {
        setLastExplorerUrl(bridgeTxn.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      setIsDialogOpen(false);
    } finally {
      setLoading(false);
      setStartTxn(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const onSuccess = async () => {
    // Close dialog and stop timer on success
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onComplete?.();
    setStartTxn(false);
    setIntent(null);
    setAllowance(null);
    setInputs(buildInitialInputs(network, connectedAddress, prefill));
    setRefreshing(false);
    await fetchUnifiedBalance();
  };

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === inputs?.token);
  }, [unifiedBalance, inputs?.token]);

  const refreshIntent = async () => {
    setRefreshing(true);
    try {
      await intent?.refresh([]);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    intent?.deny();
    setIntent(null);
    setAllowance(null);
    setInputs(buildInitialInputs(network, connectedAddress, prefill));
    setLoading(false);
    setStartTxn(false);
    setRefreshing(false);
  };

  const startTransaction = () => {
    // Reset timer for a fresh run
    setTimer(0);
    setStartTxn(true);
    intent?.allow();
    setIsDialogOpen(true);
    setTxError(null);
  };

  const commitAmount = async () => {
    if (commitLockRef.current) return;
    if (intent || loading || txError || !areInputsValid) return;
    commitLockRef.current = true;
    try {
      await handleTransaction();
    } finally {
      commitLockRef.current = false;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (intent) {
      interval = setInterval(refreshIntent, 5000);
    }
    return () => {
      clearInterval(interval);
    };
  }, [intent]);

  useEffect(() => {
    if (startTxn) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 0.1);
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startTxn]);

  useEffect(() => {
    if (intent) {
      intent.deny();
      setIntent(null);
    }
  }, [inputs]);

  useEffect(() => {
    if (!isDialogOpen) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStartTxn(false);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (txError) {
      setTxError(null);
    }
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
    timer,
    setIsDialogOpen,
    setTxError,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    handleTransaction,
    reset,
    filteredUnifiedBalance,
    startTransaction,
    stopTimer,
    commitAmount,
    lastExplorerUrl,
    steps,
  };
};

export default useBridge;
