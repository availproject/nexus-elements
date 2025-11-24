import {
  NEXUS_EVENTS,
  NexusSDK,
  type OnSwapIntentHookData,
  type SwapStepType,
  type UserAsset,
  type ExactInSwapInput,
} from "@avail-project/nexus-core";
import { RefObject, useMemo, useReducer } from "react";
import { useNexusError, useStopwatch, useTransactionSteps } from "../../common";

export type TransactionStatus =
  | "idle"
  | "set-source-assets"
  | "set-amount"
  | "swapping"
  | "depositing"
  | "success"
  | "error";

export type TokenInfo = {
  contractAddress: `0x${string}`;
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
};

type SwapDepositState = {
  inputs: ExactInSwapInput | null;
  status: TransactionStatus;
  error: string | null;
  explorerUrls: {
    source: string | null;
    destination: string | null;
  };
  isDialogOpen: boolean;
};

interface UseSwapDepositProps {
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

type Action =
  | { type: "setInputs"; payload: Partial<ExactInSwapInput> }
  | { type: "resetInputs" }
  | { type: "setStatus"; payload: TransactionStatus }
  | { type: "setError"; payload: string }
  | { type: "setDialogOpen"; payload: boolean }
  | {
      type: "setExplorerUrls";
      payload: { source: string | null; destination: string | null };
    };

const initialState: SwapDepositState = {
  inputs: null,
  status: "idle",
  error: null,
  explorerUrls: {
    source: null,
    destination: null,
  },
  isDialogOpen: false,
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
        return { ...state, inputs: merged as ExactInSwapInput };
      }
      return state;
    }
    case "resetInputs":
      return {
        ...state,
        inputs: null,
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
    case "setDialogOpen":
      return { ...state, isDialogOpen: action.payload };
    default:
      return state;
  }
}

const useSwapDeposit = ({
  nexusSDK,
  swapIntent,
  swapBalance,
  fetchBalance,
  onComplete,
  onStart,
  onError,
  prefill,
}: UseSwapDepositProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loading = state.status === "swapping" || state.status === "depositing";
  const setInputs = (next: ExactInSwapInput | Partial<ExactInSwapInput>) => {
    dispatch({ type: "setInputs", payload: next as Partial<ExactInSwapInput> });
  };
  const handleNexusError = useNexusError();
  const {
    steps,
    seed,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<SwapStepType>();

  const swapCompleted = useMemo(
    () => steps.some((s) => s.step?.type === "SWAP_COMPLETE" && s.completed),
    [steps]
  );
  const stopwatch = useStopwatch({
    running: state.isDialogOpen && !swapCompleted,
    intervalMs: 100,
  });

  const handleSwap = async () => {
    if (!nexusSDK || !state.inputs || loading) return;
    onStart?.();
    dispatch({ type: "setStatus", payload: "swapping" });
    try {
      const swapResult = await nexusSDK?.swapWithExactIn(state.inputs, {
        onEvent: (event) => {
          if (event.name === NEXUS_EVENTS.SWAP_STEP_COMPLETE) {
            const step = event.args as SwapStepType & {
              explorerURL?: string;
              completed?: boolean;
            };
            if (step?.type === "SOURCE_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: { ...state.explorerUrls, source: step.explorerURL },
              });
            }
            if (step?.type === "DESTINATION_SWAP_HASH" && step.explorerURL) {
              dispatch({
                type: "setExplorerUrls",
                payload: {
                  ...state.explorerUrls,
                  destination: step.explorerURL,
                },
              });
            }
            onStepComplete(step);
          }
        },
      });
    } catch (error) {
      const { message } = handleNexusError(error);
      dispatch({ type: "setError", payload: message });
      onError?.(message);
    } finally {
      dispatch({ type: "setStatus", payload: "idle" });
    }
  };

  const reset = () => {};

  return { loading, inputs: state.inputs, setInputs };
};

export default useSwapDeposit;
