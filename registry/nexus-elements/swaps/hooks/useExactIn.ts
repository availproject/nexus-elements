import {
  type RefObject,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  NexusSDK,
  type SUPPORTED_CHAINS_IDS,
  type ExactInSwapInput,
  NEXUS_EVENTS,
  type SwapStepType,
  type OnSwapIntentHookData,
  type UserAsset,
} from "@avail-project/nexus-core";
import {
  resolveDestinationFromPrefill,
  resolveSourceFromPrefill,
} from "../utils/prefill";
import {
  useTransactionSteps,
  SWAP_EXPECTED_STEPS,
  useNexusError,
  useDebouncedCallback,
  usePolling,
} from "../../common";

export type SourceTokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  balance?: string;
  balanceInFiat?: string;
  chainId?: number;
};

export type DestinationTokenInfo = {
  tokenAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  chainId?: number;
  balance?: string;
  balanceInFiat?: string;
};

export type TransactionStatus =
  | "idle"
  | "simulating"
  | "swapping"
  | "success"
  | "error";

export interface SwapInputs {
  fromChainID?: SUPPORTED_CHAINS_IDS;
  fromToken?: SourceTokenInfo;
  fromAmount?: string;
  toChainID?: SUPPORTED_CHAINS_IDS;
  toToken?: DestinationTokenInfo;
}

