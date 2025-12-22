"use client";

import { useMemo, useCallback } from "react";
import { CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { ChevronDownIcon } from "./icons";
import WidgetHeader from "./widget-header";
import TokenRow from "./token-row";
import type { DepositWidgetContextValue } from "../types";
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
  const { selectedChainIds, filter, expandedTokens } = assetSelection;

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

  // Handle tab/preset change
  const handlePresetClick = useCallback(
    (preset: "all" | "stablecoins" | "native") => {
      const newChainIds = getChainIdsForFilter(preset);
      setAssetSelection({
        selectedChainIds: newChainIds,
        filter: preset,
      });
    },
    [setAssetSelection]
  );

  // Toggle token selection (all chains)
  const toggleTokenSelection = useCallback(
    (tokenId: string) => {
      const token = findTokenById(tokenId);
      if (!token) return;

      const allChainsSelected = token.chains.every((c) =>
        selectedChainIds.has(c.id)
      );

      const newChainIds = new Set(selectedChainIds);

      if (allChainsSelected) {
        token.chains.forEach((chain) => newChainIds.delete(chain.id));
      } else {
        token.chains.forEach((chain) => newChainIds.add(chain.id));
      }

      setAssetSelection({
        selectedChainIds: newChainIds,
        filter: checkIfMatchesPreset(newChainIds),
      });
    },
    [selectedChainIds, setAssetSelection]
  );

  // Toggle individual chain selection
  const toggleChainSelection = useCallback(
    (chainId: string) => {
      const newChainIds = new Set(selectedChainIds);

      if (newChainIds.has(chainId)) {
        newChainIds.delete(chainId);
      } else {
        newChainIds.add(chainId);
      }

      setAssetSelection({
        selectedChainIds: newChainIds,
        filter: checkIfMatchesPreset(newChainIds),
      });
    },
    [selectedChainIds, setAssetSelection]
  );

  // Toggle expanded state
  const toggleExpanded = useCallback(
    (tokenId: string) => {
      const newExpanded = new Set(expandedTokens);

      if (tokenId === "others-section") {
        // Toggle others section independently
        if (newExpanded.has("others-section")) {
          newExpanded.delete("others-section");
        } else {
          newExpanded.add("others-section");
        }
        setAssetSelection({ expandedTokens: newExpanded });
      } else {
        // For individual tokens, only one can be expanded at a time
        const othersExpanded = newExpanded.has("others-section");
        if (newExpanded.has(tokenId)) {
          setAssetSelection({
            expandedTokens: othersExpanded
              ? new Set(["others-section"])
              : new Set(),
          });
        } else {
          setAssetSelection({
            expandedTokens: othersExpanded
              ? new Set(["others-section", tokenId])
              : new Set([tokenId]),
          });
        }
      }
    },
    [expandedTokens, setAssetSelection]
  );

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setAssetSelection({
      selectedChainIds: new Set(),
      filter: "custom",
    });
  }, [setAssetSelection]);

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
                <TabsTrigger value="all">All tokens</TabsTrigger>
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
            {/* Scrollable container */}
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

            {/* Done button */}
            <Button
              className="w-full rounded-t-none"
              onClick={() => widget.goToStep("amount")}
            >
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
