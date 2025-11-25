import {
  NEXUS_EVENTS,
  type OnSwapIntentHookData,
  type SwapStepType,
  type ExactInSwapInput,
  type ExecuteParams,
  type ExecuteSimulation,
  type SUPPORTED_CHAINS_IDS,
  CHAIN_METADATA,
} from "@avail-project/nexus-core";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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
import { type AssetSelection } from "../components/asset-select";

export type TransactionStatus =
  | "idle"
  | "set-source-assets"
  | "set-amount"
  | "simulating"
  | "view-breakdown"
  | "swapping"
  | "depositing"
  | "success"
  | "error";

interface SwapInputs extends ExactInSwapInput {
  toTokenSymbol: string;
}

interface DestinationConfig {
  chainId: SUPPORTED_CHAINS_IDS;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenLogo?: string;
  label?: string;
  estimatedTime?: string;
  gasTokenSymbol?: string;
}

type SwapDepositState = {
  inputs: SwapInputs | null;
  selectedSources: AssetSelection[];
  status: TransactionStatus;
  error: string | null;
  simulation: {
    executeSimulation: ExecuteSimulation;
    swapIntent: OnSwapIntentHookData;
  } | null;
  explorerUrls: {
    source: string | null;
    destination: string | null;
    depositUrl: string | null;
  };
  simulationLoading: boolean;
  receiveAmount: string | null;
};

