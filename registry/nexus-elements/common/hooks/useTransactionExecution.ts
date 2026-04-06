import type { createNexusClient } from "@avail-project/nexus-sdk-v2";
import type { OnAllowanceHookData, OnIntentHookData } from "@avail-project/nexus-sdk-v2";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useRef,
} from "react";
import { type TransactionStatus } from "../tx/types";
import {
  type SourceSelectionValidation,
  type TransactionFlowEvent,
  type TransactionFlowExecutor,
  type TransactionFlowInputs,
} from "../types/transaction-flow";

type NexusClient = ReturnType<typeof createNexusClient>;

interface NexusErrorInfo {
  code: string;
  message: string;
  context?: unknown;
  details?: unknown;
}

type NexusErrorHandler = (error: unknown) => NexusErrorInfo;

// v2 plan_progress step types for bridge
const BRIDGE_STEP_INTENT_SIGNED = "request_signing";

interface UseTransactionExecutionProps {
  operationName: "bridge" | "transfer";
  nexusSDK: NexusClient | null;
  intent: RefObject<OnIntentHookData | null>;
  allowance: RefObject<OnAllowanceHookData | null>;
  inputs: TransactionFlowInputs;
  configuredMaxAmount?: string;
  allAvailableSourceChainIds: number[];
  sourceChainsForSdk?: number[];
  sourceSelectionKey: string;
  sourceSelection: SourceSelectionValidation;
  loading: boolean;
  txError: string | null;
  areInputsValid: boolean;
  executeTransaction: TransactionFlowExecutor;
  getMaxForCurrentSelection: () => Promise<string | undefined>;
  onStepsList: (steps: { typeID?: string; type?: string; [key: string]: unknown }[]) => void;
  onStepComplete: (step: { typeID?: string; type?: string; [key: string]: unknown }) => void;
  resetSteps: () => void;
  setStatus: (status: TransactionStatus) => void;
  resetInputs: () => void;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
  setIsDialogOpen: Dispatch<SetStateAction<boolean>>;
  setTxError: Dispatch<SetStateAction<string | null>>;
  setLastExplorerUrl: Dispatch<SetStateAction<string>>;
  setSelectedSourceChains: Dispatch<SetStateAction<number[] | null>>;
  setAppliedSourceSelectionKey: Dispatch<SetStateAction<string>>;
  stopwatch: {
    start: () => void;
    stop: () => void;
    reset: () => void;
  };
  handleNexusError: NexusErrorHandler;
  onStart?: () => void;
  onComplete?: (explorerUrl?: string) => void;
  onError?: (message: string) => void;
  fetchBalance: () => Promise<void>;
  notifyHistoryRefresh?: () => void;
}

