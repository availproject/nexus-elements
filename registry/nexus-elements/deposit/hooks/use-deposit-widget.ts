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
  CHAIN_METADATA,
  type OnSwapIntentHookData,
  type SwapStepType,
  type ExecuteParams,
  type SwapAndExecuteParams,
  type SwapAndExecuteResult,
  parseUnits,
  SWAP_STEPS,
} from "@avail-project/nexus-core";
import {
  SWAP_EXPECTED_STEPS,
  useNexusError,
  usePolling,
  useStopwatch,
  useTransactionSteps,
  usdFormatter,
} from "../../common";
import { type Address, type Hex, formatEther } from "viem";
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
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
  sourceSwaps: SourceSwapInfo[];
  nexusIntentUrl: string | null;
  depositTxHash: string | null;
  actualGasFeeUsd: number | null;
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
  | { type: "setNexusIntentUrl"; payload: string | null }
  | { type: "setDepositTxHash"; payload: string | null }
  | { type: "setActualGasFeeUsd"; payload: number | null }
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
    sourceExplorerUrl: null,
    destinationExplorerUrl: null,
  },
  sourceSwaps: [],
  nexusIntentUrl: null,
  depositTxHash: null,
  actualGasFeeUsd: null,
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
    case "setNexusIntentUrl":
      return { ...state, nexusIntentUrl: action.payload };
    case "setDepositTxHash":
      return { ...state, depositTxHash: action.payload };
    case "setActualGasFeeUsd":
      return { ...state, actualGasFeeUsd: action.payload };
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
              allChainIds.add(`${b.contractAddress}-${b.chain.id}`);
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
        const key = `${asset.tokenAddress}-${asset.chainId}`;
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

  // Get user's existing balance on destination chain (SDK may use this instead of bridging)
  const destinationBalance = useMemo(() => {
    if (!nexusSDK || !swapBalance || !destination) return undefined;
    return swapBalance
      ?.find((token) => token.symbol === destination.tokenSymbol)
      ?.breakdown?.find((chain) => chain.chain?.id === destination.chainId);
  }, [swapBalance, nexusSDK, destination]);

  const confirmationDetails = useMemo(() => {
    if (!activeIntent || !nexusSDK) return null;

    // Use user's requested amount (from input), not SDK's optimized bridge amount
    const receiveAmountUsd = state.inputs.amount
      ? parseFloat(state.inputs.amount.replace(/,/g, ""))
      : 0;

    // Convert USD amount to token amount for display
    const tokenExchangeRate = exchangeRate?.[destination.tokenSymbol] ?? 1;
    const receiveTokenAmount = receiveAmountUsd / tokenExchangeRate;

    const receiveAmountAfterSwap = nexusSDK.utils.formatTokenBalance(
      receiveTokenAmount.toString(),
      {
        symbol: destination.tokenSymbol,
        decimals: destination.tokenDecimals,
      },
    );

    // Build sources array from intent sources
    const sources: Array<{
      chainId: number;
      tokenAddress: `0x${string}`;
      decimals: number;
      symbol: string;
      balance: string;
      balanceInFiat?: number;
      tokenLogo?: string;
      chainLogo?: string;
      chainName?: string;
      isDestinationBalance?: boolean;
    }> = [];

    activeIntent.intent.sources.forEach((source) => {
      const matchingAsset = availableAssets.find(
        (asset) =>
          asset.chainId === source.chain.id &&
          asset.symbol === source.token.symbol,
      );
      if (matchingAsset) {
        // Use the actual amount from the intent source, not the full balance
        const sourceAmountUsd = getFiatValue(
          Number.parseFloat(source.amount),
          source.token.symbol,
        );
        sources.push({
          ...matchingAsset,
          balance: source.amount,
          balanceInFiat: sourceAmountUsd,
          isDestinationBalance: false,
        });
      }
    });

    // Calculate total spent from cross-chain sources (what's being SENT)
    const totalAmountSpentUsd = activeIntent.intent.sources?.reduce(
      (acc, source) => {
        const amount = Number.parseFloat(source.amount);
        const usdAmount = getFiatValue(amount, source.token.symbol);
        return acc + usdAmount;
      },
      0,
    );

    // Get the actual amount arriving on destination (AFTER fees)
    const destinationAmount = Number.parseFloat(
      activeIntent.intent.destination?.amount ?? "0",
    );
    const destinationAmountUsd = getFiatValue(
      destinationAmount,
      activeIntent.intent.destination?.token?.symbol ?? destination.tokenSymbol,
    );

    // Calculate bridge/protocol fees (what's sent - what arrives)
    const totalFeeUsd = Math.max(0, totalAmountSpentUsd - destinationAmountUsd);

    // Calculate destination balance used (what user wants - what arrives from bridge)
    const usedFromDestinationUsd = Math.max(
      0,
      receiveAmountUsd - destinationAmountUsd,
    );

    if (usedFromDestinationUsd > 0.01 && destinationBalance) {
      // SDK is using existing destination balance
      const usedTokenAmount = usedFromDestinationUsd / tokenExchangeRate;
      const chainMeta =
        CHAIN_METADATA[destination.chainId as keyof typeof CHAIN_METADATA];

      sources.push({
        chainId: destination.chainId,
        tokenAddress: destination.tokenAddress,
        decimals: destination.tokenDecimals,
        symbol: destination.tokenSymbol,
        balance: usedTokenAmount.toString(),
        balanceInFiat: usedFromDestinationUsd,
        tokenLogo: destination.tokenLogo,
        chainLogo: chainMeta?.logo,
        chainName: chainMeta?.name,
        isDestinationBalance: true,
      });
    }

    // Actual amount spent = cross-chain sources + destination balance used
    const actualAmountSpent = totalAmountSpentUsd + usedFromDestinationUsd;

    console.log("[FEE_DEBUG]", {
      receiveAmountUsd,
      totalAmountSpentUsd,
      destinationAmountUsd,
      usedFromDestinationUsd,
      actualAmountSpent,
      totalFeeUsd,
      destinationAmount,
      sourcesFromIntent: activeIntent.intent.sources?.map((s) => ({
        amount: s.amount,
        symbol: s.token.symbol,
        usd: getFiatValue(Number.parseFloat(s.amount), s.token.symbol),
      })),
    });

    return {
      sourceLabel: destination.label ?? "Deposit",
      sources,
      gasTokenSymbol: destination.gasTokenSymbol,
      estimatedTime: destination.estimatedTime ?? "~30s",
      amountSpent: actualAmountSpent,
      totalFeeUsd,
      receiveTokenSymbol: destination.tokenSymbol,
      receiveAmountAfterSwapUsd: receiveAmountUsd,
      receiveAmountAfterSwap,
      receiveTokenLogo: destination.tokenLogo,
      receiveTokenChain: destination.chainId,
    };
  }, [
    activeIntent,
    nexusSDK,
    destination,
    availableAssets,
    state.inputs.amount,
    exchangeRate,
    getFiatValue,
    destinationBalance,
  ]);

  const feeBreakdown = useMemo(() => {
    // Use actual gas fee from receipt if available (after transaction completes)
    if (state.actualGasFeeUsd !== null) {
      const gasFormatted = usdFormatter.format(state.actualGasFeeUsd);
      return {
        totalGasFee: state.actualGasFeeUsd,
        gasUsd: state.actualGasFeeUsd,
        gasFormatted,
      };
    }

    // Otherwise use estimated gas from intent
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
  }, [activeIntent, getFiatValue, state.actualGasFeeUsd]); // getFiatValue is stable from useNexus

  const start = useCallback(
    (inputs: SwapAndExecuteParams) => {
      if (!nexusSDK || !inputs || isProcessing) return;

      seed(SWAP_EXPECTED_STEPS);

      const fromSources: Array<{ tokenAddress: Hex; chainId: number }> = [];
      assetSelection.selectedChainIds.forEach((key) => {
        // Key format is "${tokenAddress}-${chainId}", e.g. "0x123...-1"
        const lastDashIndex = key.lastIndexOf("-");
        const tokenAddress = key.substring(0, lastDashIndex) as Hex;
        const chainId = parseInt(key.substring(lastDashIndex + 1), 10);
        fromSources.push({ tokenAddress, chainId });
      });

      const inputsWithSources = {
        ...inputs,
        fromSources: fromSources.length > 0 ? fromSources : undefined,
      };

      console.log("INPUTS WITH SOURCES IN START", inputsWithSources);

      nexusSDK
        .swapAndExecute(inputsWithSources, {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
              const step = event.args as SwapStepType & {
                completed?: boolean;
              };
              if (step?.type === "DETERMINING_SWAP" && step?.completed) {
                determiningSwapComplete.current = true;
                stopwatch.start();
                dispatch({ type: "setIntentReady", payload: true });
              }
              onStepComplete(step);
            }
          },
        })
        .then((data: SwapAndExecuteResult) => {
          console.log("SWAP RESULT DATA", data);

          // Extract source swaps from the result
          const sourceSwapsFromResult = data.swapResult?.sourceSwaps ?? [];
          sourceSwapsFromResult.forEach((sourceSwap) => {
            const chainMeta =
              CHAIN_METADATA[sourceSwap.chainId as keyof typeof CHAIN_METADATA];
            const baseUrl = chainMeta?.blockExplorerUrls?.[0] ?? "";
            const explorerUrl = baseUrl
              ? `${baseUrl}/tx/${sourceSwap.txHash}`
              : "";
            dispatch({
              type: "addSourceSwap",
              payload: {
                chainId: sourceSwap.chainId,
                chainName: chainMeta?.name ?? `Chain ${sourceSwap.chainId}`,
                explorerUrl,
              },
            });
          });

          // Set explorer URLs from the result
          // Use first source swap for sourceExplorerUrl
          if (sourceSwapsFromResult.length > 0) {
            const firstSourceSwap = sourceSwapsFromResult[0];
            const chainMeta =
              CHAIN_METADATA[
                firstSourceSwap.chainId as keyof typeof CHAIN_METADATA
              ];
            const baseUrl = chainMeta?.blockExplorerUrls?.[0] ?? "";
            const sourceExplorerUrl = baseUrl
              ? `${baseUrl}/tx/${firstSourceSwap.txHash}`
              : "";
            dispatch({
              type: "setExplorerUrls",
              payload: { sourceExplorerUrl },
            });
          }

          // Use swapResult.explorerURL or build from executeResponse for destination
          const destChainMeta =
            CHAIN_METADATA[destination.chainId as keyof typeof CHAIN_METADATA];
          const destBaseUrl = destChainMeta?.blockExplorerUrls?.[0] ?? "";
          const destinationExplorerUrl =
            data.swapResult?.explorerURL ??
            (data.executeResponse?.txHash && destBaseUrl
              ? `${destBaseUrl}/tx/${data.executeResponse.txHash}`
              : null);

          if (destinationExplorerUrl) {
            dispatch({
              type: "setExplorerUrls",
              payload: { destinationExplorerUrl },
            });
          }

          // Store Nexus intent URL for when no source swaps
          dispatch({
            type: "setNexusIntentUrl",
            payload: data.swapResult?.explorerURL ?? null,
          });

          // Store deposit tx hash
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
            // Convert to USD using destination's gas token symbol
            const gasTokenSymbol = destination.gasTokenSymbol ?? "ETH";
            const gasCostUsd = getFiatValue(gasCostNative, gasTokenSymbol);
            dispatch({
              type: "setActualGasFeeUsd",
              payload: gasCostUsd,
            });
          }

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
      destination,
      getFiatValue,
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
      swapIntent.current = null;
      initialSimulationDone.current = false;
      lastSimulationTime.current = 0;
      setPollingEnabled(false);
      stopwatch.stop();
      stopwatch.reset();
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
