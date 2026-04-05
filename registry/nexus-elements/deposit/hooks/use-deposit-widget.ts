"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WidgetStep,
  DepositWidgetContextValue,
  DepositInputs,
  DestinationConfig,
} from "../types";
import {
  ERROR_CODES,
  type ExecuteParams,
  type OnSwapIntentHookData,
  type SwapAndExecuteOnIntentHookData,
  type SwapAndExecuteParams,
  type SwapAndExecuteResult,
} from "@avail-project/nexus-sdk-v2";
import { parseUnits } from "viem";

// v2: SwapStepType removed — use a local step shape
type SwapStepType = {
  typeID?: string;
  type?: string;
  [key: string]: unknown;
};
import {
  SWAP_EXPECTED_STEPS,
  useNexusError,
  usePolling,
  useStopwatch,
  useTransactionSteps,
} from "../../common";
import { type Address, type Hex, formatEther } from "viem";
import { useAccount } from "wagmi";
import { useNexus } from "../../nexus/NexusProvider";
import {
  MIN_SELECTABLE_SOURCE_BALANCE_USD,
  SIMULATION_POLL_INTERVAL_MS,
} from "../constants/widget";

// Import extracted hooks
import {
  useDepositState,
  STEP_HISTORY,
  type SwapSkippedData,
} from "./use-deposit-state";
import { useAssetSelection } from "./use-asset-selection";
import { useDepositComputed } from "./use-deposit-computed";
import { resolveDepositSourceSelection } from "../utils";

interface UseDepositProps {
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: `0x${string}`,
    amount: bigint,
    chainId: number,
    user: Address,
  ) => Omit<ExecuteParams, "toChainId">;
  destination: DestinationConfig;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

function parseUsdAmount(value?: string): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function summarizeIntentSources(
  intent: SwapAndExecuteOnIntentHookData["intent"] | undefined,
) {
  // v2: SwapAndExecuteIntent has swap.sources only when swapRequired=true
  if (!intent) return [];
  const sources = intent.swapRequired
    ? ((intent as { swapRequired: true; swap: { sources?: unknown[] } }).swap?.sources ?? [])
    : [];
  return sources.map((source) => ({
    chainId: (source as { chain?: { id?: number } }).chain?.id,
    chainName: (source as { chain?: { name?: string } }).chain?.name,
    tokenAddress: (source as { token?: { contractAddress?: string } }).token?.contractAddress,
    tokenSymbol: (source as { token?: { symbol?: string } }).token?.symbol,
    amount: (source as { amount?: string }).amount,
  }));
}

/**
 * Main deposit widget hook that orchestrates state, SDK integration,
 * and computed values via smaller focused hooks.
 */
