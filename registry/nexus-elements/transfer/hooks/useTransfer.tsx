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
  TOKEN_METADATA,
  type UserAsset,
} from "@avail-project/nexus-core";
import { useEffect, useMemo, useRef, useState, useReducer } from "react";
import { type Address, isAddress, parseUnits } from "viem";
import { useNexus } from "../../nexus/NexusProvider";
import { useStopwatch } from "../../common/hooks/useStopwatch";
import { usePolling } from "../../common/hooks/usePolling";
import { useTransactionSteps } from "../../common/tx/useTransactionSteps";
import type { TransactionStatus } from "../../common/tx/types";

export interface FastTransferState {
  chain: SUPPORTED_CHAINS_IDS;
  token: SUPPORTED_TOKENS;
  amount?: string;
  recipient: `0x${string}`;
}

interface UseTransferProps {
  network: NexusNetwork;
  nexusSDK: NexusSDK | null;
  intent: OnIntentHookData | null;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  unifiedBalance: UserAsset[] | null;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (message: string) => void;
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
  }
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

const useTransfer = ({
  network,
  nexusSDK,
  intent,
  setIntent,
  setAllowance,
  unifiedBalance,
  prefill,
  onComplete,
  onStart,
  onError,
}: UseTransferProps) => {
  const { fetchUnifiedBalance, handleNexusError } = useNexus();
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

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string>("");
  const commitLockRef = useRef<boolean>(false);
  const {
    steps,
    onStepsList,
    onStepComplete,
    reset: resetSteps,
  } = useTransactionSteps<BridgeStepType>();

  const areInputsValid = useMemo(() => {
    const hasToken = inputs?.token !== undefined && inputs?.token !== null;
    const hasChain = inputs?.chain !== undefined && inputs?.chain !== null;
    const hasAmount = Boolean(inputs?.amount) && Number(inputs?.amount) > 0;
    const hasValidrecipient =
      Boolean(inputs?.recipient) && isAddress(inputs?.recipient as string);
    return hasToken && hasChain && hasAmount && hasValidrecipient;
  }, [inputs]);

  const handleTransaction = async () => {
    if (
      !inputs?.amount ||
      !inputs?.recipient ||
      !inputs?.chain ||
      !inputs?.token
    ) {
      console.error("Missing required inputs");
      return;
    }
    setLoading(true);
    dispatch({ type: "setStatus", payload: "executing" });
    setTxError(null);
    onStart?.();
    try {
      const transferTxn = await nexusSDK?.bridgeAndTransfer(
        {
          token: inputs?.token,
          amount: parseUnits(
            inputs?.amount,
            TOKEN_METADATA[inputs?.token].decimals
          ),
          toChainId: inputs?.chain,
          recipient: inputs?.recipient,
        },
        {
          onEvent: (event) => {
            if (event.name === NEXUS_EVENTS.STEPS_LIST) {
              const list = Array.isArray(event.args) ? event.args : [];
              onStepsList(list);
            }
            if (event.name === NEXUS_EVENTS.STEP_COMPLETE) {
              onStepComplete(event.args);
            }
          },
        }
      );
      if (!transferTxn) {
        throw new Error("Transaction rejected by user");
      }
      if (transferTxn) {
        setLastExplorerUrl(transferTxn.explorerUrl);
        await onSuccess();
      }
    } catch (error) {
      const { message } = handleNexusError(error);
      setTxError(message);
      onError?.(message);
      setIsDialogOpen(false);
      dispatch({ type: "setStatus", payload: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onSuccess = async () => {
    // Close dialog and stop timer on success
    stopwatch.stop();
    dispatch({ type: "setStatus", payload: "success" });
    onComplete?.();
    setIntent(null);
    setAllowance(null);
    dispatch({ type: "resetInputs" });
    setRefreshing(false);
    await fetchUnifiedBalance();
  };

  const filteredUnifiedBalance = useMemo(() => {
    return unifiedBalance?.find((bal) => bal?.symbol === inputs?.token);
  }, [unifiedBalance, inputs?.token]);

  const refreshIntent = async () => {
    setRefreshing(true);
    try {
      await intent?.refresh([]);
    } catch (error) {
      console.error("Transaction failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    intent?.deny();
    setIntent(null);
    setAllowance(null);
    dispatch({ type: "resetInputs" });
    dispatch({ type: "setStatus", payload: "idle" });
    setLoading(false);
    setRefreshing(false);
    stopwatch.stop();
    stopwatch.reset();
    resetSteps();
  };

  const startTransaction = () => {
    // Reset timer for a fresh run
    intent?.allow();
    setIsDialogOpen(true);
    setTxError(null);
  };

  const commitAmount = async () => {
    if (commitLockRef.current) return;
    if (intent || loading || txError || !areInputsValid) return;
    commitLockRef.current = true;
    try {
      await handleTransaction();
    } finally {
      commitLockRef.current = false;
    }
  };

  usePolling(Boolean(intent) && !isDialogOpen, refreshIntent, 15000);

  const stopwatch = useStopwatch({ running: isDialogOpen, intervalMs: 100 });

  useEffect(() => {
    if (intent) {
      intent.deny();
      setIntent(null);
    }
  }, [inputs]);

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
    filteredUnifiedBalance,
    startTransaction,
    commitAmount,
    lastExplorerUrl,
    steps,
    status: state.status,
  };
};

export default useTransfer;
