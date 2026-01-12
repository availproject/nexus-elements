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
import {
  NEXUS_EVENTS,
  type OnSwapIntentHookData,
  type SwapStepType,
  type ExecuteParams,
  type SwapAndExecuteParams,
  parseUnits,
} from "@avail-project/nexus-core";
import {
  SWAP_EXPECTED_STEPS,
  useNexusError,
  usePolling,
  useStopwatch,
  useTransactionSteps,
  usdFormatter,
} from "../../common";
import { type Address, type Hex } from "viem";
import { useAccount } from "wagmi";
import { useNexus } from "../../nexus/NexusProvider";

interface SourceSwapInfo {
  chainId: number;
  chainName: string;
  explorerUrl: string;
}

interface DepositState {
  step: WidgetStep;
  inputs: DepositInputs;
  status: TransactionStatus;
  explorerUrls: {
    intentUrl: string | null;
    executeUrl: string | null;
  };
  sourceSwaps: SourceSwapInfo[];
  error: string | null;
  lastResult: unknown;
  navigationDirection: NavigationDirection;
  simulation: {
    swapIntent: OnSwapIntentHookData;
  } | null;
  simulationLoading: boolean;
  receiveAmount: string | null;
  skipSwap: boolean;
  intentReady: boolean;
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
  | { type: "setSkipSwap"; payload: boolean }
  | { type: "setIntentReady"; payload: boolean }
  | { type: "addSourceSwap"; payload: SourceSwapInfo }
  | { type: "reset" };

const STEP_HISTORY: Record<WidgetStep, WidgetStep | null> = {
  amount: null,
  confirmation: "amount",
  "transaction-status": null,
  "transaction-complete": null,
  "transaction-failed": null,
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
  sourceSwaps: [],
  error: null,
  lastResult: null,
  navigationDirection: null,
  simulation: null,
  simulationLoading: false,
  receiveAmount: null,
  skipSwap: false,
  intentReady: false,
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
      // Clear error when user changes inputs
      return { ...state, inputs: newInputs, status: newStatus, error: null };
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
    case "setSkipSwap":
      return { ...state, skipSwap: action.payload };
    case "setIntentReady":
      return { ...state, intentReady: action.payload };
    case "addSourceSwap":
      return { ...state, sourceSwaps: [...state.sourceSwaps, action.payload] };
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

  const hasAutoSelected = useRef(false);
  const initialSimulationDone = useRef(false);
  const determiningSwapComplete = useRef(false);
  const lastSimulationTime = useRef(0);

  const {
    seed,
    onStepComplete,
    reset: resetSteps,
    steps,
  } = useTransactionSteps<SwapStepType>();

  const stopwatch = useStopwatch({
    running:
      state.status === "executing" ||
      (state.status === "previewing" && determiningSwapComplete.current),
    intervalMs: 100,
  });

  const [assetSelection, setAssetSelectionState] =
    useState<AssetSelectionState>(createInitialAssetSelection);

  useEffect(() => {
    if (swapBalance && assetSelection.selectedChainIds.size === 0) {
      const allChainIds = new Set<string>();
      swapBalance.forEach((asset) => {
        if (asset.breakdown) {
          asset.breakdown.forEach((b) => {
            if (b.chain && b.balance) {
              allChainIds.add(`${asset.symbol}-${b.chain.id}`);
            }
          });
        }
      });
      if (allChainIds.size > 0) {
        setAssetSelectionState({
          selectedChainIds: allChainIds,
          filter: "all",
          expandedTokens: new Set(),
        });
      }
    }
  }, [swapBalance, assetSelection.selectedChainIds.size]);

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
      availableAssets.reduce((sum, asset) => {
        const key = `${asset.symbol}-${asset.chainId}`;
        if (assetSelection.selectedChainIds.has(key)) {
          return sum + (asset.balanceInFiat ?? 0);
        }
        return sum;
      }, 0),
    [availableAssets, assetSelection.selectedChainIds],
  );