export function useDepositWidget(
  props: UseDepositProps,
): DepositWidgetContextValue {
  const { executeDeposit, destination, onSuccess, onError } = props;

  // External dependencies
  const {
    nexusSDK,
    swapIntent,
    swapBalance,
    fetchSwapBalance,
    getFiatValue,
    exchangeRate,
    resolveTokenUsdRate,
  } = useNexus();
  const { address } = useAccount();
  const handleNexusError = useNexusError();

  // Core state management
  const { state, dispatch } = useDepositState();
  const [pollingEnabled, setPollingEnabled] = useState(false);

  // Asset selection state
  const {
    assetSelection,
    isManualSelection,
    setAssetSelection,
    resetAssetSelection,
  } = useAssetSelection(swapBalance, destination, state.inputs.amount);

  // Refs for tracking
  const hasAutoSelected = useRef(false);
  const initialSimulationDone = useRef(false);
  const determiningSwapComplete = useRef(false);
  const lastSimulationTime = useRef(0);
  const suppressNextWidgetPreviewCancelError = useRef(false);

  const denyActiveSwapIntent = useCallback(
    (options?: { suppressUiError?: boolean }) => {
      const activeSwapIntent =
        swapIntent.current ?? state.simulation?.swapIntent;

      if (options?.suppressUiError && activeSwapIntent) {
        suppressNextWidgetPreviewCancelError.current = true;
      }

      if (!activeSwapIntent) {
        return;
      }

      try {
        activeSwapIntent.deny();
      } catch (error) {
        suppressNextWidgetPreviewCancelError.current = false;
        console.error("Failed to deny active swap intent", error);
      } finally {
        swapIntent.current = null;
      }
    },
    [swapIntent, state.simulation],
  );

  // Transaction steps tracking
  const {
    seed,
    onStepComplete,
    reset: resetSteps,
    steps,
  } = useTransactionSteps<SwapStepType>();

  // Stopwatch for timing
  const stopwatch = useStopwatch({
    running:
      state.status === "executing" ||
      (state.status === "previewing" && determiningSwapComplete.current),
    intervalMs: 100,
  });

  // Derived state
  const isProcessing = state.status === "executing";
  const isSuccess = state.status === "success";
  const isError = state.status === "error";
  const activeIntent = state.simulation?.swapIntent ?? swapIntent.current;

  // Computed values
  const {
    availableAssets,
    totalSelectedBalance,
    totalBalance,
    confirmationDetails,
    feeBreakdown,
  } = useDepositComputed({
    swapBalance,
    assetSelection,
    activeIntent,
    destination,
    inputAmount: state.inputs.amount,
    exchangeRate,
    getFiatValue,
    actualGasFeeUsd: state.actualGasFeeUsd,
    swapSkippedData: state.swapSkippedData,
    skipSwap: state.skipSwap,
    nexusSDK,
  });

  // Action callbacks
  const setInputs = useCallback(
    (next: Partial<DepositInputs>) => {
      dispatch({ type: "setInputs", payload: next });
    },
    [dispatch],
  );

  const setTxError = useCallback(
    (error: string | null) => {
      dispatch({ type: "setError", payload: error });
    },
    [dispatch],
  );

  /**
   * Start the swap and execute flow with the SDK
   */
  const start = useCallback(
    (inputs: SwapAndExecuteParams, targetAmountUsd?: number) => {
      if (!nexusSDK || !inputs || isProcessing) return;

      seed(SWAP_EXPECTED_STEPS);
      const requiredAmountUsd =
        targetAmountUsd ?? parseUsdAmount(state.inputs.amount);
      const { sourcePoolIds, selectedSourceIds, fromSources } =
        resolveDepositSourceSelection({
          swapBalance,
          destination,
          filter: assetSelection.filter,
          selectedSourceIds: assetSelection.selectedChainIds,
          isManualSelection,
          minimumBalanceUsd: MIN_SELECTABLE_SOURCE_BALANCE_USD,
          targetAmountUsd: requiredAmountUsd,
        });

      if (fromSources.length === 0) {
        const message =
          "No eligible source balances found. A minimum source balance of $1.00 is required.";
        dispatch({ type: "setError", payload: message });
        dispatch({ type: "setStatus", payload: "error" });
        onError?.(message);
        return;
      }

      const inputsWithSources = {
        ...inputs,
        sources: fromSources, // v2: fromSources renamed to sources
      };
      nexusSDK
        .swapAndExecute(inputsWithSources, {
          onEvent: (event) => {
            // v2: typed discriminated union — plan_preview seeds steps, plan_progress updates them
            if (event.type === "plan_preview") {
              const planSteps = (event as { type: string; plan?: { steps?: unknown[] } }).plan?.steps ?? [];
              seed(planSteps.map((s, i) => ({
                typeID: `step-${i}`,
                ...(s as Record<string, unknown>),
              })) as SwapStepType[]);
              return;
            }

            if (event.type === "plan_progress") {
              const progressEvent = event as {
                type: string;
                stepType: string;
                state: string;
                step: Record<string, unknown>;
                explorerUrl?: string;
              };

              // DETERMINING_SWAP equivalent: intent_hook / route_ready state
              if (
                progressEvent.stepType === "bridge_intent_submission" &&
                progressEvent.state === "completed"
              ) {
                determiningSwapComplete.current = true;
                stopwatch.start();
                dispatch({ type: "setIntentReady", payload: true });
              }

              const step: SwapStepType = {
                typeID: progressEvent.stepType,
                type: progressEvent.stepType,
                ...progressEvent.step,
                explorerURL: progressEvent.explorerUrl,
              };
              onStepComplete(step);
            }
          },
          onIntent: (intentData) => {
            // v2: onIntent is a top-level SwapAndExecuteOptions hook
            swapIntent.current = intentData;
            determiningSwapComplete.current = true;
            stopwatch.start();
            dispatch({ type: "setIntentReady", payload: true });
          },
        })
        .then((data: SwapAndExecuteResult) => {
          suppressNextWidgetPreviewCancelError.current = false;

          // Extract source swaps from the result (v2: SuccessfulSwapResult.sourceSwaps are ChainSwap[])
          const sourceSwapsFromResult = data.swapResult?.sourceSwaps ?? [];
          sourceSwapsFromResult.forEach((sourceSwap) => {
            // v2: no CHAIN_METADATA — use txHash for explorer URL via intentExplorerUrl
            dispatch({
              type: "addSourceSwap",
              payload: {
                chainId: sourceSwap.chainId,
                chainName: `Chain ${sourceSwap.chainId}`,
                explorerUrl: data.swapResult?.intentExplorerUrl ?? "",
              },
            });
          });

          // Set explorer URLs from the result
          if (sourceSwapsFromResult.length > 0) {
            dispatch({
              type: "setExplorerUrls",
              payload: { sourceExplorerUrl: data.swapResult?.intentExplorerUrl ?? null },
            });
          }

          // Destination explorer URL (v2: intentExplorerUrl replaces swapResult.explorerURL)
          const destinationExplorerUrl =
            data.swapResult?.intentExplorerUrl ??
            (data.executeResponse?.txHash
              ? `https://explorer.avail.so/tx/${data.executeResponse.txHash}`
              : null);

          if (destinationExplorerUrl) {
            dispatch({
              type: "setExplorerUrls",
              payload: { destinationExplorerUrl },
            });
          }

          // Store Nexus intent URL and deposit tx hash
          dispatch({
            type: "setNexusIntentUrl",
            payload: data.swapResult?.intentExplorerUrl ?? null,
          });
          dispatch({
            type: "setDepositTxHash",
            payload: data.executeResponse?.txHash ?? null,
          });

          // Calculate actual gas fee from receipt
          const receipt = data.executeResponse?.receipt;
          if (receipt?.gasUsed && receipt?.effectiveGasPrice) {
            const gasUsed = BigInt(receipt.gasUsed);
            const effectiveGasPrice = BigInt(receipt.effectiveGasPrice);
            const gasCostWei = gasUsed * effectiveGasPrice;
            const gasCostNative = parseFloat(formatEther(gasCostWei));
            const gasTokenSymbol = destination.gasTokenSymbol ?? "ETH";
            const gasCostUsd = getFiatValue(gasCostNative, gasTokenSymbol);
            dispatch({
              type: "setActualGasFeeUsd",
              payload: gasCostUsd,
            });
          }

          dispatch({
            type: "setReceiveAmount",
            // v2: SwapAndExecuteIntent doesn't have destination.amount — use swapResult if available
            payload: data.swapResult?.intentExplorerUrl
              ? (swapIntent.current as unknown as { intent?: { destination?: { amount?: string } } })?.intent?.destination?.amount ?? ""
              : "",
          });
          onSuccess?.();
          dispatch({ type: "setStatus", payload: "success" });
          dispatch({
            type: "setStep",
            payload: { step: "transaction-complete", direction: "forward" },
          });
        })
        .catch((error) => {
          const { code, message } = handleNexusError(error);
          const isUserRejectedError =
            code === ERROR_CODES.USER_DENIED_INTENT ||
            code === ERROR_CODES.USER_DENIED_INTENT_SIGNATURE ||
            code === ERROR_CODES.USER_DENIED_ALLOWANCE;
          // v2: USER_DENIED_SIWE_SIGNATURE removed
          const shouldSuppressWidgetError =
            suppressNextWidgetPreviewCancelError.current && isUserRejectedError;

          suppressNextWidgetPreviewCancelError.current = false;

          if (shouldSuppressWidgetError) {
            onError?.(message);
            return;
          }

          dispatch({ type: "setError", payload: message });
          dispatch({ type: "setStatus", payload: "error" });

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
        })
        .finally(async () => {
          await fetchSwapBalance();
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
      assetSelection.selectedChainIds,
      assetSelection.filter,
      isManualSelection,
      swapBalance,
      destination,
      getFiatValue,
      fetchSwapBalance,
      dispatch,
      stopwatch,
      state.inputs.amount,
    ],
  );

  /**
   * Handle amount input continue - starts simulation
   */
  const beginAmountSimulation = useCallback(
    async (totalAmountUsd: number) => {
      if (!nexusSDK) {
        dispatch({
          type: "setError",
          payload: "Nexus SDK is not initialized.",
        });
        dispatch({ type: "setStatus", payload: "error" });
        return false;
      }
      if (!address) {
        dispatch({
          type: "setError",
          payload: "Connect your wallet to continue.",
        });
        dispatch({ type: "setStatus", payload: "error" });
        return false;
      }
      const destinationRate = await resolveTokenUsdRate(
        destination.tokenSymbol,
      );
      if (
        !destinationRate ||
        !Number.isFinite(destinationRate) ||
        destinationRate <= 0
      ) {
        dispatch({
          type: "setError",
          payload: `Unable to fetch pricing for ${destination.tokenSymbol}. Please try again.`,
        });
        dispatch({ type: "setStatus", payload: "error" });
        return false;
      }

      // Reset state and refs for a fresh simulation
      dispatch({ type: "setError", payload: null });
      dispatch({ type: "setIntentReady", payload: false });
      initialSimulationDone.current = false;
      determiningSwapComplete.current = false;
      denyActiveSwapIntent();

      const tokenAmount = totalAmountUsd / destinationRate;
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
        toAmountRaw: parsed, // v2: toAmount renamed to toAmountRaw
        execute: {
          to: executeParams.to,
          value: executeParams.value,
          data: executeParams.data,
          gasPrice: executeParams.gasPrice,
          tokenApproval: executeParams.tokenApproval
            ? ({
              toTokenAddress: (executeParams.tokenApproval as unknown as { token?: string; toTokenAddress?: string }).toTokenAddress
                ?? (executeParams.tokenApproval as unknown as { token?: string }).token,
              amount: (executeParams.tokenApproval as { amount: bigint }).amount,
              spender: (executeParams.tokenApproval as { spender: `0x${string}` }).spender,
            } as { toTokenAddress: `0x${string}`; amount: bigint; spender: `0x${string}` })
            : undefined,
          gas: BigInt(400_000),
        },
      };

      dispatch({
        type: "setInputs",
        payload: { amount: totalAmountUsd.toString() },
      });
      dispatch({ type: "setStatus", payload: "simulation-loading" });
      dispatch({ type: "setSimulationLoading", payload: true });
      start(newInputs, totalAmountUsd);
      return true;
    },
    [
      nexusSDK,
      address,
      resolveTokenUsdRate,
      destination,
      executeDeposit,
      start,
      denyActiveSwapIntent,
      dispatch,
    ],
  );

  const handleAmountContinue = useCallback(
    (totalAmountUsd: number) => {
      void beginAmountSimulation(totalAmountUsd);
    },
    [beginAmountSimulation],
  );

  /**
   * Handle order confirmation - allow intent to execute
   */
  const handleConfirmOrder = useCallback(() => {
    if (!activeIntent) return;
    dispatch({ type: "setStatus", payload: "executing" });
    dispatch({
      type: "setStep",
      payload: { step: "transaction-status", direction: "forward" },
    });
    activeIntent.allow();
  }, [activeIntent, dispatch]);

  /**
   * Navigate to a specific step
   */
  const goToStep = useCallback(
    (newStep: WidgetStep) => {
      if (state.step === "amount" && newStep === "confirmation") {
        const amount = state.inputs.amount;
        if (amount) {
          const totalAmountUsd = parseFloat(amount.replace(/,/g, ""));
          if (totalAmountUsd > 0) {
            void (async () => {
              const started = await beginAmountSimulation(totalAmountUsd);
              if (!started) return;
              dispatch({
                type: "setStep",
                payload: { step: newStep, direction: "forward" },
              });
            })();
            return;
          }
        }
      }
      dispatch({
        type: "setStep",
        payload: { step: newStep, direction: "forward" },
      });
    },
    [state.step, state.inputs.amount, beginAmountSimulation, dispatch],
  );

  /**
   * Navigate back to previous step
   */
  const goBack = useCallback(async () => {
    const previousStep = STEP_HISTORY[state.step];
    if (previousStep) {
      const suppressUiError = state.step === "confirmation" && !isProcessing;
      dispatch({ type: "setError", payload: null });
      dispatch({
        type: "setStep",
        payload: { step: previousStep, direction: "backward" },
      });
      denyActiveSwapIntent({ suppressUiError });
      initialSimulationDone.current = false;
      lastSimulationTime.current = 0;
      setPollingEnabled(false);
      stopwatch.stop();
      stopwatch.reset();
      await fetchSwapBalance();
    }
  }, [
    state.step,
    isProcessing,
    stopwatch,
    dispatch,
    denyActiveSwapIntent,
    fetchSwapBalance,
  ]);

  /**
   * Reset widget to initial state
   */
  const reset = useCallback(async () => {
    const suppressUiError = state.step === "confirmation" && !isProcessing;
    dispatch({ type: "reset" });
    resetAssetSelection();
    resetSteps();
    denyActiveSwapIntent({ suppressUiError });
    initialSimulationDone.current = false;
    lastSimulationTime.current = 0;
    setPollingEnabled(false);
    stopwatch.stop();
    stopwatch.reset();
    await fetchSwapBalance();
  }, [
    resetSteps,
    stopwatch,
    dispatch,
    resetAssetSelection,
    denyActiveSwapIntent,
    fetchSwapBalance,
    state.step,
    isProcessing,
  ]);

  /**
   * Refresh simulation data
   */
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
      console.error("Unable to refresh intent", e);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
      stopwatch.reset();
      lastSimulationTime.current = Date.now();
    }
  }, [stopwatch, swapIntent, dispatch]);

  const startTransaction = useCallback(() => {
    if (isProcessing) return;
    dispatch({ type: "setError", payload: null });
  }, [isProcessing, dispatch]);

  // Effect: Handle swap intent when it arrives
  useEffect(() => {
    if (!state.intentReady || initialSimulationDone.current) {
      return;
    }

    if (!swapIntent.current) {
      return;
    }

    initialSimulationDone.current = true;
    dispatch({
      type: "setSimulation",
      payload: { swapIntent: swapIntent.current! },
    });
    dispatch({ type: "setSimulationLoading", payload: false });
    dispatch({ type: "setStatus", payload: "previewing" });
    lastSimulationTime.current = Date.now();
    setPollingEnabled(true);
  }, [state.intentReady, swapIntent, dispatch]);

  // Effect: Fetch swap balance on mount
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

  // Polling for simulation refresh
  usePolling(
    pollingEnabled &&
    state.status === "previewing" &&
    Boolean(swapIntent.current) &&
    !state.simulationLoading,
    async () => {
      await refreshSimulation();
    },
    SIMULATION_POLL_INTERVAL_MS,
  );

  // Return the full context value
  return {
    step: state.step,
    inputs: state.inputs,
    setInputs,
    status: state.status,
    explorerUrls: state.explorerUrls,
    sourceSwaps: state.sourceSwaps,
    nexusIntentUrl: state.nexusIntentUrl,
    depositTxHash: state.depositTxHash,
    destination,
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
    isManualSelection,
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