export type SwapState = {
  inputs: SwapInputs;
  status: TransactionStatus;
  error: string | null;
  explorerUrls: {
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
};

type Action =
  | { type: "setInputs"; payload: Partial<SwapInputs> }
  | { type: "setStatus"; payload: TransactionStatus }
  | { type: "setError"; payload: string | null }
  | {
      type: "setExplorerUrls";
      payload: Partial<SwapState["explorerUrls"]>;
    }
  | { type: "reset" };

const initialState: SwapState = {
  inputs: {
    fromToken: undefined,
    toToken: undefined,
    fromAmount: undefined,
    fromChainID: undefined,
    toChainID: undefined,
  },
  status: "idle",
  error: null,
  explorerUrls: {
    sourceExplorerUrl: null,
    destinationExplorerUrl: null,
  },
};

function reducer(state: SwapState, action: Action): SwapState {
  switch (action.type) {
    case "setInputs": {
      return {
        ...state,
        inputs: {
          ...state.inputs,
          ...action.payload,
        },
      };
    }
    case "setStatus":
      return { ...state, status: action.payload };
    case "setError":
      return { ...state, error: action.payload };
    case "setExplorerUrls":
      return {
        ...state,
        explorerUrls: { ...state.explorerUrls, ...action.payload },
      };
    case "reset":
      return { ...initialState };
    default:
      return state;
  }
}

interface UseExactInProps {
  nexusSDK: NexusSDK | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  swapBalance: UserAsset[] | null;
  fetchBalance: () => Promise<void>;
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  prefill?: {
    fromChainID?: number;
    fromToken?: string;
    fromAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const useExactIn = ({
  nexusSDK,
  swapIntent,
  swapBalance,
  fetchBalance,
  onComplete,
  onStart,
  onError,
  prefill,
}: UseExactInProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    steps,
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();

  const areInputsValid = useMemo(() => {
    return (
      state?.inputs?.fromChainID !== undefined &&
      state?.inputs?.toChainID !== undefined &&
      state?.inputs?.fromToken &&
      state?.inputs?.toToken &&
      state?.inputs?.fromAmount &&
      Number(state.inputs.fromAmount) > 0
    );
  }, [state.inputs]);
  const handleNexusError = useNexusError();

  const handleSwap = async () => {
    if (
      !nexusSDK ||
      !areInputsValid ||
      !state?.inputs?.fromToken ||
      !state?.inputs?.toToken ||
      !state?.inputs?.fromAmount ||
      !state?.inputs?.toChainID ||
      !state?.inputs?.fromChainID
    )
      return;
    try {
      onStart?.();
      dispatch({ type: "setStatus", payload: "simulating" });
      seed(SWAP_EXPECTED_STEPS);
      const amountBigInt = nexusSDK.utils.parseUnits(
        state.inputs?.fromAmount,
        state.inputs.fromToken.decimals,
      );
      const swapInput: ExactInSwapInput = {
        from: [
          {
            chainId: state.inputs?.fromChainID,
            amount: amountBigInt,
            tokenAddress: state.inputs.fromToken.contractAddress,
          },
        ],
        toChainId: state.inputs?.toChainID,
        toTokenAddress: state.inputs.toToken.tokenAddress,
      };

      const result = await nexusSDK.swapWithExactIn(swapInput, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args;
            console.log("STEP COMPLETED", step);
            if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: { sourceExplorerUrl: step.explorerURL },
              });
            }
            if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: { destinationExplorerUrl: step.explorerURL },
              });
            }
            onStepComplete(step);
          }
        },
      });
      if (!result?.success) {
        throw new Error(result?.error || "Swap failed");
      }
      dispatch({ type: "setStatus", payload: "success" });
      onComplete?.(swapIntent.current?.intent?.destination?.amount);
      await fetchBalance();
      // dispatch({ type: "setInputs", payload: initialState.inputs });
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setStatus", payload: "error" });
      dispatch({ type: "setError", payload: message });
      onError?.(message);
      swapIntent.current = null;
    }
  };

  const debouncedSwapStart = useDebouncedCallback(handleSwap, 1200);

  const reset = () => {
    dispatch({ type: "reset" });
    resetSteps();
    swapIntent.current = null;
  };

  const availableBalance = useMemo(() => {
    if (
      !nexusSDK ||
      !swapBalance ||
      !state.inputs?.fromToken ||
      !state.inputs?.fromChainID
    )
      return undefined;
    return (
      swapBalance
        ?.find((token) => token.symbol === state.inputs?.fromToken?.symbol)
        ?.breakdown?.find(
          (chain) => chain.chain?.id === state.inputs?.fromChainID,
        ) ?? undefined
    );
  }, [
    state.inputs?.fromToken,
    state.inputs?.fromChainID,
    swapBalance,
    nexusSDK,
  ]);

  const destinationBalance = useMemo(() => {
    if (
      !nexusSDK ||
      !swapBalance ||
      !state.inputs?.toToken ||
      !state.inputs?.toChainID
    )
      return undefined;
    return (
      swapBalance
        ?.find((token) => token.symbol === state?.inputs?.toToken?.symbol)
        ?.breakdown?.find(
          (chain) => chain.chain?.id === state?.inputs?.toChainID,
        ) ?? undefined
    );
  }, [state?.inputs?.toToken, state?.inputs?.toChainID, swapBalance, nexusSDK]);

  const availableStables = useMemo(() => {
    if (!nexusSDK || !swapBalance) return [];
    const filteredToken = swapBalance?.filter((token) => {
      if (["USDT", "USDC", "ETH", "DAI", "WBTC"].includes(token.symbol)) {
        return token;
      }
    });
    return filteredToken ?? [];
  }, [swapBalance, nexusSDK]);

  const formatBalance = (
    balance?: string | number,
    symbol?: string,
    decimals?: number,
  ) => {
    if (!balance || !symbol || !decimals) return undefined;
    return nexusSDK?.utils?.formatTokenBalance(balance, {
      symbol: symbol,
      decimals: decimals,
    });
  };

  useEffect(() => {
    if (!swapBalance) {
      fetchBalance();
    }
  }, [swapBalance]);

  useEffect(() => {
    if (
      !areInputsValid ||
      !state?.inputs?.fromAmount ||
      !state?.inputs?.fromChainID ||
      !state?.inputs?.fromToken ||
      !state?.inputs?.toChainID ||
      !state?.inputs?.toToken
    ) {
      swapIntent.current?.deny();
      swapIntent.current = null;
      return;
    }
    if (state.status === "idle") {
      debouncedSwapStart();
    }
  }, [state.inputs, areInputsValid, state.status]);

  useEffect(() => {
    if (
      prefill?.fromToken &&
      prefill?.fromChainID &&
      !state.inputs?.fromToken
    ) {
      const src = resolveSourceFromPrefill(
        swapBalance,
        state.inputs?.fromChainID,
        prefill.fromToken,
      );
      if (src) {
        dispatch({ type: "setInputs", payload: { fromToken: src } });
      }
    }
    if (
      prefill?.toToken &&
      state.inputs?.toChainID !== undefined &&
      !state.inputs?.toToken
    ) {
      const dst = resolveDestinationFromPrefill(
        state.inputs?.toChainID,
        prefill.toToken,
      );
      if (dst) {
        dispatch({ type: "setInputs", payload: { toToken: dst } });
      }
    }
  }, [
    prefill,
    swapBalance,
    state.inputs?.fromChainID,
    state.inputs?.toChainID,
    state.inputs?.fromToken,
    state.inputs?.toToken,
  ]);

  const refreshSimulation = async () => {
    try {
      const updated = await swapIntent.current?.refresh();
      if (updated) {
        swapIntent.current!.intent = updated;
      }
    } catch (e) {
      console.error(e);
    }
  };

  usePolling(
    state.status === "simulating" && Boolean(swapIntent.current),
    async () => {
      await refreshSimulation();
    },
    15000,
  );

  return {
    status: state.status,
    inputs: state.inputs,
    setStatus: (status: TransactionStatus) =>
      dispatch({ type: "setStatus", payload: status }),
    setInputs: (inputs: Partial<SwapInputs>) => {
      if (state.status === "error") {
        dispatch({ type: "setError", payload: null });
        dispatch({ type: "setStatus", payload: "idle" });
      }
      dispatch({ type: "setInputs", payload: inputs });
    },
    txError: state.error,
    setTxError: (error: string | null) =>
      dispatch({ type: "setError", payload: error }),
    availableBalance,
    availableStables,
    destinationBalance,
    formatBalance,
    steps,
    explorerUrls: state.explorerUrls,
    handleSwap,
    reset,
    areInputsValid,
  };
};

export default useExactIn;
