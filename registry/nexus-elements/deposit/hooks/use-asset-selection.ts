"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AssetSelectionState, DestinationConfig } from "../types";
import type { UserAsset } from "@avail-project/nexus-core";
import { MIN_SELECTABLE_SOURCE_BALANCE_USD } from "../constants/widget";
import {
  resolveDepositSourceSelection,
  summarizeSourceIds,
  summarizeSwapBalanceSources,
} from "../utils";

function parseUsdAmount(value?: string): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function areSetsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

interface SetAssetSelectionOptions {
  markUserModified?: boolean;
}

/**
 * Creates fresh initial asset selection state
 */
export const createInitialAssetSelection = (): AssetSelectionState => ({
  selectedChainIds: new Set<string>(),
  filter: "all",
  expandedTokens: new Set(),
});

/**
 * Hook for managing asset selection state in the deposit widget.
 * Handles selection of tokens/chains for cross-chain swaps.
 */
export function useAssetSelection(
  swapBalance: UserAsset[] | null,
  destination: Pick<
    DestinationConfig,
    "chainId" | "tokenAddress" | "tokenSymbol"
  >,
  inputAmount?: string,
) {
  const [assetSelection, setAssetSelectionState] =
    useState<AssetSelectionState>(createInitialAssetSelection);
  const hasUserModifiedSelection = useRef(false);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const previousAmountUsd = useRef<number>(parseUsdAmount(inputAmount));

  useEffect(() => {
    const nextAmountUsd = parseUsdAmount(inputAmount);

    if (
      hasUserModifiedSelection.current &&
      previousAmountUsd.current !== nextAmountUsd
    ) {
      console.log("[deposit][selection][amount-reset]", {
        previousAmountUsd: previousAmountUsd.current,
        nextAmountUsd,
        previousSelectedSourceIds: [...assetSelection.selectedChainIds],
        previousSelectedSources: summarizeSourceIds(
          assetSelection.selectedChainIds,
          swapBalance,
        ),
      });
      hasUserModifiedSelection.current = false;
      setIsManualSelection(false);
      setAssetSelectionState(createInitialAssetSelection());
    }

    previousAmountUsd.current = nextAmountUsd;
  }, [inputAmount]);

  // Auto-select token sources by priority until target amount is covered.
  // This keeps adapting to amount changes until the user manually edits selection.
  useEffect(() => {
    if (swapBalance && !hasUserModifiedSelection.current) {
      const targetAmountUsd = parseUsdAmount(inputAmount);
      const { selectedSourceIds: defaultSelectedSourceIds } =
        resolveDepositSourceSelection({
          swapBalance,
          destination,
          filter: assetSelection.filter,
          selectedSourceIds: assetSelection.selectedChainIds,
          isManualSelection: false,
          minimumBalanceUsd: MIN_SELECTABLE_SOURCE_BALANCE_USD,
          targetAmountUsd,
        });

      console.log("[deposit][selection][auto]", {
        inputAmount,
        targetAmountUsd,
        selectedSourceIds: defaultSelectedSourceIds,
        selectedSources: summarizeSourceIds(defaultSelectedSourceIds, swapBalance),
        availableSources: summarizeSwapBalanceSources(swapBalance),
      });

      if (defaultSelectedSourceIds.length === 0) return;

      const nextSelection = new Set(defaultSelectedSourceIds);
      if (areSetsEqual(assetSelection.selectedChainIds, nextSelection)) return;

      setAssetSelectionState((prev) => ({
        ...prev,
        selectedChainIds: nextSelection,
        expandedTokens:
          prev.expandedTokens.size > 0 ? new Set() : prev.expandedTokens,
      }));
    }
  }, [
    swapBalance,
    destination,
    inputAmount,
    assetSelection.filter,
    assetSelection.selectedChainIds,
  ]);

  const setAssetSelection = useCallback(
    (
      update: Partial<AssetSelectionState>,
      options?: SetAssetSelectionOptions,
    ) => {
      const nextIsManualSelection = options?.markUserModified ?? true;
      hasUserModifiedSelection.current = nextIsManualSelection;
      setIsManualSelection(nextIsManualSelection);
      setAssetSelectionState((prev) => {
        const nextState = { ...prev, ...update };

        console.log("[deposit][selection][set]", {
          markUserModified: nextIsManualSelection,
          update: {
            filter: update.filter,
            selectedSourceIds: update.selectedChainIds
              ? [...update.selectedChainIds]
              : undefined,
            expandedTokens: update.expandedTokens
              ? [...update.expandedTokens]
              : undefined,
          },
          previousFilter: prev.filter,
          nextFilter: nextState.filter,
          previousSelectedSourceIds: [...prev.selectedChainIds],
          nextSelectedSourceIds: [...nextState.selectedChainIds],
          nextSelectedSources: summarizeSourceIds(
            nextState.selectedChainIds,
            swapBalance,
          ),
        });

        return nextState;
      });
    },
    [swapBalance],
  );

  const resetAssetSelection = useCallback(() => {
    console.log("[deposit][selection][reset]", {
      previousSelectedSourceIds: [...assetSelection.selectedChainIds],
      previousSelectedSources: summarizeSourceIds(
        assetSelection.selectedChainIds,
        swapBalance,
      ),
    });
    hasUserModifiedSelection.current = false;
    setIsManualSelection(false);
    setAssetSelectionState(createInitialAssetSelection());
  }, [assetSelection.selectedChainIds, swapBalance]);

  return {
    assetSelection,
    isManualSelection,
    setAssetSelection,
    resetAssetSelection,
  };
}
