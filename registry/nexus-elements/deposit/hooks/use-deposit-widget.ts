"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  WidgetStep,
  DepositWidgetContextValue,
  TransactionStatus,
  DepositInputs,
  NavigationDirection,
  AssetSelectionState,
  DestinationConfig,
} from "../types";
import { getChainIdsForFilter } from "../utils/asset-helpers";
import {
  NEXUS_EVENTS,
  type OnSwapIntentHookData,
  type SwapStepType,
  type ExecuteParams,
  type SUPPORTED_CHAINS_IDS,
  type SwapAndExecuteParams,
  CHAIN_METADATA,
  parseUnits,
} from "@avail-project/nexus-core";
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

interface DepositState {
  step: WidgetStep;
  inputs: DepositInputs;
  status: TransactionStatus;
  explorerUrls: {
    intentUrl: string | null;
    executeUrl: string | null;
  };
  error: string | null;
  lastResult: unknown;
  navigationDirection: NavigationDirection;
  simulation: {
    swapIntent: OnSwapIntentHookData;
  } | null;
  simulationLoading: boolean;
  receiveAmount: string | null;
}

type Action =
  | {
      type: "setStep";
      payload: { step: WidgetStep; direction: NavigationDirection };
    }
  | { type: "setInputs"; payload: Partial<DepositInputs> }
  | { type: "setStatus"; payload: TransactionStatus }
  | { type: "setExplorerUrls"; payload: Partial<DepositState["explorerUrls"]> }
  | { type: "setError"; payload: string | null }
  | { type: "setLastResult"; payload: unknown }
  | {
      type: "setSimulation";
      payload: {
        swapIntent: OnSwapIntentHookData;
      };
    }
  | { type: "setSimulationLoading"; payload: boolean }
  | { type: "setReceiveAmount"; payload: string | null }
  | { type: "reset" };

const STEP_HISTORY: Record<WidgetStep, WidgetStep | null> = {
  amount: null,
  confirmation: "amount",
  "transaction-status": null,
  "transaction-complete": null,
  "asset-selection": "amount",
} as const;

interface UseDepositProps {
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: string,
    amount: bigint,
    chainId: number,
    user: Address,
  ) => Omit<ExecuteParams, "toChainId">;
  destination: DestinationConfig;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const createInitialState = (): DepositState => ({
  step: "amount",
  inputs: {
    amount: undefined,
    selectedToken: "USDC",
  },
  status: "idle",
  explorerUrls: {
    intentUrl: null,
    executeUrl: null,
  },
  error: null,
  lastResult: null,
  navigationDirection: null,
  simulation: null,
  simulationLoading: false,
  receiveAmount: null,
});

function reducer(state: DepositState, action: Action): DepositState {
  switch (action.type) {
    case "setStep":
      return {
        ...state,
        step: action.payload.step,
        navigationDirection: action.payload.direction,
      };
    case "setInputs": {
      const newInputs = { ...state.inputs, ...action.payload };
      let newStatus = state.status;
      if (
        state.status === "idle" &&
        newInputs.amount &&
        Number.parseFloat(newInputs.amount) > 0
      ) {
        newStatus = "previewing";
      }
      if (
        state.status === "previewing" &&
        (!newInputs.amount || Number.parseFloat(newInputs.amount) <= 0)
      ) {
        newStatus = "idle";
      }
      return { ...state, inputs: newInputs, status: newStatus };
    }
    case "setStatus":
      return { ...state, status: action.payload };
    case "setExplorerUrls":
      return {
        ...state,
        explorerUrls: { ...state.explorerUrls, ...action.payload },
      };
    case "setError":
      return { ...state, error: action.payload };
    case "setLastResult":
      return { ...state, lastResult: action.payload };
    case "setSimulation":
      return {
        ...state,
        simulation: action.payload,
      };
    case "setSimulationLoading":
      return { ...state, simulationLoading: action.payload };
    case "setReceiveAmount":
      return { ...state, receiveAmount: action.payload };
    case "reset":
      return createInitialState();
    default:
      return state;
  }
}

