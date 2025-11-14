import { useCallback, useMemo, useReducer, useRef } from "react";
import {
  type NexusSDK,
  NEXUS_EVENTS,
  type SwapStepType,
  type ExecuteResult,
  type ExecuteParams,
  type ExactInSwapInput,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import { useNexus } from "../../nexus/NexusProvider";
import { useStopwatch } from "../../common/hooks/useStopwatch";
import { useTransactionSteps } from "../../common/tx/useTransactionSteps";
import { SWAP_EXPECTED_STEPS } from "../../common/tx/steps";
import { useInterval } from "../../common/hooks/useInterval";
import { autoDistributeUsd } from "../utils/distribution";
import { DESTINATION_SWAP_TOKENS } from "../../swaps/config/destination";

type Step =
  | SwapStepType
  | {
      type: "EXECUTE_HASH" | "EXECUTE_COMPLETE";
      explorerURL?: string;
      completed?: boolean;
    };

type DestinationLocked =
  | {
      chainId: number;
      tokenAddress: Address;
    }
  | {
      chainId: number;
      tokenOptions: Address[];
    }
  | null;

export type SelectedSource = {
  chainId: number;
  tokenAddress: Address;
  symbol: string;
  decimals: number;
};

interface UseSwapDepositProps {
  nexusSDK: NexusSDK | null;
  address: Address;
  destination: DestinationLocked;
  executeBuilder: (
    amount: string,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
  onStart?: () => void;
  onComplete?: (amount?: string) => void;
  onError?: (message: string) => void;
}

type Phase = "idle" | "review" | "inProgress" | "completed" | "error";

type State = {
  phase: Phase;
  dialogOpen: boolean;
  uiStep: "select" | "amount";
  selectedSources: SelectedSource[];
  sourcesModalOpen: boolean;
  destinationModalOpen: boolean;
  totalUsd: string;
  perSourceUsd: Record<string, string>;
  selectedDestinationToken?: Address | null;
  errorMessage?: string | null;
  simGas?: bigint | null;
};

type Action =
  | { type: "SET_PHASE"; phase: Phase }
  | { type: "SET_DIALOG_OPEN"; open: boolean }
  | { type: "SET_UI_STEP"; step: State["uiStep"] }
  | { type: "SET_SELECTED_SOURCES"; sources: SelectedSource[] }
  | { type: "SET_SOURCES_MODAL"; open: boolean }
  | { type: "SET_DEST_MODAL"; open: boolean }
  | { type: "SET_TOTAL_USD"; value: string }
  | { type: "SET_PER_SOURCE_USD"; key: string; value: string }
  | { type: "BULK_SET_PER_SOURCE_USD"; entries: Array<[string, string]> }
  | { type: "SET_DEST_TOKEN"; token: Address | null | undefined }
  | { type: "SET_ERROR"; message: string | null }
  | { type: "SET_SIM_GAS"; gas: bigint | null }
  | { type: "RESET" };

const initialState: State = {
  phase: "idle",
  dialogOpen: false,
  uiStep: "select",
  selectedSources: [],
  sourcesModalOpen: false,
  destinationModalOpen: false,
  totalUsd: "",
  perSourceUsd: {},
  selectedDestinationToken: null,
  errorMessage: null,
  simGas: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "SET_DIALOG_OPEN":
      return { ...state, dialogOpen: action.open };
    case "SET_UI_STEP":
      return { ...state, uiStep: action.step };
    case "SET_SELECTED_SOURCES":
      return { ...state, selectedSources: action.sources };
    case "SET_SOURCES_MODAL":
      return { ...state, sourcesModalOpen: action.open };
    case "SET_DEST_MODAL":
      return { ...state, destinationModalOpen: action.open };
    case "SET_TOTAL_USD":
      return { ...state, totalUsd: action.value };
    case "SET_PER_SOURCE_USD":
      return {
        ...state,
        perSourceUsd: { ...state.perSourceUsd, [action.key]: action.value },
      };
    case "BULK_SET_PER_SOURCE_USD": {
      const next = { ...state.perSourceUsd };
      for (const [k, v] of action.entries) next[k] = v;
      return { ...state, perSourceUsd: next };
    }
    case "SET_DEST_TOKEN":
      return { ...state, selectedDestinationToken: action.token ?? null };
    case "SET_ERROR":
      return { ...state, errorMessage: action.message };
    case "SET_SIM_GAS":
      return { ...state, simGas: action.gas };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const keyFor = (chainId: number, token: Address) =>
  `${chainId}:${token.toLowerCase()}`;

const useSwapDeposit = ({
  nexusSDK,
  address,
  destination,
  executeBuilder,
  onStart,
  onComplete,
  onError,
}: UseSwapDepositProps) => {
  if (!nexusSDK) {
    throw new Error("Nexus SDK not initialized");
  }
  const {
    handleNexusError,
    swapIntent,
    setSwapIntent,
    unifiedBalance,
    fetchUnifiedBalance,
    getFiatValue,
  } = useNexus();

  const [state, dispatch] = useReducer(reducer, initialState);

  const {
    steps,
    onStepComplete,
    seed,
    reset: resetSteps,
  } = useTransactionSteps<Step>({ expected: SWAP_EXPECTED_STEPS as Step[] });

  const stopwatch = useStopwatch({
    running: state.dialogOpen && state.phase === "inProgress",
    intervalMs: 100,
  });

  const destinationChainId = useMemo(() => {
    return destination?.chainId ?? null;
  }, [destination]);

  const resolvedDestinationToken = useMemo(() => {
    if (!destination) return null;
    if ("tokenAddress" in destination && destination.tokenAddress) {
      return destination.tokenAddress;
    }
    if ("tokenOptions" in destination && destination.tokenOptions?.length) {
      return state.selectedDestinationToken ?? null;
    }
    return null;
  }, [destination, state.selectedDestinationToken]);

  const destinationOptions = useMemo(() => {
    if (!destinationChainId) return [];
    return DESTINATION_SWAP_TOKENS.get(destinationChainId) ?? [];
  }, [destinationChainId]);

  const destinationMeta = useMemo(() => {
    if (!destinationOptions?.length) return null;
    const token =
      resolvedDestinationToken ??
      (destinationOptions.length ? destinationOptions[0].tokenAddress : null);
    if (!token) return null;
    return (
      destinationOptions.find(
        (t) =>
          String(t.tokenAddress).toLowerCase() === String(token).toLowerCase()
      ) ?? null
    );
  }, [destinationOptions, resolvedDestinationToken]);

  const explorerUrls = useMemo(() => {
    let sourceSwapUrl: string | undefined;
    let destinationSwapUrl: string | undefined;
    let executeUrl: string | undefined;
    for (const s of steps) {
      const t = (s.step as any)?.type as string;
      if (t === "SOURCE_SWAP_HASH" && (s.step as any)?.explorerURL) {
        sourceSwapUrl = (s.step as any).explorerURL;
      }
      if (t === "DESTINATION_SWAP_HASH" && (s.step as any)?.explorerURL) {
        destinationSwapUrl = (s.step as any).explorerURL;
      }
      if (t === "EXECUTE_HASH" && (s.step as any)?.explorerURL) {
        executeUrl = (s.step as any).explorerURL;
      }
    }
    return { sourceSwapUrl, destinationSwapUrl, executeUrl };
  }, [steps]);

  const areInputsValid = useMemo(() => {
    const total = Number.parseFloat(state.totalUsd || "0");
    if (!Number.isFinite(total) || total <= 0) return false;
    if (!destinationChainId || !resolvedDestinationToken) return false;
    const perValues = Object.values(state.perSourceUsd).map((v) =>
      Number.parseFloat(v || "0")
    );
    if (!perValues.length) return false;
    const sum = perValues.reduce(
      (acc, v) => acc + (Number.isFinite(v) ? v : 0),
      0
    );
    // Allow small floating error
    return sum > 0 && sum <= total + 0.01;
  }, [
    state.totalUsd,
    state.perSourceUsd,
    destinationChainId,
    resolvedDestinationToken,
  ]);

  const cancelledRef = useRef(false);

  const getBalanceWeiFor = useCallback(
    (src: SelectedSource): { balanceWei: bigint; decimals: number } => {
      const assets = unifiedBalance ?? [];
      for (const asset of assets) {
        const breakdown = asset?.breakdown ?? [];
        const b = breakdown.find(
          (br: any) =>
            br?.chain?.id === src.chainId &&
            String(br?.contractAddress ?? "").toLowerCase() ===
              src.tokenAddress.toLowerCase()
        );
        if (b) {
          const decimals = Number(
            b.decimals ?? asset.decimals ?? src.decimals ?? 18
          );
          try {
            const balWei =
              nexusSDK?.utils?.parseUnits(String(b.balance ?? "0"), decimals) ??
              BigInt(0);
            return { balanceWei: balWei, decimals };
          } catch {
            return { balanceWei: BigInt(0), decimals };
          }
        }
      }
      return { balanceWei: BigInt(0), decimals: src.decimals ?? 18 };
    },
    [unifiedBalance]
  );

  const getUsdPrice = useCallback(
    (tokenAddress: Address, chainId: number): number | null => {
      // Resolve symbol from unified balance breakdown
      for (const asset of unifiedBalance ?? []) {
        for (const b of asset?.breakdown ?? []) {
          if (
            Number(b?.chain?.id) === chainId &&
            String(b?.contractAddress || "").toLowerCase() ===
              tokenAddress.toLowerCase()
          ) {
            const usd = Number.parseFloat(getFiatValue(1, asset.symbol) || "0");
            return Number.isFinite(usd) && usd > 0 ? usd : null;
          }
        }
      }
      return null;
    },
    [unifiedBalance, getFiatValue]
  );

  const autoDistribute = useCallback(
    (selectedSources: SelectedSource[]) => {
      const total = Number.parseFloat(state.totalUsd || "0");
      if (!Number.isFinite(total) || total <= 0) {
        dispatch({
          type: "SET_ERROR",
          message: "Enter a valid total USD amount",
        });
        return;
      }
      const prepared = selectedSources.map((s) => {
        const { balanceWei, decimals } = getBalanceWeiFor(s);
        const priceUsd = getUsdPrice(s.tokenAddress, s.chainId) ?? 0;
        return {
          key: keyFor(s.chainId, s.tokenAddress),
          balanceWei,
          decimals,
          priceUsd,
        };
      });
      const result = autoDistributeUsd(total, prepared);
      const entries: Array<[string, string]> = result.map((r) => [
        r.key,
        // keep a few decimals in USD for display/editing
        r.allocUsd.toFixed(6),
      ]);
      dispatch({ type: "BULK_SET_PER_SOURCE_USD", entries });
      dispatch({ type: "SET_ERROR", message: null });
    },
    [state.totalUsd, getBalanceWeiFor, getUsdPrice]
  );

  const setPerSourceUsd = useCallback(
    (chainId: number, token: Address, usd: string) => {
      dispatch({
        type: "SET_PER_SOURCE_USD",
        key: keyFor(chainId, token),
        value: usd,
      });
    },
    []
  );

  const setTotalUsd = useCallback((val: string) => {
    dispatch({ type: "SET_TOTAL_USD", value: val });
  }, []);

  const setDestinationToken = useCallback((token: Address | null) => {
    dispatch({ type: "SET_DEST_TOKEN", token });
  }, []);

  // UI flow helpers
  const continueFromSelect = useCallback((sources: SelectedSource[]) => {
    dispatch({ type: "SET_SELECTED_SOURCES", sources });
    dispatch({ type: "SET_UI_STEP", step: "amount" });
  }, []);

  const continueFromAmount = useCallback(() => {
    // Auto-distribute with current selected sources
    autoDistribute(state.selectedSources);
  }, [autoDistribute, state.selectedSources]);

  const setSourcesModalOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_SOURCES_MODAL", open });
  }, []);

  const setDestinationModalOpen = useCallback((open: boolean) => {
    dispatch({ type: "SET_DEST_MODAL", open });
  }, []);

  const buildFromEntries = useCallback(
    (selectedSources: SelectedSource[]) => {
      const from: ExactInSwapInput["from"] = [];
      for (const src of selectedSources) {
        const key = keyFor(src.chainId, src.tokenAddress);
        const usdStr = state.perSourceUsd[key] ?? "0";
        const usd = Number.parseFloat(usdStr || "0");
        if (!Number.isFinite(usd) || usd <= 0) continue;
        const price = getUsdPrice(src.tokenAddress, src.chainId);
        if (!price || price <= 0) continue;
        const tokens = usd / price;
        // Convert tokens to wei using decimals; floor to avoid exceeding balance
        const amountWei = nexusSDK?.utils.parseUnits(
          tokens.toFixed(src.decimals),
          src.decimals
        );
        if (amountWei <= BigInt(0)) continue;
        from.push({
          chainId: src.chainId,
          amount: amountWei,
          tokenAddress: src.tokenAddress,
        });
      }
      return from;
    },
    [state.perSourceUsd, getUsdPrice]
  );

  const buildIntent = useCallback(
    async (selectedSources: SelectedSource[]) => {
      if (!nexusSDK) return;
      if (!areInputsValid) {
        dispatch({ type: "SET_ERROR", message: "Please complete all inputs" });
        return;
      }
      const toChainId = destinationChainId!;
      const toToken = resolvedDestinationToken!;
      try {
        onStart?.();
        dispatch({ type: "SET_ERROR", message: null });
        seed(SWAP_EXPECTED_STEPS as Step[]);
        const from = buildFromEntries(selectedSources);
        if (!from.length) {
          throw new Error("No valid sources to swap");
        }
        const input: ExactInSwapInput = {
          from,
          toChainId,
          toTokenAddress: toToken,
        };
        // Call swapWithExactIn to initialize intent and subscribe to events.
        await nexusSDK.swapWithExactIn(input, {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
              const step = event.args as SwapStepType & {
                explorerURL?: string;
                completed?: boolean;
              };
              onStepComplete(step as Step);
            }
          },
        });
        dispatch({ type: "SET_PHASE", phase: "review" });
      } catch (error) {
        const { message } = handleNexusError(error);
        dispatch({ type: "SET_ERROR", message });
        onError?.(message);
      }
    },
    [
      nexusSDK,
      areInputsValid,
      destinationChainId,
      resolvedDestinationToken,
      onStart,
      buildFromEntries,
      seed,
      onStepComplete,
      handleNexusError,
      onError,
    ]
  );

  const simulateExecute = useCallback(async () => {
    if (!nexusSDK || !swapIntent) return;
    try {
      const builder = executeBuilder(
        swapIntent.intent.destination.amount,
        address
      );
      const sim = await nexusSDK.simulateExecute({
        toChainId: destinationChainId!,
        ...builder,
      });
      dispatch({ type: "SET_SIM_GAS", gas: sim?.gasFee ?? null });
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "SET_ERROR", message });
      onError?.(message);
      dispatch({ type: "SET_SIM_GAS", gas: null });
    }
  }, [nexusSDK, swapIntent, executeBuilder, address, destinationChainId]);

  const acceptAndRun = useCallback(() => {
    if (!swapIntent) return;
    swapIntent.allow();
    dispatch({ type: "SET_DIALOG_OPEN", open: true });
    dispatch({ type: "SET_PHASE", phase: "inProgress" });
  }, [swapIntent]);

  const deny = useCallback(() => {
    if (swapIntent) swapIntent.deny();
    // Full reset
    cancelledRef.current = true;
    dispatch({ type: "RESET" });
    resetSteps();
    setSwapIntent(null);
    stopwatch.stop();
  }, [swapIntent, resetSteps, setSwapIntent, stopwatch]);

  const maybeExecute = useCallback(async () => {
    if (!nexusSDK || !swapIntent || !destinationChainId) return;
    try {
      const builder = executeBuilder(
        swapIntent.intent.destination.amount,
        address
      );
      const execRes: ExecuteResult = await nexusSDK.execute({
        toChainId: destinationChainId,
        ...builder,
      });
      if (execRes?.transactionHash) {
        onStepComplete({
          type: "EXECUTE_HASH",
          explorerURL: execRes.explorerUrl ?? "",
          completed: true,
        } as Step);
        onStepComplete({
          type: "EXECUTE_COMPLETE",
          completed: true,
        } as Step);
        dispatch({ type: "SET_PHASE", phase: "completed" });
        onComplete?.(swapIntent.intent.destination.amount);
        await fetchUnifiedBalance();
      } else {
        throw new Error("Execute failed");
      }
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "SET_ERROR", message });
      dispatch({ type: "SET_PHASE", phase: "error" });
      onError?.(message);
      dispatch({ type: "SET_DIALOG_OPEN", open: false });
    }
  }, [
    nexusSDK,
    swapIntent,
    destinationChainId,
    executeBuilder,
    address,
    onStepComplete,
    onComplete,
    fetchUnifiedBalance,
    handleNexusError,
    onError,
  ]);

  // Watch for SWAP_COMPLETE to trigger execute
  const swapCompleted = useMemo(
    () =>
      steps.some(
        (s) => (s.step as any)?.type === "SWAP_COMPLETE" && s.completed
      ),
    [steps]
  );

  // Trigger execute once after swap is complete and user accepted
  const executedRef = useRef(false);
  if (state.phase === "inProgress" && swapCompleted && !executedRef.current) {
    executedRef.current = true;
    void maybeExecute();
  }

  // Periodic intent refresh in review phase (when dialog closed)
  useInterval(
    async () => {
      if (!swapIntent) return;
      try {
        const updated = await swapIntent.refresh();
        setSwapIntent((prev) => (prev ? { ...prev, intent: updated } : prev));
        await simulateExecute();
      } catch {
        // ignore refresh errors
      }
    },
    state.phase === "review" && !state.dialogOpen && swapIntent ? 15000 : null,
    { enabled: true, immediate: true }
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    resetSteps();
    setSwapIntent(null);
    stopwatch.stop();
  }, [resetSteps, setSwapIntent, stopwatch]);

  return {
    // state
    phase: state.phase,
    dialogOpen: state.dialogOpen,
    uiStep: state.uiStep,
    sourcesModalOpen: state.sourcesModalOpen,
    destinationModalOpen: state.destinationModalOpen,
    selectedSources: state.selectedSources,
    totalUsd: state.totalUsd,
    perSourceUsd: state.perSourceUsd,
    errorMessage: state.errorMessage,
    simGas: state.simGas,
    // setters
    setTotalUsd,
    setPerSourceUsd,
    setDestinationToken,
    setSourcesModalOpen,
    setDestinationModalOpen,
    // derived
    areInputsValid,
    steps,
    timer: stopwatch.seconds,
    explorerUrls,
    destinationOptions,
    destinationMeta,
    // actions
    autoDistribute,
    continueFromSelect,
    continueFromAmount,
    buildIntent,
    simulateExecute,
    acceptAndRun,
    deny,
    reset,
  };
};

export default useSwapDeposit;
