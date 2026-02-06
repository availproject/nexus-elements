import {
  type BridgeStepType,
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
import {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  useReducer,
  type RefObject,
} from "react";
import { type Address, isAddress } from "viem";
import {
  useStopwatch,
  usePolling,
  useNexusError,
  useTransactionSteps,
  type TransactionStatus,
} from "../../common";

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
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  bridgableBalance: UserAsset[] | null;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
}

type BridgeState = {
  inputs: FastBridgeState;
  status: TransactionStatus;
};

type Action =
  | { type: "setInputs"; payload: Partial<FastBridgeState> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus };

const buildInitialInputs = (
  network: NexusNetwork,
  connectedAddress: Address,
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  },
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
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  fetchBalance,
  allowance,
}: UseBridgeProps) => {
  const handleNexusError = useNexusError();
  const initialState: BridgeState = {
    inputs: buildInitialInputs(network, connectedAddress, prefill),
    status: "idle",
  };
  function reducer(state: BridgeState, action: Action): BridgeState {
    switch (action.type) {
      case "setInputs":
        return { ...state, inputs: { ...state.inputs, ...action.payload } };
      case "resetInputs":
        return {
          ...state,
          inputs: buildInitialInputs(network, connectedAddress, prefill),
        };
      case "setStatus":
        return { ...state, status: action.payload };
      default:
        return state;
    }
  }
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputs = state.inputs;
  const setInputs = (next: FastBridgeState | Partial<FastBridgeState>) => {
    dispatch({ type: "setInputs", payload: next as Partial<FastBridgeState> });
  };

  const loading = state.status === "executing";
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const commitLockRef = useRef<boolean>(false);
  const [selectedSourceChains, setSelectedSourceChains] = useState<
    number[] | null
  >(null);
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<BridgeStepType>();

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const handleTransaction = async () => {
    if (commitLockRef.current) return;
    commitLockRef.current = true;
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      commitLockRef.current = false;
      return;
    }
    dispatch({ type: "setStatus", payload: "executing" });
    setTxError(null);
    onStart?.();
    setLastExplorerUrl("");

    try {
      if (!nexusSDK) {
        throw new Error("Nexus SDK not initialized");
      }
      const formattedAmount = nexusSDK.convertTokenReadableAmountToBigInt(
        inputs?.amount,
        inputs?.token,
        inputs?.chain,
      );
      const bridgeTxn = await nexusSDK.bridge(
        {
          token: inputs?.token,
          amount: formattedAmount,
          toChainId: inputs?.chain,
          recipient: inputs?.recipient ?? connectedAddress,
          sourceChains: sourceChainsForSdk,
        },
        {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.STEPS_LIST) {
              const list = Array.isArray(event.args) ? event.args : [];
              onStepsList(list);
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              if (event.args.type === "INTENT_HASH_SIGNED") {
                stopwatch.start();
              }
              onStepComplete(event.args);
            }
          },
        },
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
      intent.current?.deny();
      intent.current = null;
      allowance.current = null;
      setTxError(message);
      onError?.(message);
      setIsDialogOpen(false);
      // Reset sources selection on failures/rejections so a new attempt starts
      // from a clean "all sources" default.
      setSelectedSourceChains(null);
      setRefreshing(false);
      stopwatch.stop();
      stopwatch.reset();
      resetSteps();
      void fetchBalance();
      dispatch({ type: "setStatus", payload: "error" });
    } finally {
      commitLockRef.current = false;
    }
  };

  const onSuccess = async () => {
    // Close dialog and stop timer on success
    stopwatch.stop();
    dispatch({ type: "setStatus", payload: "success" });
    onComplete?.();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    setRefreshing(false);
    setSelectedSourceChains(null);
    await fetchBalance();
  };

  const filteredBridgableBalance = useMemo(() => {
    return bridgableBalance?.find((bal) => bal?.symbol === inputs?.token);
  }, [bridgableBalance, inputs?.token]);

  const availableSources = useMemo(() => {
    const breakdown = filteredBridgableBalance?.breakdown ?? [];
    const nonZero = breakdown.filter(
      (b) => Number.parseFloat(b.balance ?? "0") > 0
    );
    const decimals = filteredBridgableBalance?.decimals;
    if (!nexusSDK || typeof decimals !== "number") {
      return nonZero.sort(
        (a, b) => Number.parseFloat(b.balance) - Number.parseFloat(a.balance)
      );
    }
    return nonZero.sort((a, b) => {
      try {
        const aRaw = nexusSDK.utils.parseUnits(a.balance ?? "0", decimals);
        const bRaw = nexusSDK.utils.parseUnits(b.balance ?? "0", decimals);
        if (aRaw === bRaw) return 0;
        return aRaw > bRaw ? -1 : 1;
      } catch {
        return Number.parseFloat(b.balance) - Number.parseFloat(a.balance);
      }
    });
  }, [
    filteredBridgableBalance?.breakdown,
    filteredBridgableBalance?.decimals,
    nexusSDK,
  ]);

  const allAvailableSourceChainIds = useMemo(
    () => availableSources.map((s) => s.chain.id),
    [availableSources]
  );

  const effectiveSelectedSourceChains = useMemo(() => {
    if (selectedSourceChains && selectedSourceChains.length > 0) {
      return selectedSourceChains;
    }
    return allAvailableSourceChainIds;
  }, [selectedSourceChains, allAvailableSourceChainIds]);

  const sourceChainsForSdk =
    effectiveSelectedSourceChains.length > 0
      ? effectiveSelectedSourceChains
      : undefined;

  const toggleSourceChain = useCallback(
    (chainId: number) => {
      setSelectedSourceChains((prev) => {
        if (allAvailableSourceChainIds.length === 0) return prev;
        const current =
          prev && prev.length > 0 ? prev : allAvailableSourceChainIds;
        const next = current.includes(chainId)
          ? current.filter((id) => id !== chainId)
          : [...current, chainId];
        if (next.length === 0) {
          // Always require at least one selected source chain.
          return current;
        }
        const isAllSelected =
          next.length === allAvailableSourceChainIds.length &&
          allAvailableSourceChainIds.every((id) => next.includes(id));
        return isAllSelected ? null : next;
      });
    },
    [allAvailableSourceChainIds]
  );

  const sourceSelection = useMemo(() => {
    const decimals = filteredBridgableBalance?.decimals;
    const amount = inputs?.amount?.trim() ?? "";
    if (!nexusSDK || typeof decimals !== "number" || !amount) {
      return {
        selectedTotalRaw: BigInt(0),
        requiredRaw: BigInt(0),
        selectedTotal: "0",
        requiredTotal: "0",
        insufficient: false,
      };
    }
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return {
        selectedTotalRaw: BigInt(0),
        requiredRaw: BigInt(0),
        selectedTotal: "0",
        requiredTotal: "0",
        insufficient: false,
      };
    }
    try {
      const amountRaw = nexusSDK.utils.parseUnits(amount, decimals);
      const requiredRaw = (amountRaw * BigInt(130)) / BigInt(100);
      const balanceByChain = new Map(
        availableSources.map((s) => [s.chain.id, s.balance] as const)
      );
      const selectedTotalRaw = effectiveSelectedSourceChains.reduce(
        (sum, chainId) => {
          const bal = balanceByChain.get(chainId);
          if (!bal) return sum;
          return sum + nexusSDK.utils.parseUnits(bal ?? "0", decimals);
        },
        BigInt(0)
      );
      return {
        selectedTotalRaw,
        requiredRaw,
        selectedTotal: nexusSDK.utils.formatUnits(selectedTotalRaw, decimals),
        requiredTotal: nexusSDK.utils.formatUnits(requiredRaw, decimals),
        insufficient: selectedTotalRaw < requiredRaw,
      };
    } catch {
      return {
        selectedTotalRaw: BigInt(0),
        requiredRaw: BigInt(0),
        selectedTotal: "0",
        requiredTotal: "0",
        insufficient: false,
      };
    }
  }, [
    nexusSDK,
    filteredBridgableBalance?.decimals,
    inputs?.amount,
    availableSources,
    effectiveSelectedSourceChains,
  ]);

  const refreshIntent = async () => {
    if (!intent.current) return;
    setRefreshing(true);
    try {
      const updated = await intent.current.refresh(sourceChainsForSdk);
      if (updated) {
        intent.current.intent = updated;
      }
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    intent.current?.deny();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    dispatch({ type: "setStatus", payload: "idle" });
    setRefreshing(false);
    setSelectedSourceChains(null);
    stopwatch.stop();
    stopwatch.reset();
    resetSteps();
  };

  const startTransaction = () => {
    if (!intent.current) return;
    void (async () => {
      // Ensure the intent reflects the latest selected sources before allowing.
      await refreshIntent();
      intent.current?.allow();
      setIsDialogOpen(true);
      setTxError(null);
    })();
  };

  const commitAmount = async () => {
    if (intent.current || loading || txError || !areInputsValid) return;
    await handleTransaction();
  };

  usePolling(Boolean(intent.current) && !isDialogOpen, refreshIntent, 15000);

  const stopwatch = useStopwatch({ intervalMs: 100 });

  useEffect(() => {
    if (intent.current) {
      intent.current.deny();
      intent.current = null;
    }
  }, [inputs]);

  useEffect(() => {
    setSelectedSourceChains(null);
  }, [inputs?.token]);

  useEffect(() => {
    if (!isDialogOpen) {
      stopwatch.stop();
      stopwatch.reset();
    }
  }, [isDialogOpen, stopwatch]);

  useEffect(() => {
    if (txError) {
      setTxError(null);
    }
  }, [inputs]);

  return {
    inputs,
    setInputs,
    timer: stopwatch.seconds,
    setIsDialogOpen,
    setTxError,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    handleTransaction,
    reset,
    filteredBridgableBalance,
    startTransaction,
    commitAmount,
    lastExplorerUrl,
    steps,
    status: state.status,
    availableSources,
    selectedSourceChains: effectiveSelectedSourceChains,
    toggleSourceChain,
    isSourceSelectionInsufficient: sourceSelection.insufficient,
    selectedTotal: sourceSelection.selectedTotal,
    requiredTotal: sourceSelection.requiredTotal,
  };
};

export default useBridge;