export function useTransactionExecution({
  operationName,
  nexusSDK,
  intent,
  allowance,
  inputs,
  configuredMaxAmount,
  allAvailableSourceChainIds,
  sourceChainsForSdk,
  sourceSelectionKey,
  sourceSelection,
  loading,
  txError,
  areInputsValid,
  executeTransaction,
  getMaxForCurrentSelection,
  onStepsList,
  onStepComplete,
  resetSteps,
  setStatus,
  resetInputs,
  setRefreshing,
  setIsDialogOpen,
  setTxError,
  setLastExplorerUrl,
  setSelectedSourceChains,
  setAppliedSourceSelectionKey,
  stopwatch,
  handleNexusError,
  onStart,
  onComplete,
  onError,
  fetchBalance,
  notifyHistoryRefresh,
}: UseTransactionExecutionProps) {
  const commitLockRef = useRef(false);
  const runIdRef = useRef(0);

  const refreshIntent = async (options?: { reportError?: boolean }) => {
    if (!intent.current) return false;
    const activeRunId = runIdRef.current;
    setRefreshing(true);
    try {
      const updated = await intent.current.refresh(sourceChainsForSdk);
      if (activeRunId !== runIdRef.current) return false;
      if (updated) {
        intent.current.intent = updated;
      }
      setAppliedSourceSelectionKey(sourceSelectionKey);
      return true;
    } catch (error) {
      if (activeRunId !== runIdRef.current) return false;
      console.error("Transaction failed:", error);
      if (options?.reportError) {
        const message = "Unable to refresh source selection. Please try again.";
        setTxError(message);
        onError?.(message);
      }
      return false;
    } finally {
      if (activeRunId === runIdRef.current) {
        setRefreshing(false);
      }
    }
  };

  const onSuccess = async (explorerUrl?: string) => {
    stopwatch.stop();
    setStatus("success");
    onComplete?.(explorerUrl);
    intent.current = null;
    allowance.current = null;
    resetInputs();
    setRefreshing(false);
    setSelectedSourceChains(null);
    setAppliedSourceSelectionKey("ALL");
    await fetchBalance();
    notifyHistoryRefresh?.();
  };

  const handleTransaction = async () => {
    if (commitLockRef.current) return;
    commitLockRef.current = true;
    const currentRunId = ++runIdRef.current;
    let didEnterExecutingState = false;
    // Declared here (outside try/catch) so both the event handler and the catch block
    // can read/write it — prevents the catch from clobbering event-driven completions
    let completedFromEvent = false;
    const cleanupSupersededExecution = () => {
      if (!didEnterExecutingState) return;
      // Don't tear down the dialog if an event already handled success/failure —
      // resetInputs() inside onSuccess triggers invalidatePendingExecution which
      // increments runIdRef, making this branch fire spuriously.
      if (completedFromEvent) return;
      setRefreshing(false);
      setIsDialogOpen(false);
      setLastExplorerUrl("");
      stopwatch.stop();
      stopwatch.reset();
      resetSteps();
      setStatus("idle");
    };


    try {
      if (
        !inputs?.amount ||
        !inputs?.recipient ||
        !inputs?.chain ||
        !inputs?.token
      ) {
        console.error("Missing required inputs");
        return;
      }
      if (!nexusSDK) {
        const message = "Nexus SDK not initialized";
        setTxError(message);
        onError?.(message);
        return;
      }
      if (allAvailableSourceChainIds.length === 0) {
        const message =
          "No eligible source chains available for the selected token and destination.";
        setTxError(message);
        onError?.(message);
        setStatus("error");
        return;
      }

      const parsedAmount = Number(inputs.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        const message = "Enter a valid amount greater than 0.";
        setTxError(message);
        onError?.(message);
        setStatus("error");
        return;
      }

      // v2: convertTokenReadableAmountToBigInt(amount, tokenSymbol, chainId)
      const amountBigInt = nexusSDK.convertTokenReadableAmountToBigInt(
        inputs.amount,
        inputs.token,
        inputs.chain,
      );

      if (configuredMaxAmount) {
        const configuredMaxRaw = nexusSDK.convertTokenReadableAmountToBigInt(
          configuredMaxAmount,
          inputs.token,
          inputs.chain,
        );
        if (amountBigInt > configuredMaxRaw) {
          const message = `Amount exceeds maximum limit of ${configuredMaxAmount} ${inputs.token}.`;
          setTxError(message);
          onError?.(message);
          setStatus("error");
          return;
        }
      }

      const maxForCurrentSelection = await getMaxForCurrentSelection();
      if (currentRunId !== runIdRef.current) return;
      if (!maxForCurrentSelection) {
        const message = `Unable to determine max ${operationName} amount for selected sources. Please try again.`;
        setTxError(message);
        onError?.(message);
        setStatus("error");
        return;
      }
      const maxForSelectionRaw = nexusSDK.convertTokenReadableAmountToBigInt(
        maxForCurrentSelection,
        inputs.token,
        inputs.chain,
      );
      if (amountBigInt > maxForSelectionRaw) {
        const message = `Selected sources can provide up to ${maxForCurrentSelection} ${inputs.token}. Reduce amount or enable more sources.`;
        setTxError(message);
        onError?.(message);
        setStatus("error");
        return;
      }

      setStatus("executing");
      didEnterExecutingState = true;
      setTxError(null);
      onStart?.();
      setLastExplorerUrl("");
      setAppliedSourceSelectionKey(sourceSelectionKey);

      // Terminal step types — when state:"completed" fires on these, the operation is done
      const TERMINAL_STEP_TYPES = new Set([
        "bridge_fill",       // bridge & transfer final fill
        "destination_swap",  // swap final step
      ]);

      // v2 onEvent uses typed discriminated union: { type, ... }
      const onEvent = (event: TransactionFlowEvent) => {
        if (currentRunId !== runIdRef.current) return;

        if (event.type === "plan_preview") {
          // Seed UI with the step list from the plan
          type StepShape = { typeID?: string; type?: string; [key: string]: unknown };
          const steps = ((event as { type: string; plan: { steps: StepShape[] } }).plan?.steps ?? []) as StepShape[];
          onStepsList(steps);
        }

        if (event.type === "plan_progress") {
          const progressEvent = event as {
            type: string;
            stepType: string;
            state: string;
            step: { typeID?: string; type?: string; [key: string]: unknown };
            error?: string;
          };

          // Always mark step as complete/updated in UI
          onStepComplete(progressEvent.step);

          const isTerminal = TERMINAL_STEP_TYPES.has(progressEvent.stepType);

          if (progressEvent.state === "failed") {
            // Any step failure → abort
            if (!completedFromEvent) {
              completedFromEvent = true;
              const errorMessage = progressEvent.error ?? "Transaction failed";
              stopwatch.stop();
              setTxError(errorMessage);
              onError?.(errorMessage);
              setStatus("error");
            }
            return;
          }

          if (isTerminal && progressEvent.state === "completed") {
            // Terminal step completed → success
            if (!completedFromEvent) {
              completedFromEvent = true;
              stopwatch.stop();
              // explorerUrl is on the event itself, not the step object
              const explorerUrl = (event as { explorerUrl?: string }).explorerUrl;
              if (explorerUrl) setLastExplorerUrl(explorerUrl);
              void onSuccess(explorerUrl);
            }
          }
        }

        if (event.type === "status") {
          const statusEvent = event as { type: string; status: string };
          if (statusEvent.status === "completed" && !completedFromEvent) {
            completedFromEvent = true;
            stopwatch.stop();
            void onSuccess(undefined);
          }
        }
      };

      const transactionResult = await executeTransaction({
        token: inputs.token,
        amount: amountBigInt,
        toChainId: inputs.chain,
        recipient: inputs.recipient,
        sources: sourceChainsForSdk,
        onEvent,
      });

      if (currentRunId !== runIdRef.current) {
        cleanupSupersededExecution();
        return;
      }
      if (!transactionResult) {
        if (!completedFromEvent) {
          throw new Error("Transaction rejected by user");
        }
        // Already handled via events
        return;
      }

      // SDK promise resolved — use result for explorerUrl if event-driven success didn't set it
      if (!completedFromEvent) {
        // Fallback: SDK resolved but we never got a terminal event (e.g. single-step flows)
        setLastExplorerUrl(transactionResult.explorerUrl ?? "");
        await onSuccess(transactionResult.explorerUrl);
      } else {
        // Event-driven success already ran — just update explorerUrl if we have a better one
        if (transactionResult.explorerUrl) {
          setLastExplorerUrl(transactionResult.explorerUrl);
        }
      }
    } catch (error) {
      if (currentRunId !== runIdRef.current) {
        cleanupSupersededExecution();
        return;
      }
      // If event-driven success/failure already handled this transaction, ignore SDK-level errors
      // (the SDK may throw or return oddly after a successful fill event)
      if (completedFromEvent) return;
      const { message, code, context, details } = handleNexusError(error);
      console.error(`Fast ${operationName} transaction failed:`, {
        code,
        message,
        context,
        details,
      });
      intent.current?.deny();
      intent.current = null;
      allowance.current = null;
      setTxError(message);
      onError?.(message);
      setIsDialogOpen(false);
      setSelectedSourceChains(null);
      setRefreshing(false);
      stopwatch.stop();
      stopwatch.reset();
      resetSteps();
      void fetchBalance();
      setStatus("error");
    } finally {
      commitLockRef.current = false;
    }
  };

  const reset = () => {
    runIdRef.current += 1;
    intent.current?.deny();
    intent.current = null;
    allowance.current = null;
    resetInputs();
    setStatus("idle");
    setRefreshing(false);
    setSelectedSourceChains(null);
    setAppliedSourceSelectionKey("ALL");
    setLastExplorerUrl("");
    stopwatch.stop();
    stopwatch.reset();
    resetSteps();
  };

  const startTransaction = () => {
    if (!intent.current) return;
    if (allAvailableSourceChainIds.length === 0) {
      const message =
        "No eligible source chains available for the selected token and destination.";
      setTxError(message);
      onError?.(message);
      return;
    }
    if (sourceSelection.isBelowRequired && inputs?.token) {
      const message = `Selected sources are not enough. Add ${sourceSelection.missingToProceed} ${inputs.token} more to make this transaction.`;
      setTxError(message);
      onError?.(message);
      return;
    }
    void (async () => {
      const refreshed = await refreshIntent({ reportError: true });
      if (!refreshed || !intent.current) return;
      intent.current.allow();
      setIsDialogOpen(true);
      // Start the stopwatch AFTER the dialog opens so the isDialogOpen effect
      // does not immediately reset it (the effect only resets when dialog is closed)
      stopwatch.reset();
      stopwatch.start();
      setTxError(null);
    })();
  };

  const commitAmount = async () => {
    if (intent.current || loading || txError || !areInputsValid) return;
    await handleTransaction();
  };

  const invalidatePendingExecution = useCallback(() => {
    runIdRef.current += 1;
    if (intent.current) {
      intent.current.deny();
      intent.current = null;
    }
    setRefreshing(false);
    setAppliedSourceSelectionKey("ALL");
  }, [intent, setAppliedSourceSelectionKey, setRefreshing]);

  return {
    refreshIntent,
    handleTransaction,
    startTransaction,
    commitAmount,
    reset,
    invalidatePendingExecution,
  };
}