interface UseSwapDepositProps {
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: string,
    amount: bigint,
    chainId: number,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
  destination: DestinationConfig;
  onSwapComplete?: (amount?: string, explorerURL?: string) => void;
  onDepositComplete?: (explorerURL?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
}

type Action =
  | { type: "setInputs"; payload: Partial<SwapInputs> }
  | { type: "setSelectedSources"; payload: AssetSelection[] }
  | {
      type: "setSimulation";
      payload: {
        executeSimulation: ExecuteSimulation;
        swapIntent: OnSwapIntentHookData;
      };
    }
  | { type: "setStatus"; payload: TransactionStatus }
  | { type: "setError"; payload: string | null }
  | { type: "setSimulationLoading"; payload: boolean }
  | { type: "setReceiveAmount"; payload: string | null }
  | {
      type: "setExplorerUrls";
      payload: Partial<SwapDepositState["explorerUrls"]>;
    }
  | { type: "reset" };

const initialState: SwapDepositState = {
  inputs: null,
  selectedSources: [],
  status: "idle",
  error: null,
  simulation: null,
  explorerUrls: {
    source: null,
    destination: null,
    depositUrl: null,
  },
  simulationLoading: false,
  receiveAmount: null,
};

function reducer(state: SwapDepositState, action: Action): SwapDepositState {
  switch (action.type) {
    case "setInputs": {
      const merged = state.inputs
        ? { ...state.inputs, ...action.payload }
        : { ...action.payload };
      if (
        merged.from !== undefined &&
        merged.toChainId !== undefined &&
        merged.toTokenAddress !== undefined
      ) {
        let newStatus = state.status;
        const hasSourceAssets =
          merged.from !== undefined && merged.from.length > 0;
        const hasAmount =
          merged.from?.[0]?.amount !== undefined &&
          merged.from?.[0]?.amount > BigInt(0);

        if (!hasSourceAssets) {
          newStatus = "idle";
        } else if (hasSourceAssets && !hasAmount) {
          newStatus = "set-source-assets";
        } else if (hasSourceAssets && hasAmount) {
          newStatus = "set-amount";
        }

        return {
          ...state,
          inputs: merged as SwapInputs,
          status: newStatus,
          error: null,
        };
      }
      return state;
    }
    case "setSelectedSources":
      return { ...state, selectedSources: action.payload };
    case "setSimulation":
      return {
        ...state,
        simulation: action.payload,
        status: "view-breakdown",
      };
    case "setStatus":
      return { ...state, status: action.payload };
    case "setError":
      return { ...state, error: action.payload };
    case "setExplorerUrls":
      return {
        ...state,
        explorerUrls: { ...state.explorerUrls, ...action.payload },
      };
    case "setSimulationLoading":
      return { ...state, simulationLoading: action.payload };
    case "setReceiveAmount":
      return { ...state, receiveAmount: action.payload };
    case "reset":
      return { ...initialState };
    default:
      return state;
  }
}

const useSwapDeposit = ({
  executeDeposit,
  destination,
  onSwapComplete,
  onDepositComplete,
  onStart,
  onError,
}: UseSwapDepositProps) => {
  const {
    nexusSDK,
    swapIntent,
    swapBalance,
    fetchSwapBalance,
    getFiatValue,
    exchangeRate,
  } = useNexus();

  const [state, dispatch] = useReducer(reducer, initialState);
  const { address } = useAccount();
  const loading = state.status === "swapping" || state.status === "depositing";
  const handleNexusError = useNexusError();

  const {
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();

  const stopwatch = useStopwatch({
    running: state.status === "swapping" || state.status === "depositing",
    intervalMs: 100,
  });

  const hasAutoSelected = useRef(false);

  const availableAssets = useMemo(() => {
    if (!swapBalance) return [];
    const items: AssetSelection[] = [];

    for (const asset of swapBalance) {
      if (!asset?.breakdown?.length) continue;
      for (const breakdown of asset.breakdown) {
        if (!breakdown?.chain?.id || !breakdown.balance) continue;
        const numericBalance = Number.parseFloat(breakdown.balance);
        if (!Number.isFinite(numericBalance) || numericBalance <= 0) continue;

        items.push({
          chainId: breakdown.chain.id,
          tokenAddress: breakdown.contractAddress,
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
    return items.toSorted((a, b) => b.balanceInFiat - a.balanceInFiat);
  }, [swapBalance]);

  // Fetch balance on mount, auto-select all assets once available

  const activeIntent = state.simulation?.swapIntent ?? swapIntent.current;

  const confirmationDetails = useMemo(() => {
    if (!activeIntent || !nexusSDK) return null;
    const receiveAmountAfterSwap = nexusSDK.utils.formatTokenBalance(
      activeIntent.intent.destination.amount,
      {
        symbol: activeIntent.intent.destination.token.symbol,
        decimals: activeIntent.intent.destination.token.decimals,
      }
    );

    const receiveAmountAfterSwapUsd = getFiatValue(
      Number.parseFloat(activeIntent.intent.destination.amount),
      destination.tokenSymbol
    );

    const totalAmountSpent = nexusSDK?.utils?.formatTokenBalance(
      activeIntent.intent.sources?.reduce((acc, source) => {
        const amount = Number.parseFloat(source.amount);
        return acc + amount;
      }, 0),
      {
        symbol: destination.tokenSymbol,
        decimals: destination.tokenDecimals,
      }
    );

    const sources = activeIntent.intent.sources.map((source) =>
      availableAssets.find(
        (asset) =>
          asset.chainId === source.chain.id &&
          asset.symbol === source.token.symbol
      )
    );

    return {
      sourceLabel: destination.label,
      sources,
      gasTokenSymbol: destination.gasTokenSymbol,
      estimatedTime: destination.estimatedTime ?? "≈ 30s",
      amountSpent: totalAmountSpent,
      receiveTokenSymbol: destination.tokenSymbol,
      receiveAmountAfterSwapUsd,
      receiveAmountAfterSwap,
      receiveTokenLogo: destination.tokenLogo,
      receiveTokenChain: destination.chainId,
    };
  }, [activeIntent, nexusSDK, destination]);

  const feeBreakdown = useMemo(() => {
    if (!nexusSDK || !state.simulation || !state.inputs)
      return { totalGasFee: 0, gasUsd: 0, gasFormatted: "0" };

    const native = CHAIN_METADATA[state.inputs.toChainId]?.nativeCurrency;
    const nativeSymbol = native?.symbol;
    const nativeDecimals = native?.decimals;

    const gasFormatted =
      nexusSDK?.utils?.formatTokenBalance(
        state.simulation.executeSimulation?.gasFee,
        { symbol: nativeSymbol, decimals: nativeDecimals }
      ) ?? "0";
    const gasUnits = Number.parseFloat(
      nexusSDK?.utils?.formatUnits(
        state.simulation.executeSimulation?.gasFee,
        nativeDecimals
      )
    );
    const gasUsd = getFiatValue(gasUnits, nativeSymbol);

    return { totalGasFee: gasUsd, gasUsd, gasFormatted };
  }, [nexusSDK, getFiatValue, state.simulation, state.inputs]);

  // Total USD balance of selected sources
  const totalSelectedBalance = useMemo(
    () =>
      state.selectedSources.reduce(
        (sum, source) => sum + source.balanceInFiat,
        0
      ),
    [state.selectedSources, getFiatValue]
  );

  const handleDeposit = (amount: bigint) => {
    console.log("%% DEPOSIT STARTING", {
      hasAddress: address,
      hasSDK: nexusSDK,
      combined: !nexusSDK || !address,
    });
    if (!nexusSDK || !address) return;
    console.log("%% DEPOSIT STARTED");
    const executeParams = executeDeposit(
      destination.tokenSymbol,
      destination.tokenAddress,
      amount,
      destination.chainId,
      address
    );

    nexusSDK
      .execute({
        ...executeParams,
        toChainId: destination.chainId,
      })
      .then((depositResult) => {
        if (!depositResult) {
          throw new Error("Deposit failed");
        }
        dispatch({
          type: "setExplorerUrls",
          payload: { depositUrl: depositResult.explorerUrl },
        });
        onDepositComplete?.(depositResult.explorerUrl);
        return fetchSwapBalance();
      })
      .then(() => {
        dispatch({ type: "setStatus", payload: "success" });
      })
      .catch((error) => {
        const { message } = handleNexusError(error);
        dispatch({ type: "setError", payload: message });
        dispatch({ type: "setStatus", payload: "error" });
        onError?.(message);
      });
  };

  // Creates swap intent and sets up the execution flow
  // The swap will only execute when allow() is called via handleConfirmOrder
  const initiateSwapIntent = (inputs: SwapInputs) => {
    if (!nexusSDK || !inputs || loading) return;
    onStart?.();
    seed(SWAP_EXPECTED_STEPS);

    // swapWithExactIn creates an intent and waits for allow()/deny()
    // The promise only resolves after allow() is called
    nexusSDK
      .swapWithExactIn(inputs, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args as SwapStepType & {
              explorerURL?: string;
              completed?: boolean;
            };
            if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: { source: step.explorerURL },
              });
            }
            if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: { destination: step.explorerURL },
              });
            }
            onStepComplete(step);
          }
        },
      })
      .then((swapResult) => {
        // This block executes AFTER allow() is called and swap completes
        if (!swapResult?.success) {
          throw new Error(swapResult?.error || "Swap failed");
        }

        const finalSwap =
          swapResult.result.destinationSwap?.swaps[
            swapResult.result.destinationSwap?.swaps.length - 1
          ];
        console.log("swap complete", swapResult, finalSwap);
        if (finalSwap) {
          const formattedAmount = nexusSDK.utils.formatUnits(
            finalSwap?.outputAmount,
            finalSwap?.outputDecimals
          );
          dispatch({ type: "setReceiveAmount", payload: formattedAmount });
          onSwapComplete?.(formattedAmount, swapResult.result.explorerURL);
          // Chain the deposit after swap completes
          dispatch({ type: "setStatus", payload: "depositing" });
          handleDeposit(finalSwap.outputAmount);
        }
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
  };

  const simulateDeposit = async () => {
    console.log("simulating deposit");
    if (
      !nexusSDK ||
      !state.inputs ||
      loading ||
      !address ||
      !swapIntent.current
    )
      return;

    try {
      const executeParams = executeDeposit(
        state.inputs.toTokenSymbol,
        state.inputs.toTokenAddress,
        nexusSDK.utils.parseUnits(
          swapIntent.current?.intent.destination.amount,
          swapIntent.current?.intent?.destination?.token?.decimals
        ),
        state.inputs.toChainId,
        address
      );
      const depositResult = await nexusSDK.simulateExecute({
        ...executeParams,
        toChainId: state.inputs.toChainId,
      });

      console.log("depositResult", depositResult);

      if (!depositResult) {
        throw new Error("Simulation failed");
      }
      dispatch({
        type: "setSimulation",
        payload: {
          executeSimulation: depositResult,
          swapIntent: swapIntent.current,
        },
      });
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setError", payload: message });
      dispatch({ type: "setStatus", payload: "error" });
      onError?.(message);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
    }
  };

  // Toggle a source selection (checkbox behavior)
  const handleToggleSource = useCallback(
    (source: AssetSelection) => {
      const sourceId = `${source.symbol}-${source.chainId}-${source.tokenAddress}`;
      const isSelected = state.selectedSources.some(
        (s) => `${s.symbol}-${s.chainId}-${s.tokenAddress}` === sourceId
      );

      if (isSelected) {
        // Remove from selection
        dispatch({
          type: "setSelectedSources",
          payload: state.selectedSources.filter(
            (s) => `${s.symbol}-${s.chainId}-${s.tokenAddress}` !== sourceId
          ),
        });
        return;
      }
      dispatch({
        type: "setSelectedSources",
        payload: [...state.selectedSources, source],
      });
    },
    [state.selectedSources]
  );

  // Select all available sources
  const handleSelectAll = useCallback(() => {
    dispatch({ type: "setSelectedSources", payload: availableAssets });
  }, [availableAssets]);

  // Deselect all sources
  const handleDeselectAll = useCallback(() => {
    dispatch({ type: "setSelectedSources", payload: [] });
  }, []);

  // Continue from asset selection to amount step
  const handleSourcesContinue = useCallback(() => {
    if (!nexusSDK || state.selectedSources.length === 0) return;

    dispatch({ type: "setError", payload: null });

    // Sort by balance descending and create from array with 0 amounts
    const sortedSources = [...state.selectedSources].sort(
      (a, b) => Number.parseFloat(b.balance) - Number.parseFloat(a.balance)
    );

    const fromArray = sortedSources.map((source) => ({
      chainId: source.chainId as SUPPORTED_CHAINS_IDS,
      tokenAddress: source.tokenAddress,
      amount: BigInt(0),
    }));

    dispatch({
      type: "setInputs",
      payload: {
        from: fromArray,
        toChainId: destination.chainId,
        toTokenAddress: destination.tokenAddress,
        toTokenSymbol: destination.tokenSymbol,
      },
    });
  }, [nexusSDK, state.selectedSources, destination]);

  const handleAmountContinue = useCallback(
    (totalAmountUsd: number) => {
      if (!nexusSDK || state.selectedSources.length === 0) return;

      // Buffer: use max 95% of any token's balance to avoid draining fully
      const MAX_USAGE_RATIO = 0.95;

      // Build source data with USD values and max usable amounts
      const sourcesWithUsd = state.selectedSources.map((source) => ({
        ...source,
        tokenBalance: Number.parseFloat(source.balance),
        usdValue: source.balanceInFiat,
        maxUsableUsd: source.balanceInFiat * MAX_USAGE_RATIO,
      }));

      // Sort by USD value descending - higher balance = higher priority
      const sortedSources = sourcesWithUsd.toSorted(
        (a, b) => b.usdValue - a.usdValue
      );

      const totalUsdBalance = sortedSources.reduce(
        (sum, s) => sum + s.usdValue,
        0
      );

      // Initialize allocations with proportional distribution
      const allocations = sortedSources.map((source) => {
        const proportion = source.usdValue / totalUsdBalance;
        const idealAllocation = totalAmountUsd * proportion;
        // Cap at max usable (95% of balance) to avoid draining
        const cappedAllocation = Math.min(idealAllocation, source.maxUsableUsd);

        return {
          source,
          allocation: cappedAllocation,
          // Track how much was capped for redistribution
          excessAmount: Math.max(0, idealAllocation - source.maxUsableUsd),
        };
      });

      // Redistribute capped amounts to sources that have headroom
      let remainingToAllocate = allocations.reduce(
        (sum, a) => sum + a.excessAmount,
        0
      );

      // Iteratively redistribute until we've allocated everything or hit limits
      const MAX_ITERATIONS = 10;
      let iteration = 0;

      while (remainingToAllocate > 0.01 && iteration < MAX_ITERATIONS) {
        iteration++;

        // Find sources that can still accept more
        const sourcesWithHeadroom = allocations.filter(
          (a) => a.allocation < a.source.maxUsableUsd
        );

        if (sourcesWithHeadroom.length === 0) break;

        // Calculate total available headroom
        const totalHeadroom = sourcesWithHeadroom.reduce(
          (sum, a) => sum + (a.source.maxUsableUsd - a.allocation),
          0
        );

        if (totalHeadroom <= 0) break;

        const toDistribute = Math.min(remainingToAllocate, totalHeadroom);

        // Distribute proportionally based on each source's available headroom
        for (const alloc of sourcesWithHeadroom) {
          const headroom = alloc.source.maxUsableUsd - alloc.allocation;
          const share = headroom / totalHeadroom;
          const additional = toDistribute * share;
          alloc.allocation = Math.min(
            alloc.allocation + additional,
            alloc.source.maxUsableUsd
          );
        }

        remainingToAllocate = Math.max(0, remainingToAllocate - toDistribute);
      }

      // Convert USD allocations to token amounts, filtering out zero allocations
      const fromArray = allocations
        .filter(({ allocation }) => allocation > 0.001) // Skip negligible amounts
        .map(({ source, allocation }) => {
          // Convert USD to token amount using exchange rate
          // exchangeRate contains "USD per token" (e.g., ETH -> 3514 means 1 ETH = $3514)
          const rate = exchangeRate?.[source.symbol.toUpperCase()] ?? 1;
          const tokenAmount = rate > 0 ? allocation / rate : 0;

          const parsed = nexusSDK.utils.parseUnits(
            tokenAmount.toString(),
            source.decimals
          );

          return {
            chainId: source.chainId as SUPPORTED_CHAINS_IDS,
            tokenAddress: source.tokenAddress,
            amount: parsed,
          };
        })
        .filter((item) => item.amount > BigInt(0)); // Extra safety: remove zero amounts

      if (fromArray.length === 0) {
        dispatch({
          type: "setError",
          payload: "Unable to allocate amount across selected sources",
        });
        return;
      }

      const newInputs: SwapInputs = {
        from: fromArray,
        toChainId: destination.chainId,
        toTokenAddress: destination.tokenAddress,
        toTokenSymbol: destination.tokenSymbol,
      };

      dispatch({ type: "setInputs", payload: newInputs });
      // Set to simulating first - will move to view-breakdown after intent is received and deposit simulated
      dispatch({ type: "setStatus", payload: "simulating" });
      // Start swap intent creation (waits for allow() to execute)
      initiateSwapIntent(newInputs);
    },
    [nexusSDK, state.selectedSources, destination, exchangeRate]
  );

  const handleConfirmOrder = useCallback(() => {
    if (!swapIntent.current) return;
    // Set status to swapping before calling allow()
    dispatch({ type: "setStatus", payload: "swapping" });
    swapIntent.current.allow();
  }, [swapIntent]);

  const handleBack = useCallback(() => {
    if (swapIntent.current) {
      swapIntent.current.deny();
    }
    dispatch({ type: "reset" });
    resetSteps();
    stopwatch.stop();
    stopwatch.reset();
  }, [swapIntent, resetSteps, stopwatch]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    resetSteps();
    swapIntent.current = null;
    stopwatch.stop();
    stopwatch.reset();
  }, [resetSteps, swapIntent, stopwatch]);

  const refreshSimulation = async () => {
    try {
      dispatch({ type: "setSimulationLoading", payload: true });
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current!.intent = updated;
      }
      await simulateDeposit();
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
      // Status is set to "view-breakdown" via setSimulation action in reducer
    }
  };

  const reset = () => {
    dispatch({ type: "reset" });
    resetSteps();
    swapIntent.current = null;
    stopwatch.stop();
    stopwatch.reset();
  };

  const refreshSimulation = async () => {
    try {
      dispatch({ type: "setSimulationLoading", payload: true });
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current!.intent = updated;
      }
      await simulateDeposit();
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: "setSimulationLoading", payload: false });
    }
  };

  // Trigger initial simulation when swapIntent is populated during "simulating"
  // Since swapIntent is a ref, we need to poll for changes
  useEffect(() => {
    if (state.status !== "simulating") {
      return;
    }

    // Poll for swapIntent to be available (set by SDK's onSwapIntentHook)
    const checkInterval = setInterval(() => {
      if (swapIntent.current) {
        clearInterval(checkInterval);
        void simulateDeposit();
      }
    }, 100);

    // Cleanup on unmount or status change
    return () => {
      clearInterval(checkInterval);
    };
  }, [state.status]);

  useEffect(() => {
    if (!nexusSDK) return;

    if (!swapBalance) {
      void fetchSwapBalance();
      return;
    }

    if (!hasAutoSelected.current && availableAssets.length > 0) {
      hasAutoSelected.current = true;
      dispatch({ type: "setSelectedSources", payload: availableAssets });
    }
  }, [nexusSDK, swapBalance, availableAssets, fetchSwapBalance]);

  // Poll for simulation updates during "view-breakdown" status
  usePolling(
    state.status === "view-breakdown" && Boolean(swapIntent.current),
    async () => {
      await refreshSimulation();
    },
    15000
  );

  return {
    // State
    status: state.status,
    loading,
    txError: state.error,
    simulationLoading: state.simulationLoading,
    timer: stopwatch.seconds,
    explorerUrls: state.explorerUrls,

    // Data from NexusProvider (for AssetSelect)
    swapBalance,
    getFiatValue,
    availableAssets,

    // Selected sources
    selectedSources: state.selectedSources,
    totalSelectedBalance,

    // Computed data
    activeIntent,
    confirmationDetails,
    feeBreakdown,
    destination,

    // Handlers
    handleToggleSource,
    handleSelectAll,
    handleDeselectAll,
    handleSourcesContinue,
    handleAmountContinue,
    handleConfirmOrder,
    handleBack,
    reset,
  };
};

export default useSwapDeposit;