const createInitialAssetSelection = (): AssetSelectionState => ({
  selectedChainIds: new Set<string>(),
  filter: "all",
  expandedTokens: new Set(),
});

export function useDepositWidget(
  props: UseDepositProps,
): DepositWidgetContextValue {
  const { executeDeposit, destination, onSuccess, onError } = props;

  const {
    nexusSDK,
    swapIntent,
    swapBalance,
    fetchSwapBalance,
    getFiatValue,
    exchangeRate,
  } = useNexus();

  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const { address } = useAccount();
  const handleNexusError = useNexusError();

  const {
    seed,
    onStepComplete,
    reset: resetSteps,
    steps,
  } = useTransactionSteps<SwapStepType>();

  const stopwatch = useStopwatch({
    running: state.status === "executing",
    intervalMs: 100,
  });

  const hasAutoSelected = useRef(false);
  const initialSimulationDone = useRef(false);
  const lastSimulationTime = useRef(0);

  const [assetSelection, setAssetSelectionState] =
    useState<AssetSelectionState>(createInitialAssetSelection);

  const setAssetSelection = useCallback(
    (update: Partial<AssetSelectionState>) => {
      setAssetSelectionState((prev) => ({ ...prev, ...update }));
    },
    [],
  );

  const isProcessing = state.status === "executing";
  const isSuccess = state.status === "success";
  const isError = state.status === "error";

  const setInputs = useCallback((next: Partial<DepositInputs>) => {
    dispatch({ type: "setInputs", payload: next });
  }, []);

  const setTxError = useCallback((error: string | null) => {
    dispatch({ type: "setError", payload: error });
  }, []);

  const goToStep = useCallback((newStep: WidgetStep) => {
    dispatch({
      type: "setStep",
      payload: { step: newStep, direction: "forward" },
    });
  }, []);

  const goBack = useCallback(() => {
    const previousStep = STEP_HISTORY[state.step];
    if (previousStep) {
      dispatch({
        type: "setStep",
        payload: { step: previousStep, direction: "backward" },
      });
    }
  }, [state.step]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    setAssetSelectionState(createInitialAssetSelection());
    resetSteps();
    swapIntent.current = null;
    initialSimulationDone.current = false;
    lastSimulationTime.current = 0;
    setPollingEnabled(false);
    stopwatch.stop();
    stopwatch.reset();
  }, [resetSteps, swapIntent, stopwatch]);

  const activeIntent = state.simulation?.swapIntent ?? swapIntent.current;

  const availableAssets = useMemo(() => {
    if (!swapBalance) return [];
    const items: Array<{
      chainId: number;
      tokenAddress: `0x${string}`;
      decimals: number;
      symbol: string;
      balance: string;
      balanceInFiat?: number;
      tokenLogo?: string;
      chainLogo?: string;
      chainName?: string;
    }> = [];

    for (const asset of swapBalance) {
      if (!asset?.breakdown?.length) continue;
      for (const breakdown of asset.breakdown) {
        if (!breakdown?.chain?.id || !breakdown.balance) continue;
        const numericBalance = Number.parseFloat(breakdown.balance);
        if (!Number.isFinite(numericBalance) || numericBalance <= 0) continue;

        items.push({
          chainId: breakdown.chain.id,
          tokenAddress: breakdown.contractAddress as `0x${string}`,
          decimals: breakdown.decimals ?? asset.decimals,
          symbol: asset.symbol,
          balance: breakdown.balance,
          balanceInFiat: breakdown.balanceInFiat,
          tokenLogo: asset.icon,
          chainLogo: breakdown.chain.logo,
          chainName: breakdown.chain.name,
        });
      }
    }
    return items.toSorted(
      (a, b) => (b.balanceInFiat ?? 0) - (a.balanceInFiat ?? 0),
    );
  }, [swapBalance]);

  const totalSelectedBalance = useMemo(
    () =>
      availableAssets.reduce(
        (sum, asset) => sum + (asset.balanceInFiat ?? 0),
        0,
      ),
    [availableAssets],
  );

  const confirmationDetails = useMemo(() => {
    if (!activeIntent || !nexusSDK) return null;

    const receiveAmountAfterSwap = nexusSDK.utils.formatTokenBalance(
      activeIntent.intent.destination.amount,
      {
        symbol: activeIntent.intent.destination.token.symbol,
        decimals: activeIntent.intent.destination.token.decimals,
      },
    );

    const receiveAmountAfterSwapUsd = getFiatValue(
      Number.parseFloat(activeIntent.intent.destination.amount),
      destination.tokenSymbol,
    );

    const totalAmountSpent = nexusSDK.utils.formatTokenBalance(
      activeIntent.intent.sources?.reduce((acc, source) => {
        const amount = Number.parseFloat(source.amount);
        return acc + amount;
      }, 0),
      {
        symbol: destination.tokenSymbol,
        decimals: destination.tokenDecimals,
      },
    );

    const sources = activeIntent.intent.sources.map((source) =>
      availableAssets.find(
        (asset) =>
          asset.chainId === source.chain.id &&
          asset.symbol === source.token.symbol,
      ),
    );

    return {
      sourceLabel: destination.label ?? "Deposit",
      sources,
      gasTokenSymbol: destination.gasTokenSymbol,
      estimatedTime: destination.estimatedTime ?? "~30s",
      amountSpent: totalAmountSpent,
      receiveTokenSymbol: destination.tokenSymbol,
      receiveAmountAfterSwapUsd,
      receiveAmountAfterSwap,
      receiveTokenLogo: destination.tokenLogo,
      receiveTokenChain: destination.chainId,
    };
  }, [activeIntent, nexusSDK, destination, availableAssets]);

  const feeBreakdown = useMemo(() => {
    if (!nexusSDK || !state.simulation || !state.inputs) {
      return { totalGasFee: 0, gasUsd: 0, gasFormatted: "0" };
    }

    const native = CHAIN_METADATA[destination.chainId]?.nativeCurrency;
    const nativeSymbol = native?.symbol;
    const nativeDecimals = native?.decimals;

    const gasFormatted =
      nexusSDK.utils.formatTokenBalance(BigInt(200000), {
        symbol: nativeSymbol,
        decimals: nativeDecimals,
      }) ?? "0";
    const gasUnits = Number.parseFloat(
      nexusSDK.utils.formatUnits(BigInt(200000), nativeDecimals),
    );
    const gasUsd = getFiatValue(gasUnits, nativeSymbol ?? "ETH");

    return { totalGasFee: gasUsd, gasUsd, gasFormatted };
  }, [
    nexusSDK,
    getFiatValue,
    state.simulation,
    state.inputs,
    destination.chainId,
  ]);

  const initiateSwapIntent = useCallback(
    (inputs: SwapAndExecuteParams) => {
      if (!nexusSDK || !inputs || isProcessing) return;

      seed(SWAP_EXPECTED_STEPS);

      nexusSDK
        .swapAndExecute(inputs, {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
              const step = event.args as SwapStepType & {
                explorerURL?: string;
                completed?: boolean;
              };
              console.log("STEP_COMPLETE", event);
              if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
                dispatch({
                  type: "setExplorerUrls",
                  payload: { intentUrl: step.explorerURL },
                });
              }
              if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
                dispatch({
                  type: "setExplorerUrls",
                  payload: { executeUrl: step.explorerURL },
                });
              }
              onStepComplete(step);
            }
          },
        })
        .then(() => {
          dispatch({
            type: "setReceiveAmount",
            payload: swapIntent.current?.intent?.destination?.amount ?? "",
          });
          onSuccess?.();
          dispatch({ type: "setStatus", payload: "success" });
        })
        .catch((error) => {
          const { message } = handleNexusError(error);
          dispatch({ type: "setError", payload: message });
          dispatch({ type: "setStatus", payload: "error" });
          onError?.(message);
        })
        .finally(() => {
          swapIntent.current = null;
        });
    },
    [
      nexusSDK,
      isProcessing,
      seed,
      onStepComplete,
      swapIntent,
      onSuccess,
      onError,
      handleNexusError,
    ],
  );

  const handleAmountContinue = useCallback(
    (totalAmountUsd: number) => {
      if (!nexusSDK || !address || !exchangeRate) return;

      const tokenAmount =
        totalAmountUsd / (exchangeRate[destination.tokenSymbol] ?? 1);
      const tokenAmountStr = tokenAmount.toFixed(destination.tokenDecimals);
      const parsed = parseUnits(tokenAmountStr, destination.tokenDecimals);

      const executeParams = executeDeposit(
        destination.tokenSymbol,
        destination.tokenAddress,
        parsed,
        destination.chainId,
        address,
      );

      const newInputs: SwapAndExecuteParams = {
        toChainId: destination.chainId,
        toTokenAddress: destination.tokenAddress,
        toAmount: parsed,
        execute: {
          to: executeParams.to,
          value: executeParams.value,
          data: executeParams.data,
          gas: BigInt(200_000),
        },
      };

      dispatch({
        type: "setInputs",
        payload: { amount: totalAmountUsd.toString() },
      });
      dispatch({ type: "setStatus", payload: "previewing" });
      dispatch({ type: "setSimulationLoading", payload: true });
      initiateSwapIntent(newInputs);
    },
    [
      nexusSDK,
      address,
      exchangeRate,
      destination,
      executeDeposit,
      initiateSwapIntent,
    ],
  );

  const handleConfirmOrder = useCallback(() => {
    if (!activeIntent) return;
    dispatch({ type: "setStatus", payload: "executing" });
    activeIntent.allow();
  }, [activeIntent]);

  const refreshSimulation = useCallback(async () => {
    const timeSinceLastSimulation = Date.now() - lastSimulationTime.current;
    if (timeSinceLastSimulation < 5000) {
      return;
    }

    try {
      dispatch({ type: "setSimulationLoading", payload: true });
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current!.intent = updated;
        dispatch({
          type: "setSimulation",
          payload: {
            swapIntent: swapIntent.current!,
          },
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
      stopwatch.reset();
      lastSimulationTime.current = Date.now();
    }
  }, [stopwatch]);

  useEffect(() => {
    if (
      initialSimulationDone.current ||
      !state.simulationLoading ||
      state.status !== "previewing"
    ) {
      return;
    }

    const checkInterval = setInterval(() => {
      if (swapIntent.current && !initialSimulationDone.current) {
        clearInterval(checkInterval);
        initialSimulationDone.current = true;
        void refreshSimulation().then(() => {
          dispatch({ type: "setSimulationLoading", payload: false });
          stopwatch.reset();
          lastSimulationTime.current = Date.now();
          setPollingEnabled(true);
        });
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [state.simulationLoading, state.status, refreshSimulation, stopwatch]);

  useEffect(() => {
    if (!nexusSDK) return;

    if (!swapBalance) {
      void fetchSwapBalance();
      return;
    }

    if (!hasAutoSelected.current && availableAssets.length > 0) {
      hasAutoSelected.current = true;
    }
  }, [nexusSDK, swapBalance, availableAssets, fetchSwapBalance]);

  usePolling(
    pollingEnabled &&
      state.status === "previewing" &&
      Boolean(swapIntent.current) &&
      !state.simulationLoading,
    async () => {
      await refreshSimulation();
    },
    15000,
  );

  const startTransaction = useCallback(() => {
    if (isProcessing) return;
    dispatch({ type: "setError", payload: null });
  }, [isProcessing]);

  return {
    step: state.step,
    inputs: state.inputs,
    setInputs,
    status: state.status,
    explorerUrls: state.explorerUrls,
    isProcessing,
    isSuccess,
    isError,
    txError: state.error,
    setTxError,
    goToStep,
    goBack,
    reset,
    navigationDirection: state.navigationDirection,
    startTransaction,
    lastResult: state.lastResult,
    assetSelection,
    setAssetSelection,
    swapBalance,
    activeIntent,
    confirmationDetails,
    feeBreakdown,
    steps,
    timer: stopwatch.seconds,
    handleConfirmOrder,
    handleAmountContinue,
  };
}
