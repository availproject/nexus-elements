"use client";

import { useCallback, useReducer, useState } from "react";
import type {
  WidgetStep,
  DepositWidgetContextValue,
  DepositStatus,
  DepositInputs,
  NavigationDirection,
  AssetSelectionState,
} from "../types";
import { getChainIdsForFilter } from "../utils/asset-helpers";
import { MOCK_TRANSACTION } from "../constants";

interface WidgetState {
  step: WidgetStep;
  inputs: DepositInputs;
  status: DepositStatus;
  explorerUrls: {
    intentUrl: string | null;
    executeUrl: string | null;
  };
  error: string | null;
  lastResult: unknown;
  navigationDirection: NavigationDirection;
}

type Action =
  | { type: "setStep"; payload: { step: WidgetStep; direction: NavigationDirection } }
  | { type: "setInputs"; payload: Partial<DepositInputs> }
  | { type: "setStatus"; payload: DepositStatus }
  | { type: "setExplorerUrls"; payload: Partial<WidgetState["explorerUrls"]> }
  | { type: "setError"; payload: string | null }
  | { type: "setLastResult"; payload: unknown }
  | { type: "reset" };

// Navigation history for back button
const STEP_HISTORY: Record<WidgetStep, WidgetStep | null> = {
  amount: null,
  confirmation: "amount",
  "transaction-status": null,
  "transaction-complete": null,
  "asset-selection": "amount",
} as const;

interface UseDepositWidgetProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const createInitialState = (): WidgetState => ({
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
});

function reducer(state: WidgetState, action: Action): WidgetState {
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
    case "reset":
      return createInitialState();
    default:
      return state;
  }
}

const createInitialAssetSelection = (): AssetSelectionState => ({
  selectedChainIds: getChainIdsForFilter("all"),
  filter: "all",
  expandedTokens: new Set(),
});

export function useDepositWidget(props?: UseDepositWidgetProps): DepositWidgetContextValue {
  const { onSuccess, onError } = props ?? {};

  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const {
    step,
    inputs,
    status,
    explorerUrls,
    error: txError,
    lastResult,
    navigationDirection,
  } = state;

  // Asset selection state (persisted across navigation)
  const [assetSelection, setAssetSelectionState] = useState<AssetSelectionState>(
    createInitialAssetSelection
  );

  const setAssetSelection = useCallback((update: Partial<AssetSelectionState>) => {
    setAssetSelectionState((prev) => ({ ...prev, ...update }));
  }, []);

  // Derived state
  const isProcessing = status === "executing";
  const isSuccess = status === "success";
  const isError = status === "error";

  const setInputs = useCallback((next: Partial<DepositInputs>) => {
    dispatch({ type: "setInputs", payload: next });
  }, []);

  const setTxError = useCallback((error: string | null) => {
    dispatch({ type: "setError", payload: error });
  }, []);

  const goToStep = useCallback((newStep: WidgetStep) => {
    dispatch({ type: "setStep", payload: { step: newStep, direction: "forward" } });
  }, []);

  const goBack = useCallback(() => {
    const previousStep = STEP_HISTORY[step];
    if (previousStep) {
      dispatch({ type: "setStep", payload: { step: previousStep, direction: "backward" } });
    }
  }, [step]);

  const reset = useCallback(() => {
    dispatch({ type: "reset" });
    setAssetSelectionState(createInitialAssetSelection());
  }, []);

  const handleTransaction = useCallback(async () => {
    if (!inputs?.amount) return;

    dispatch({ type: "setStatus", payload: "executing" });
    dispatch({ type: "setError", payload: null });

    try {
      // Simulate transaction delay
      await new Promise((resolve) =>
        setTimeout(resolve, MOCK_TRANSACTION.simulationDelayMs)
      );

      const mockResult = {
        txHash: MOCK_TRANSACTION.txHash,
        bridgeExplorerUrl: MOCK_TRANSACTION.explorerUrls.bridge,
        executeExplorerUrl: MOCK_TRANSACTION.explorerUrls.execute,
      };

      dispatch({ type: "setLastResult", payload: mockResult });
      dispatch({
        type: "setExplorerUrls",
        payload: {
          intentUrl: mockResult.bridgeExplorerUrl,
          executeUrl: mockResult.executeExplorerUrl,
        },
      });

      dispatch({ type: "setStatus", payload: "success" });
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed";
      dispatch({ type: "setError", payload: message });
      dispatch({ type: "setStatus", payload: "error" });
      onError?.(message);
    }
  }, [inputs?.amount, onSuccess, onError]);

  const startTransaction = useCallback(() => {
    if (isProcessing) return;
    dispatch({ type: "setError", payload: null });
    void handleTransaction();
  }, [isProcessing, handleTransaction]);

  return {
    // State
    step,
    inputs,
    setInputs,
    status,
    explorerUrls,

    // Derived state
    isProcessing,
    isSuccess,
    isError,

    // Error handling
    txError,
    setTxError,

    // Navigation
    goToStep,
    goBack,
    reset,
    navigationDirection,

    // Transaction actions
    startTransaction,

    // Results
    lastResult,

    // Asset selection
    assetSelection,
    setAssetSelection,
  };
}
