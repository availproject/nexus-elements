"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AssetSelectionState, DestinationConfig } from "../types";
import type { UserAsset } from "@avail-project/nexus-core";
import { MIN_SELECTABLE_SOURCE_BALANCE_USD } from "../constants/widget";
import { buildSelectableSourceIds } from "../utils/source-priority";

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
  destination: Pick<DestinationConfig, "chainId" | "tokenAddress" | "tokenSymbol">,
) {
  const [assetSelection, setAssetSelectionState] =
    useState<AssetSelectionState>(createInitialAssetSelection);
  const hasUserModifiedSelection = useRef(false);

  // Extract primitive value for effect dependency (rerender-dependencies)
  const selectedChainIdsCount = assetSelection.selectedChainIds.size;

  // Auto-select all assets when swapBalance first loads
  useEffect(() => {
    if (
      swapBalance &&
      selectedChainIdsCount === 0 &&
      !hasUserModifiedSelection.current
    ) {
      const allChainIds = new Set(
        buildSelectableSourceIds({
          swapBalance,
          destination,
          minimumBalanceUsd: MIN_SELECTABLE_SOURCE_BALANCE_USD,
        }),
      );
      if (allChainIds.size > 0) {
        setAssetSelectionState({
          selectedChainIds: allChainIds,
          filter: "all",
          expandedTokens: new Set(),
        });
      }
    }
  }, [swapBalance, destination, selectedChainIdsCount]);

  const setAssetSelection = useCallback(
    (update: Partial<AssetSelectionState>) => {
      hasUserModifiedSelection.current = true;
      setAssetSelectionState((prev) => ({ ...prev, ...update }));
    },
    []
  );

  const resetAssetSelection = useCallback(() => {
    hasUserModifiedSelection.current = false;
    setAssetSelectionState(createInitialAssetSelection());
  }, []);

  return {
    assetSelection,
    setAssetSelection,
    resetAssetSelection,
  };
}
