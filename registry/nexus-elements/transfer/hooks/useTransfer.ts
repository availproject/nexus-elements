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
  useTransactionSteps,
  type TransactionStatus,
  useNexusError,
} from "../../common";
import { notifyIntentHistoryRefresh } from "../../view-history/history-events";

export interface FastTransferState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient: `0x${string}`;
}

interface UseTransferProps {
  network: NexusNetwork;
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
  maxAmount?: string | number;
  isSourceMenuOpen?: boolean;
}

interface TransferState {
  inputs: FastTransferState;
  status: TransactionStatus;
}
type Action =
  | { type: "setInputs"; payload: Partial<FastTransferState> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus };

const buildInitialInputs = (
  network: NexusNetwork,
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  },
): FastTransferState => {
  return {
    chain:
      (prefill?.chainId as SUPPORTED_CHAINS_IDS) ??
      (network === "testnet"
        ? SUPPORTED_CHAINS.SEPOLIA
        : SUPPORTED_CHAINS.ETHEREUM),
    token: (prefill?.token as SUPPORTED_TOKENS) ?? "USDC",
    amount: prefill?.amount ?? undefined,
    recipient: (prefill?.recipient as `0x${string}`) ?? undefined,
  };
};

const MAX_AMOUNT_REGEX = /^\d*\.?\d+$/;

const normalizeMaxAmount = (
  maxAmount?: string | number,
): string | undefined => {
  if (maxAmount === undefined || maxAmount === null) return undefined;
  const value = String(maxAmount).trim();
  if (!value || value === "." || !MAX_AMOUNT_REGEX.test(value))
    return undefined;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return value;
};

const clampAmountToMax = ({
  amount,
  maxAmount,
  nexusSDK,
  token,
  chainId,
}: {
  amount: string;
  maxAmount?: string;
  nexusSDK: NexusSDK;
  token: SUPPORTED_TOKENS;
  chainId: SUPPORTED_CHAINS_IDS;
}): string => {
  if (!maxAmount) return amount;
  try {
    const amountRaw = nexusSDK.convertTokenReadableAmountToBigInt(
      amount,
      token,
      chainId,
    );
    const maxRaw = nexusSDK.convertTokenReadableAmountToBigInt(
      maxAmount,
      token,
      chainId,
    );
    return amountRaw > maxRaw ? maxAmount : amount;
  } catch {
    return amount;
  }
};

type SourceCoverageState = "healthy" | "warning" | "error";

const SOURCE_SAFETY_MULTIPLIER_NUMERATOR = BigInt(130);
const SOURCE_SAFETY_MULTIPLIER_DENOMINATOR = BigInt(100);

const formatAmountForDisplay = (
  amount: bigint,
  decimals: number | undefined,
  nexusSDK: NexusSDK,
): string => {
  if (typeof decimals !== "number") return amount.toString();
  const formatted = nexusSDK.utils.formatUnits(amount, decimals);
  if (!formatted.includes(".")) return formatted;
  const [whole, fraction] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, 6).replace(/0+$/, "");
  if (!trimmedFraction && whole === "0" && amount > BigInt(0)) {
    return "0.000001";
  }
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
};

