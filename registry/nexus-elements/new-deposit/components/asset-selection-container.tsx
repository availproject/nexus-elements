"use client";

import { useMemo, useCallback, useState } from "react";
import { CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ChevronDownIcon } from "./icons";
import WidgetHeader from "./widget-header";
import TokenRow from "./token-row";
import type { DepositWidgetContextValue, AssetFilterType } from "../types";
import { TOKENS, MEMECOINS } from "../data/tokens";
import {
  getChainIdsForFilter,
  checkIfMatchesPreset,
  calculateSelectedAmount,
  sortTokensByValue,
  findTokenById,
} from "../utils/asset-helpers";

interface AssetSelectionContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const AssetSelectionContainer = ({
  widget,
  onClose,
}: AssetSelectionContainerProps) => {
  const { assetSelection, setAssetSelection } = widget;

  // Local state - changes are only committed on "Done"
  const [localSelectedChainIds, setLocalSelectedChainIds] = useState<
    Set<string>
  >(() => new Set(assetSelection.selectedChainIds));
  const [localFilter, setLocalFilter] = useState<AssetFilterType>(
    assetSelection.filter
  );
  const [localExpandedTokens, setLocalExpandedTokens] = useState<Set<string>>(
    () => new Set(assetSelection.expandedTokens)
  );

  // Use local state for display
  const selectedChainIds = localSelectedChainIds;
  const filter = localFilter;
  const expandedTokens = localExpandedTokens;

  // Sort tokens by balance (highest first)
  const sortedTokens = useMemo(() => sortTokensByValue(TOKENS), []);

  // Calculate total selected USD value
  const selectedAmount = useMemo(
    () => calculateSelectedAmount(selectedChainIds),
    [selectedChainIds]
  );

  // Get required amount from widget inputs
  const requiredAmount = widget.inputs.amount
    ? parseFloat(widget.inputs.amount.replace(/,/g, ""))
    : 0;

  // Progress bar calculations
  const showProgressBar = requiredAmount > 0 && requiredAmount > selectedAmount;
  const progressPercent =
    requiredAmount > 0
      ? Math.min((selectedAmount / requiredAmount) * 100, 100)
      : 0;

  // Handle tab/preset change (local state)
  const handlePresetClick = useCallback(
    (preset: "all" | "stablecoins" | "native") => {
      const newChainIds = getChainIdsForFilter(preset);
      setLocalSelectedChainIds(newChainIds);
      setLocalFilter(preset);
    },
    []
  );

  // Toggle token selection (all chains) - local state
  const toggleTokenSelection = useCallback((tokenId: string) => {
    const token = findTokenById(tokenId);
    if (!token) return;

    setLocalSelectedChainIds((prev) => {
      const allChainsSelected = token.chains.every((c) => prev.has(c.id));
      const newChainIds = new Set(prev);

      if (allChainsSelected) {
        token.chains.forEach((chain) => newChainIds.delete(chain.id));
      } else {
        token.chains.forEach((chain) => newChainIds.add(chain.id));
      }

      setLocalFilter(checkIfMatchesPreset(newChainIds));
      return newChainIds;
    });
  }, []);

  // Toggle individual chain selection - local state
  const toggleChainSelection = useCallback((chainId: string) => {
    setLocalSelectedChainIds((prev) => {
      const newChainIds = new Set(prev);

      if (newChainIds.has(chainId)) {
        newChainIds.delete(chainId);
      } else {
        newChainIds.add(chainId);
      }

      setLocalFilter(checkIfMatchesPreset(newChainIds));
      return newChainIds;
    });
  }, []);

  // Toggle expanded state - local state
  const toggleExpanded = useCallback((tokenId: string) => {
    setLocalExpandedTokens((prev) => {
      const newExpanded = new Set(prev);

      if (tokenId === "others-section") {
        // Toggle others section independently
        if (newExpanded.has("others-section")) {
          newExpanded.delete("others-section");
        } else {
          newExpanded.add("others-section");
        }
        return newExpanded;
      } else {
        // For individual tokens, only one can be expanded at a time
        const othersExpanded = newExpanded.has("others-section");
        if (newExpanded.has(tokenId)) {
          return othersExpanded ? new Set(["others-section"]) : new Set();
        } else {
          return othersExpanded
            ? new Set(["others-section", tokenId])
            : new Set([tokenId]);
        }
      }
    });
  }, []);

  // Deselect all - local state
  const handleDeselectAll = useCallback(() => {
    setLocalSelectedChainIds(new Set());
    setLocalFilter("custom");
  }, []);

  // Commit changes to widget state
  const handleDone = useCallback(() => {
    setAssetSelection({
      selectedChainIds: localSelectedChainIds,
      filter: localFilter,
      expandedTokens: localExpandedTokens,
    });
    widget.goToStep("amount");
  }, [
    setAssetSelection,
    localSelectedChainIds,
    localFilter,
    localExpandedTokens,
    widget,
  ]);

  return (
    <>
      <WidgetHeader
        title="Pay using"
        onBack={widget.goBack}
        onClose={onClose}
      />
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Tabs and Deselect all */}
          <div className="flex items-center justify-between">
            <Tabs
              value={filter}
              onValueChange={(value) => {
                if (value !== "custom") {
                  handlePresetClick(value as "all" | "stablecoins" | "native");
                }
              }}
            >
              <TabsList>
                <TabsTrigger value="all">Any token</TabsTrigger>
                <TabsTrigger value="stablecoins">Stablecoins</TabsTrigger>
                <TabsTrigger value="native">Native</TabsTrigger>
                {filter === "custom" && (
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            {filter !== "custom" && (
              <button
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={handleDeselectAll}
              >
                Deselect all
              </button>
            )}
          </div>

          <div className="flex flex-col">
            {/* Scrollable container with fade effect */}
            <div className="relative">
              <div className="w-full overflow-y-auto max-h-[300px] scrollbar-hide">
                {/* Main tokens list */}
                <div className="w-full rounded-lg border overflow-hidden">
                  {sortedTokens.map((token, index) => (
                    <TokenRow
                      key={token.id}
                      token={token}
                      selectedChainIds={selectedChainIds}
                      isExpanded={expandedTokens.has(token.id)}
                      onToggleExpand={() => toggleExpanded(token.id)}
                      onToggleToken={() => toggleTokenSelection(token.id)}
                      onToggleChain={toggleChainSelection}
                      isFirst={index === 0}
                      isLast={index === sortedTokens.length - 1}
                    />
                  ))}
                </div>

                {/* Others section */}
                <div className="w-full bg-base rounded-t-lg border overflow-hidden mt-4">
                  {/* Others section header */}
                  <div
                    className="p-5 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpanded("others-section")}
                  >
                    <span className="font-sans text-sm text-muted-foreground">
                      Others ({MEMECOINS.length})
                    </span>
                    <ChevronDownIcon
                      className={`text-muted-foreground transition-transform duration-200 ${
                        expandedTokens.has("others-section") ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Memecoins list (expanded) */}
                  {expandedTokens.has("others-section") && (
                    <div className="w-full border-t">
                      {MEMECOINS.map((token, index) => (
                        <TokenRow
                          key={token.id}
                          token={token}
                          selectedChainIds={selectedChainIds}
                          isExpanded={expandedTokens.has(token.id)}
                          onToggleExpand={() => toggleExpanded(token.id)}
                          onToggleToken={() => toggleTokenSelection(token.id)}
                          onToggleChain={toggleChainSelection}
                          isFirst={false}
                          isLast={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Fade overlay - light mode */}
              <div
                className="absolute bottom-0 left-[1px] right-[1px] h-12 pointer-events-none dark:hidden"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--background) 100%)",
                }}
              />
              {/* Fade overlay - dark mode */}
              <div
                className="absolute bottom-0 left-[1px] right-[1px] h-12 pointer-events-none hidden dark:block"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, var(--background) 100%)",
                }}
              />
            </div>

            {/* Done button */}
            <Button className="w-full rounded-t-none" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Progress bar overlay */}
      {showProgressBar && (
        <div className="absolute -bottom-6 left-0 right-0 z-20 flex flex-col gap-2 pt-5 pb-8 px-7 bg-base border-t shadow-[0_-11px_12px_0_rgba(91,91,91,0.05)]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Selected / Required
            </span>
            <span className="text-sm">
              <span className="font-semibold text-card-foreground">
                ${selectedAmount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {" "}
                / ${requiredAmount.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AssetSelectionContainer;