  const totalBalance = useMemo(() => {
    const balance =
      swapBalance?.reduce(
        (acc, balance) => acc + parseFloat(balance.balance),
        0,
      ) ?? 0;
    const usdBalance =
      swapBalance?.reduce((acc, balance) => acc + balance.balanceInFiat, 0) ??
      0;
    return {
      balance,
      usdBalance,
    };
  }, [swapBalance]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIntent, nexusSDK, destination, availableAssets]);

  const feeBreakdown = useMemo(() => {
    if (!activeIntent?.intent?.destination?.gas) {
      return { totalGasFee: 0, gasUsd: 0, gasFormatted: "0" };
    }
    //FIX: Fix type in SDK
    const gas = (activeIntent.intent.destination as any).gas;
    const gasAmount = parseFloat(gas.amount);
    const gasSymbol = gas.token?.symbol ?? destination.gasTokenSymbol;

    // Convert gas amount to USD using getFiatValue
    const gasUsd = getFiatValue(gasAmount, gasSymbol);

    // Format the gas amount for display (show USD value)
    const gasFormatted = usdFormatter.format(gasUsd);

    return { totalGasFee: gasUsd, gasUsd, gasFormatted };
  }, [activeIntent, getFiatValue]); // getFiatValue is stable from useNexus

  const start = useCallback(
    (inputs: SwapAndExecuteParams) => {
      if (!nexusSDK || !inputs || isProcessing) return;

      seed(SWAP_EXPECTED_STEPS);

      const fromSources: Array<{ tokenAddress: Hex; chainId: number }> = [];
      assetSelection.selectedChainIds.forEach((key) => {
        // Key format is "${symbol}-${chainId}", e.g. "USDC-1"
        const lastDashIndex = key.lastIndexOf("-");
        const symbol = key.substring(0, lastDashIndex);
        const chainId = parseInt(key.substring(lastDashIndex + 1), 10);

        // Look up the actual token address from availableAssets
        const asset = availableAssets.find(
          (a) => a.symbol === symbol && a.chainId === chainId,
        );
        if (asset?.tokenAddress) {
          fromSources.push({
            tokenAddress: asset.tokenAddress,
            chainId,
          });
        }
      });

      const inputsWithSources = {
        ...inputs,
        fromSources: fromSources.length > 0 ? fromSources : undefined,
      };

      nexusSDK
        .swapAndExecute(inputsWithSources, {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
              const step = event.args as SwapStepType & {
                explorerURL?: string;
                completed?: boolean;
                data?: {
                  chain?: { id?: number; name?: string };
                  explorerURL?: string;
                };
              };
              if (step?.type === "DETERMINING_SWAP" && step?.completed) {
                determiningSwapComplete.current = true;
                stopwatch.start();
                // Trigger state update to re-check swapIntent in effect
                dispatch({ type: "setIntentReady", payload: true });
              }
              // Capture source swap transactions from SOURCE_SWAP_HASH
              // SOURCE_SWAP_HASH has: chain: { id, name }, explorerURL at top level
              if (step?.type === "SOURCE_SWAP_HASH") {
                const typedStep = step as {
                  type: "SOURCE_SWAP_HASH";
                  chain: { id: number; name: string };
                  explorerURL: string;
                };
                dispatch({
                  type: "addSourceSwap",
                  payload: {
                    chainId: typedStep.chain.id,
                    chainName: typedStep.chain.name,
                    explorerUrl: typedStep.explorerURL,
                  },
                });
              }
              // DESTINATION_SWAP_HASH has: chain: { id, name }, explorerURL at top level
              if (step?.type === "DESTINATION_SWAP_HASH") {
                const typedStep = step as {
                  type: "DESTINATION_SWAP_HASH";
                  chain: { id: number; name: string };
                  explorerURL: string;
                };
                dispatch({
                  type: "setExplorerUrls",
                  payload: { executeUrl: typedStep.explorerURL },
                });
              }
              // BRIDGE_DEPOSIT has: data: { chain, hash, explorerURL }
              if (step?.type === "BRIDGE_DEPOSIT") {
                const typedStep = step as {
                  type: "BRIDGE_DEPOSIT";
                  data: {
                    chain: { id: number; name: string };
                    hash: string;
                    explorerURL: string;
                  };
                };
                dispatch({
                  type: "setExplorerUrls",
                  payload: { executeUrl: typedStep.data.explorerURL },
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
          dispatch({
            type: "setStep",
            payload: { step: "transaction-complete", direction: "forward" },
          });
        })
        .catch((error) => {
          const { message } = handleNexusError(error);
          dispatch({ type: "setError", payload: message });
          dispatch({ type: "setStatus", payload: "error" });
          // If we're already on transaction-status, go to failed screen
          // Otherwise (error during intent creation), go back to amount
          if (initialSimulationDone.current) {
            dispatch({
              type: "setStep",
              payload: { step: "transaction-failed", direction: "forward" },
            });
          } else {
            dispatch({
              type: "setStep",
              payload: { step: "amount", direction: "backward" },
            });
          }
          onError?.(message);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
      assetSelection.selectedChainIds,
      availableAssets,
    ],
  ); // stopwatch is stable from useStopwatch

  const handleAmountContinue = useCallback(
    (totalAmountUsd: number) => {
      if (!nexusSDK || !address || !exchangeRate) return;

      // Reset state and refs for a fresh simulation
      dispatch({ type: "setIntentReady", payload: false });
      initialSimulationDone.current = false;
      determiningSwapComplete.current = false;
      swapIntent.current = null;

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
      dispatch({ type: "setStatus", payload: "simulation-loading" });
      dispatch({ type: "setSimulationLoading", payload: true });
      start(newInputs);
    },
    [
      nexusSDK,
      address,
      exchangeRate,
      destination,
      executeDeposit,
      start,
      swapIntent,
    ],
  );

  const handleConfirmOrder = useCallback(() => {
    if (!activeIntent) return;
    dispatch({ type: "setStatus", payload: "executing" });
    dispatch({
      type: "setStep",
      payload: { step: "transaction-status", direction: "forward" },
    });
    activeIntent.allow();
  }, [activeIntent]);

  const goToStep = useCallback(
    (newStep: WidgetStep) => {
      dispatch({
        type: "setStep",
        payload: { step: newStep, direction: "forward" },
      });
      if (state.step === "amount" && newStep === "confirmation") {
        const amount = state.inputs.amount;
        if (amount) {
          const totalAmountUsd = parseFloat(amount.replace(/,/g, ""));
          if (totalAmountUsd > 0) {
            handleAmountContinue(totalAmountUsd);
            return;
          }
        }
      }
    },
    [state.step, state.inputs.amount, handleAmountContinue],
  );

  const goBack = useCallback(() => {
    const previousStep = STEP_HISTORY[state.step];
    if (previousStep) {
      dispatch({ type: "setError", payload: null });
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

  // swapIntent is a stable RefObject
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopwatch]);

  // Handle swap intent when it arrives - triggered by intentReady state change
  useEffect(() => {
    // Only run when intent is ready and we haven't processed it yet
    if (!state.intentReady || initialSimulationDone.current) {
      return;
    }

    // Check if intent is available
    if (!swapIntent.current) {
      return;
    }

    // Process the intent
    initialSimulationDone.current = true;

    const intent = swapIntent.current.intent;
    const destinationToken = intent.destination.token.symbol;

    const allSourcesMatchDestination = intent.sources.every(
      (source) => source.token.symbol === destinationToken,
    );
    const isDirectDeposit = allSourcesMatchDestination;

    dispatch({ type: "setSkipSwap", payload: isDirectDeposit });

    // Always show confirmation screen - user must review and confirm
    dispatch({
      type: "setSimulation",
      payload: { swapIntent: swapIntent.current! },
    });
    dispatch({ type: "setSimulationLoading", payload: false });
    dispatch({ type: "setStatus", payload: "previewing" });
    lastSimulationTime.current = Date.now();
    setPollingEnabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.intentReady]); // Triggered when DETERMINING_SWAP completes

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
    sourceSwaps: state.sourceSwaps,
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
    totalSelectedBalance,
    skipSwap: state.skipSwap,
    simulationLoading: state.simulationLoading,
    totalBalance,
  };
}