const useTransfer = ({
  network,
  nexusSDK,
  intent,
  bridgableBalance,
  prefill,
  onComplete,
  onStart,
  onError,
  allowance,
  fetchBalance,
  maxAmount,
  isSourceMenuOpen = false,
}: UseTransferProps) => {
  const handleNexusError = useNexusError();
  const initialState: TransferState = {
    inputs: buildInitialInputs(network, prefill),
    status: "idle",
  };
  function reducer(state: TransferState, action: Action): TransferState {
    switch (action.type) {
      case "setInputs":
        return { ...state, inputs: { ...state.inputs, ...action.payload } };
      case "resetInputs":
        return {
          ...state,
          inputs: buildInitialInputs(network, prefill),
        };
      case "setStatus":
        return { ...state, status: action.payload };
      default:
        return state;
    }
  }
  const [state, dispatch] = useReducer(reducer, initialState);
  const inputs = state.inputs;
  const setInputs = (next: FastTransferState | Partial<FastTransferState>) => {
    dispatch({
      type: "setInputs",
      payload: next as Partial<FastTransferState>,
    });
  };

  const loading = state.status === "executing";
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const commitLockRef = useRef<boolean>(false);
  const runIdRef = useRef(0);
  const maxAmountRequestIdRef = useRef(0);
  const [selectedSourceChains, setSelectedSourceChains] = useState<
    number[] | null
  >(null);
  const [selectedSourcesMaxAmount, setSelectedSourcesMaxAmount] = useState<
    string | null
  >(null);
  const [appliedSourceSelectionKey, setAppliedSourceSelectionKey] =
    useState("ALL");
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<BridgeStepType>();
  const configuredMaxAmount = useMemo(
    () => normalizeMaxAmount(maxAmount),
    [maxAmount],
  );

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
    const currentRunId = ++runIdRef.current;
    try {
      if (
        !inputs?.amount ||
        !inputs?.recipient ||
        !inputs?.chain ||
        !inputs?.token
      ) {
        console.error("Missing required inputs");
        return;
      }
      if (!nexusSDK) {
        const message = "Nexus SDK not initialized";
        setTxError(message);
        onError?.(message);
        return;
      }
      if (allAvailableSourceChainIds.length === 0) {
        const message =
          "No eligible source chains available for the selected token and destination.";
        setTxError(message);
        onError?.(message);
        dispatch({ type: "setStatus", payload: "error" });
        return;
      }

      const amountBigInt = nexusSDK.convertTokenReadableAmountToBigInt(
        inputs.amount,
        inputs.token,
        inputs.chain,
      );

      if (configuredMaxAmount) {
        const configuredMaxRaw = nexusSDK.convertTokenReadableAmountToBigInt(
          configuredMaxAmount,
          inputs.token,
          inputs.chain,
        );
        if (amountBigInt > configuredMaxRaw) {
          const message = `Amount exceeds maximum limit of ${configuredMaxAmount} ${inputs.token}.`;
          setTxError(message);
          onError?.(message);
          dispatch({ type: "setStatus", payload: "error" });
          return;
        }
      }

      const maxForCurrentSelection = await getMaxForCurrentSelection();
      if (currentRunId !== runIdRef.current) return;
      if (!maxForCurrentSelection) {
        const message =
          "Unable to determine max transfer amount for selected sources. Please try again.";
        setTxError(message);
        onError?.(message);
        dispatch({ type: "setStatus", payload: "error" });
        return;
      }
      const maxForSelectionRaw = nexusSDK.convertTokenReadableAmountToBigInt(
        maxForCurrentSelection,
        inputs.token,
        inputs.chain,
      );
      if (amountBigInt > maxForSelectionRaw) {
        const message = `Selected sources can provide up to ${maxForCurrentSelection} ${inputs.token}. Reduce amount or enable more sources.`;
        setTxError(message);
        onError?.(message);
        dispatch({ type: "setStatus", payload: "error" });
        return;
      }

      dispatch({ type: "setStatus", payload: "executing" });
      setTxError(null);
      onStart?.();
      setLastExplorerUrl("");
      setAppliedSourceSelectionKey(sourceSelectionKey);

      const transferTxn = await nexusSDK.bridgeAndTransfer(
        {
          token: inputs.token,
          amount: amountBigInt,
          toChainId: inputs.chain,
          recipient: inputs.recipient,
          sourceChains: sourceChainsForSdk,
        },
        {
          onEvent: (event) => {
            if (currentRunId !== runIdRef.current) return;
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
      if (currentRunId !== runIdRef.current) return;
      if (!transferTxn) {
        throw new Error("Transaction rejected by user");
      }
      setLastExplorerUrl(transferTxn.explorerUrl);
      await onSuccess();
    } catch (error) {
      if (currentRunId !== runIdRef.current) return;
      const { message, code, context, details } = handleNexusError(error);
      console.error("Fast transfer transaction failed:", {
        code,
        message,
        context,
        details,
      });
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
    setAppliedSourceSelectionKey("ALL");
    await fetchBalance();
    notifyIntentHistoryRefresh();
  };

  const filteredBridgableBalance = useMemo(() => {
    return bridgableBalance?.find((bal) =>
      inputs?.token === "USDM"
        ? bal?.symbol === "USDC"
        : bal?.symbol === inputs?.token,
    );
  }, [bridgableBalance, inputs?.token]);

  const availableSources = useMemo(() => {
    const breakdown = filteredBridgableBalance?.breakdown ?? [];
    const destinationChainId = inputs?.chain;
    const nonZero = breakdown.filter((b) => {
      if (Number.parseFloat(b.balance ?? "0") <= 0) return false;
      if (typeof destinationChainId === "number") {
        return b.chain.id !== destinationChainId;
      }
      return true;
    });
    const decimals = filteredBridgableBalance?.decimals;
    if (!nexusSDK || typeof decimals !== "number") {
      return nonZero.sort(
        (a, b) => Number.parseFloat(b.balance) - Number.parseFloat(a.balance),
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
    inputs?.chain,
    filteredBridgableBalance?.breakdown,
    filteredBridgableBalance?.decimals,
    nexusSDK,
  ]);

  const allAvailableSourceChainIds = useMemo(
    () => availableSources.map((s) => s.chain.id),
    [availableSources],
  );

  const effectiveSelectedSourceChains = useMemo(() => {
    if (selectedSourceChains && selectedSourceChains.length > 0) {
      const availableSet = new Set(allAvailableSourceChainIds);
      const filteredSelection = selectedSourceChains.filter((id) =>
        availableSet.has(id),
      );
      if (filteredSelection.length > 0) {
        return filteredSelection;
      }
    }
    return allAvailableSourceChainIds;
  }, [selectedSourceChains, allAvailableSourceChainIds]);

  const sourceChainsForSdk =
    effectiveSelectedSourceChains.length > 0
      ? effectiveSelectedSourceChains
      : undefined;

  const sourceSelectionKey = useMemo(() => {
    if (allAvailableSourceChainIds.length === 0) return "NONE";
    if (!selectedSourceChains || selectedSourceChains.length === 0) {
      return "ALL";
    }
    return [...effectiveSelectedSourceChains].sort((a, b) => a - b).join("|");
  }, [
    allAvailableSourceChainIds.length,
    effectiveSelectedSourceChains,
    selectedSourceChains,
  ]);
  const hasPendingSourceSelectionChanges =
    sourceSelectionKey !== appliedSourceSelectionKey;

  const getMaxForCurrentSelection = useCallback(async () => {
    if (!nexusSDK || !inputs?.token || !inputs?.chain) return undefined;
    const maxBalAvailable = await nexusSDK.calculateMaxForBridge({
      token: inputs.token,
      toChainId: inputs.chain,
      recipient: inputs.recipient,
      sourceChains: sourceChainsForSdk,
    });
    if (!maxBalAvailable?.amount) return "0";
    return clampAmountToMax({
      amount: maxBalAvailable.amount,
      maxAmount: configuredMaxAmount,
      nexusSDK,
      token: inputs.token,
      chainId: inputs.chain,
    });
  }, [
    configuredMaxAmount,
    inputs?.chain,
    inputs?.recipient,
    inputs?.token,
    nexusSDK,
    sourceChainsForSdk,
  ]);

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
    [allAvailableSourceChainIds],
  );

  const sourceSelection = useMemo(() => {
    const amount = inputs?.amount?.trim() ?? "";
    const decimals =
      inputs?.token === "USDM" || inputs?.chain === SUPPORTED_CHAINS.BNB
        ? 18
        : filteredBridgableBalance?.decimals;
    const selectedChainSet = new Set(effectiveSelectedSourceChains);
    const selectedTotalRaw =
      !nexusSDK || typeof decimals !== "number"
        ? BigInt(0)
        : availableSources.reduce((sum, source) => {
            if (!selectedChainSet.has(source.chain.id)) return sum;
            try {
              return (
                sum + nexusSDK.utils.parseUnits(source.balance ?? "0", decimals)
              );
            } catch {
              return sum;
            }
          }, BigInt(0));
    const selectedTotal =
      !nexusSDK || typeof decimals !== "number"
        ? "0"
        : formatAmountForDisplay(selectedTotalRaw, decimals, nexusSDK);
    const baseSelection = {
      selectedTotal,
      requiredTotal: amount || "0",
      requiredSafetyTotal: amount || "0",
      missingToProceed: "0",
      missingToSafety: "0",
      coverageState: "healthy" as SourceCoverageState,
      coverageToSafetyPercent: 100,
      isBelowRequired: false,
      isBelowSafetyBuffer: false,
    };

    if (!nexusSDK || !inputs?.token || !inputs?.chain || !amount) {
      return baseSelection;
    }

    try {
      const requiredRaw = nexusSDK.convertTokenReadableAmountToBigInt(
        amount,
        inputs.token,
        inputs.chain,
      );
      if (requiredRaw <= BigInt(0)) {
        return baseSelection;
      }

      const requiredSafetyRaw =
        (requiredRaw * SOURCE_SAFETY_MULTIPLIER_NUMERATOR +
          (SOURCE_SAFETY_MULTIPLIER_DENOMINATOR - BigInt(1))) /
        SOURCE_SAFETY_MULTIPLIER_DENOMINATOR;

      const missingToProceedRaw =
        selectedTotalRaw >= requiredRaw
          ? BigInt(0)
          : requiredRaw - selectedTotalRaw;
      const missingToSafetyRaw =
        selectedTotalRaw >= requiredSafetyRaw
          ? BigInt(0)
          : requiredSafetyRaw - selectedTotalRaw;

      const coverageState: SourceCoverageState =
        selectedTotalRaw < requiredRaw
          ? "error"
          : selectedTotalRaw < requiredSafetyRaw
            ? "warning"
            : "healthy";

      const coverageBasisPoints =
        requiredSafetyRaw === BigInt(0)
          ? 10_000
          : selectedTotalRaw >= requiredSafetyRaw
            ? 10_000
            : Number((selectedTotalRaw * BigInt(10_000)) / requiredSafetyRaw);
      return {
        selectedTotal,
        requiredTotal: amount,
        requiredSafetyTotal: formatAmountForDisplay(
          requiredSafetyRaw,
          decimals,
          nexusSDK,
        ),
        missingToProceed: formatAmountForDisplay(
          missingToProceedRaw,
          decimals,
          nexusSDK,
        ),
        missingToSafety: formatAmountForDisplay(
          missingToSafetyRaw,
          decimals,
          nexusSDK,
        ),
        coverageState,
        coverageToSafetyPercent: coverageBasisPoints / 100,
        isBelowRequired: coverageState === "error",
        isBelowSafetyBuffer: coverageState !== "healthy",
      };
    } catch {
      return baseSelection;
    }
  }, [
    filteredBridgableBalance?.decimals,
    nexusSDK,
    inputs?.chain,
    inputs?.amount,
    inputs?.token,
    availableSources,
    effectiveSelectedSourceChains,
  ]);

  const refreshIntent = async (options?: { reportError?: boolean }) => {
    if (!intent.current) return false;
    const activeRunId = runIdRef.current;
    setRefreshing(true);
    try {
      const updated = await intent.current.refresh(sourceChainsForSdk);
      if (activeRunId !== runIdRef.current) return false;
      if (updated) {
        intent.current.intent = updated;
      }
      setAppliedSourceSelectionKey(sourceSelectionKey);
      return true;
    } catch (error) {
      if (activeRunId !== runIdRef.current) return false;
      console.error("Transaction failed:", error);
      if (options?.reportError) {
        const message = "Unable to refresh source selection. Please try again.";
        setTxError(message);
        onError?.(message);
      }
      return false;
    } finally {
      if (activeRunId !== runIdRef.current) return;
      setRefreshing(false);
    }
  };

  const reset = () => {
    runIdRef.current += 1;
    intent.current?.deny();
    intent.current = null;
    allowance.current = null;
    dispatch({ type: "resetInputs" });
    dispatch({ type: "setStatus", payload: "idle" });
    setRefreshing(false);
    setSelectedSourceChains(null);
    setAppliedSourceSelectionKey("ALL");
    setLastExplorerUrl("");
    stopwatch.stop();
    stopwatch.reset();
    resetSteps();
  };

  const startTransaction = () => {
    if (!intent.current) return;
    if (allAvailableSourceChainIds.length === 0) {
      const message =
        "No eligible source chains available for the selected token and destination.";
      setTxError(message);
      onError?.(message);
      return;
    }
    if (sourceSelection.isBelowRequired && inputs?.token) {
      const message = `Selected sources are not enough. Add ${sourceSelection.missingToProceed} ${inputs.token} more to make this transaction.`;
      setTxError(message);
      onError?.(message);
      return;
    }
    if (sourceSelection.coverageState === "warning" && inputs?.token) {
      const message = `Add ${sourceSelection.missingToSafety} ${inputs.token} more in selected sources to reach the 130% safety buffer.`;
      setTxError(message);
      onError?.(message);
      return;
    }
    void (async () => {
      // Ensure the intent reflects the latest selected sources before allowing.
      const refreshed = await refreshIntent({ reportError: true });
      if (!refreshed || !intent.current) return;
      intent.current?.allow();
      setIsDialogOpen(true);
      setTxError(null);
    })();
  };

  const commitAmount = async () => {
    if (intent.current || loading || txError || !areInputsValid) return;
    await handleTransaction();
  };

  usePolling(
    Boolean(intent.current) &&
      !isDialogOpen &&
      !isSourceMenuOpen &&
      !hasPendingSourceSelectionChanges,
    async () => {
      await refreshIntent();
    },
    15000,
  );

  const stopwatch = useStopwatch({ intervalMs: 100 });

  useEffect(() => {
    if (!nexusSDK || !inputs?.token || !inputs?.chain) {
      setSelectedSourcesMaxAmount(null);
      return;
    }
    if (allAvailableSourceChainIds.length === 0) {
      setSelectedSourcesMaxAmount("0");
      return;
    }
    const requestId = ++maxAmountRequestIdRef.current;
    void (async () => {
      try {
        const maxForCurrentSelection = await getMaxForCurrentSelection();
        if (requestId !== maxAmountRequestIdRef.current) return;
        setSelectedSourcesMaxAmount(maxForCurrentSelection ?? "0");
      } catch (error) {
        if (requestId !== maxAmountRequestIdRef.current) return;
        console.error("Unable to calculate max for selected sources:", error);
        setSelectedSourcesMaxAmount("0");
      }
    })();
  }, [
    allAvailableSourceChainIds.length,
    getMaxForCurrentSelection,
    inputs?.chain,
    inputs?.token,
    nexusSDK,
  ]);

  useEffect(() => {
    runIdRef.current += 1;
    if (intent.current) {
      intent.current.deny();
      intent.current = null;
    }
    setRefreshing(false);
    setAppliedSourceSelectionKey("ALL");
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
    isSourceSelectionInsufficient: sourceSelection.isBelowRequired,
    isSourceSelectionBelowSafetyBuffer: sourceSelection.isBelowSafetyBuffer,
    isSourceSelectionReadyForAccept:
      sourceSelection.coverageState === "healthy",
    sourceCoverageState: sourceSelection.coverageState,
    sourceCoveragePercent: sourceSelection.coverageToSafetyPercent,
    missingToProceed: sourceSelection.missingToProceed,
    missingToSafety: sourceSelection.missingToSafety,
    selectedTotal: sourceSelection.selectedTotal,
    requiredTotal: sourceSelection.requiredTotal,
    requiredSafetyTotal: sourceSelection.requiredSafetyTotal,
    maxAvailableAmount: selectedSourcesMaxAmount ?? undefined,
  };
};

export default useTransfer;
