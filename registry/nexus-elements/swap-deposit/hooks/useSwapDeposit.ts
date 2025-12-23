import {
  NEXUS_EVENTS,
  type OnSwapIntentHookData,
  type SwapStepType,
  type ExecuteParams,
  type SUPPORTED_CHAINS_IDS,
  CHAIN_METADATA,
  parseUnits,
  SwapAndExecuteParams,
} from "@avail-project/nexus-core";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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
  | "view-breakdown"
  | "swapping"
  | "depositing"
  | "success"
  | "error";

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
  inputs: SwapAndExecuteParams | null;
  selectedSources: AssetSelection[];
  status: TransactionStatus;
  error: string | null;
  simulation: {
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
  | { type: "setInputs"; payload: Partial<SwapAndExecuteParams> }
  | { type: "setSelectedSources"; payload: AssetSelection[] }
  | {
      type: "setSimulation";
      payload: {
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
        merged.toChainId !== undefined &&
        merged.toTokenAddress !== undefined
      ) {
        let newStatus = state.status;
        const hasSourceAssets =
          merged.fromSources !== undefined && merged.fromSources.length > 0;
        const hasAmount =
          merged.toAmount !== undefined && merged.toAmount > BigInt(0);

        if (!hasSourceAssets) {
          newStatus = "idle";
        } else if (hasSourceAssets && !hasAmount) {
          newStatus = "set-source-assets";
        } else if (hasSourceAssets && hasAmount) {
          newStatus = "set-amount";
        }
        console.log("setInputs", {
          ...state,
          inputs: merged as SwapAndExecuteParams,
          status: newStatus,
          error: null,
        });
        return {
          ...state,
          inputs: merged as SwapAndExecuteParams,
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
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const { address } = useAccount();
  const loading = state.status === "swapping" || state.status === "depositing";
  const handleNexusError = useNexusError();

  const {
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();

  const stopwatch = useStopwatch({
    running:
      state.status === "swapping" ||
      state.status === "depositing" ||
      (state.status === "view-breakdown" && !state.simulationLoading),
    intervalMs: 100,
  });

  const hasAutoSelected = useRef(false);
  const initialSimulationDone = useRef(false);
  const lastSimulationTime = useRef(0);

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
      nexusSDK?.utils?.formatTokenBalance(BigInt(200000), {
        symbol: nativeSymbol,
        decimals: nativeDecimals,
      }) ?? "0";
    const gasUnits = Number.parseFloat(
      nexusSDK?.utils?.formatUnits(BigInt(200000), nativeDecimals)
    );
    const gasUsd = getFiatValue(gasUnits, nativeSymbol);

    console.log("GAS REQUIRED", { gasFormatted, gasUnits, gasUsd });

    return { totalGasFee: gasUsd, gasUsd, gasFormatted };
  }, [nexusSDK, getFiatValue, state.simulation, state.inputs]);

  const totalSelectedBalance = useMemo(
    () =>
      state.selectedSources.reduce(
        (sum, source) => sum + source.balanceInFiat,
        0
      ),
    [state.selectedSources, getFiatValue]
  );

  const initiateSwapIntent = (inputs: SwapAndExecuteParams) => {
    if (!nexusSDK || !inputs || loading) return;
    onStart?.();
    seed(SWAP_EXPECTED_STEPS);
    console.log("SWAP INPUTS", inputs);
    nexusSDK
      .swapAndExecute(inputs, {
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
        console.log("swap complete", swapResult, swapIntent.current?.intent);
        dispatch({
          type: "setReceiveAmount",
          payload: swapIntent.current?.intent?.destination?.amount ?? "",
        });
        onSwapComplete?.(swapIntent.current?.intent?.destination?.amount);
        onDepositComplete?.();
        dispatch({ type: "setStatus", payload: "success" });
        return fetchSwapBalance();
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

  const handleToggleSource = useCallback(
    (source: AssetSelection) => {
      const sourceId = `${source.symbol}-${source.chainId}-${source.tokenAddress}`;
      const isSelected = state.selectedSources.some(
        (s) => `${s.symbol}-${s.chainId}-${s.tokenAddress}` === sourceId
      );

      if (isSelected) {
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

  const handleSourcesContinue = useCallback(() => {
    if (!nexusSDK || state.selectedSources.length === 0) return;

    dispatch({ type: "setError", payload: null });
    const sortedSources = [...state.selectedSources].sort(
      (a, b) => Number.parseFloat(b.balance) - Number.parseFloat(a.balance)
    );

    const fromArray = sortedSources.map((source) => ({
      chainId: source.chainId as SUPPORTED_CHAINS_IDS,
      tokenAddress: source.tokenAddress,
    }));

    dispatch({
      type: "setInputs",
      payload: {
        fromSources: fromArray,
        toChainId: destination.chainId,
        toTokenAddress: destination.tokenAddress,
      },
    });
  }, [nexusSDK, state.selectedSources, destination]);

  const handleSingleSourceAmount = useCallback(
    (totalAmountUsd: number) => {
      if (
        !nexusSDK ||
        state.selectedSources.length === 0 ||
        !exchangeRate ||
        !address
      )
        return;
      const tokenAmount =
        totalAmountUsd / exchangeRate[destination.tokenSymbol];
      const tokenAmountStr = tokenAmount.toFixed(destination.tokenDecimals);
      const parsed = parseUnits(tokenAmountStr, destination.tokenDecimals);
      const executeParams = executeDeposit(
        destination.tokenSymbol,
        destination.tokenAddress,
        parsed,
        destination.chainId,
        address
      );
      const newInputs: SwapAndExecuteParams = {
        fromSources: state.selectedSources,
        toChainId: destination.chainId,
        toTokenAddress: destination.tokenAddress,
        toAmount: parsed,
        execute: {
          gas: BigInt(300_000),
          to: executeParams.to,
          data: executeParams.data,
          tokenApproval: {
            token: destination.tokenAddress,
            amount: parsed,
            spender: executeParams.to,
          },
        },
      };
      dispatch({ type: "setInputs", payload: newInputs });
      dispatch({ type: "setStatus", payload: "view-breakdown" });
      dispatch({ type: "setSimulationLoading", payload: true });
      initiateSwapIntent(newInputs);
    },
    [
      nexusSDK,
      state.selectedSources,
      destination,
      initiateSwapIntent,
      exchangeRate,
    ]
  );

  const handleAmountContinue = useCallback(
    (totalAmountUsd: number) => {
      if (!nexusSDK || state.selectedSources.length === 0) return;
      handleSingleSourceAmount(totalAmountUsd);
    },
    [nexusSDK, state.selectedSources, handleSingleSourceAmount]
  );

  const handleConfirmOrder = useCallback(() => {
    if (!swapIntent.current) return;
    dispatch({ type: "setStatus", payload: "swapping" });
    swapIntent.current.allow();
  }, [swapIntent]);

  const handleBack = useCallback(() => {
    if (swapIntent.current) {
      swapIntent.current.deny();
    }
    dispatch({ type: "reset" });
    resetSteps();
    initialSimulationDone.current = false;
    lastSimulationTime.current = 0;
    setPollingEnabled(false);
    stopwatch.stop();
    stopwatch.reset();
  }, [swapIntent, resetSteps, stopwatch]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    resetSteps();
    swapIntent.current = null;
    initialSimulationDone.current = false;
    lastSimulationTime.current = 0;
    setPollingEnabled(false);
    stopwatch.stop();
    stopwatch.reset();
  }, [resetSteps, swapIntent, stopwatch]);

  const refreshSimulation = async () => {
    // Skip if last simulation was less than 5 seconds ago (prevents immediate fire after initial)
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
  };

  useEffect(() => {
    // Only run when we're waiting for initial simulation
    if (
      initialSimulationDone.current ||
      !state.simulationLoading ||
      state.status !== "view-breakdown"
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
  }, [state.simulationLoading, state.status]);

  useEffect(() => {
    if (!nexusSDK) return;

    if (!swapBalance) {
      void fetchSwapBalance();
      return;
    }

    if (!hasAutoSelected.current && availableAssets.length > 0) {
      hasAutoSelected.current = true;
      dispatch({
        type: "setSelectedSources",
        payload: [availableAssets[0]],
      });
    }
  }, [nexusSDK, swapBalance, availableAssets, fetchSwapBalance]);

  usePolling(
    pollingEnabled &&
      state.status === "view-breakdown" &&
      Boolean(swapIntent.current) &&
      !state.simulationLoading,
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
    handleSelectAll: () =>
      dispatch({
        type: "setSelectedSources",
        payload: availableAssets,
      }),
    handleDeselectAll: () =>
      dispatch({ type: "setSelectedSources", payload: [] }),
    handleSourcesContinue,
    handleAmountContinue,
    handleConfirmOrder,
    handleBack,
    reset,
  };
};

export default useSwapDeposit;
