"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "./icons";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue, AssetFilterType } from "../types";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { CardContent } from "../../ui/card";
import { Button } from "../../ui/button";

interface AssetSelectionContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

interface TokenListItem {
  id: string;
  symbol: string;
  logo?: string;
  totalBalance: string;
  totalBalanceUsd: number;
  chains: Array<{
    id: number;
    name: string;
    logo?: string;
    balance: string;
    balanceUsd?: number;
    contractAddress: string;
  }>;
}

const AssetSelectionContainer = ({
  widget,
  onClose,
}: AssetSelectionContainerProps) => {
  const { assetSelection, setAssetSelection, swapBalance } = widget;

  const [localSelectedChainIds, setLocalSelectedChainIds] = useState<
    Set<string>
  >(() => new Set(assetSelection.selectedChainIds));
  const [localFilter, setLocalFilter] = useState<AssetFilterType>(
    assetSelection.filter,
  );
  const [localExpandedTokens, setLocalExpandedTokens] = useState<Set<string>>(
    () => new Set(assetSelection.expandedTokens),
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedChainIds = localSelectedChainIds;
  const filter = localFilter;
  const expandedTokens = localExpandedTokens;

  const tokensFromBalance = useMemo((): TokenListItem[] => {
    if (!swapBalance) return [];

    return swapBalance
      .filter((asset) => asset.breakdown && asset.breakdown.length > 0)
      .map((asset) => {
        const chains = asset.breakdown
          ?.filter((b) => b.chain && b.balance)
          .map((b) => ({
            id: b.chain.id,
            name: b.chain.name,
            logo: b.chain.logo,
            balance: b.balance,
            balanceUsd: b.balanceInFiat,
            contractAddress: b.contractAddress || "",
          }))
          .sort((a, b) => (b.balanceUsd ?? 0) - (a.balanceUsd ?? 0)) ?? [];

        const totalBalanceUsd = chains.reduce(
          (sum, c) => sum + (c.balanceUsd ?? 0),
          0,
        );

        return {
          id: asset.symbol,
          symbol: asset.symbol,
          logo: asset.icon,
          totalBalance: chains
            .map((c) => `${c.balance} ${asset.symbol}`)
            .join(", "),
          totalBalanceUsd,
          chains,
        };
      })
      .sort((a, b) => b.totalBalanceUsd - a.totalBalanceUsd);
  }, [swapBalance]);

  const selectedAmount = useMemo(() => {
    let total = 0;
    tokensFromBalance.forEach((token) => {
      token.chains.forEach((chain) => {
        if (selectedChainIds.has(`${token.symbol}-${chain.id}`)) {
          total += chain.balanceUsd ?? 0;
        }
      });
    });
    return total;
  }, [tokensFromBalance, selectedChainIds]);

  const requiredAmount = widget.inputs.amount
    ? parseFloat(widget.inputs.amount.replace(/,/g, ""))
    : 0;

  const showProgressBar =
    requiredAmount > 0 && requiredAmount > selectedAmount;
  const progressPercent =
    requiredAmount > 0
      ? Math.min((selectedAmount / requiredAmount) * 100, 100)
      : 0;

  const [isProgressBarVisible, setIsProgressBarVisible] = useState(false);
  const [isProgressBarEntering, setIsProgressBarEntering] = useState(false);
  const [isProgressBarExiting, setIsProgressBarExiting] = useState(false);

  useEffect(() => {
    if (showProgressBar) {
      setIsProgressBarVisible(true);
      setIsProgressBarExiting(false);
      setIsProgressBarEntering(true);
      const timer = setTimeout(() => {
        setIsProgressBarEntering(false);
      }, 50);
      return () => clearTimeout(timer);
    } else if (isProgressBarVisible) {
      setIsProgressBarExiting(true);
      const timer = setTimeout(() => {
        setIsProgressBarVisible(false);
        setIsProgressBarExiting(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showProgressBar, isProgressBarVisible]);

  const handlePresetClick = useCallback(
    (preset: "all" | "stablecoins" | "native") => {
      const newChainIds = new Set<string>();
      tokensFromBalance.forEach((token) => {
        const isStablecoin = ["USDC", "USDT", "DAI"].includes(token.symbol);
        const isNative = token.symbol === "ETH";

        token.chains.forEach((chain) => {
          if (preset === "all") {
            newChainIds.add(`${token.symbol}-${chain.id}`);
          } else if (preset === "stablecoins" && isStablecoin) {
            newChainIds.add(`${token.symbol}-${chain.id}`);
          } else if (preset === "native" && isNative) {
            newChainIds.add(`${token.symbol}-${chain.id}`);
          }
        });
      });
      setLocalSelectedChainIds(newChainIds);
      setLocalFilter(preset);
    },
    [tokensFromBalance],
  );

  const toggleTokenSelection = useCallback((tokenId: string) => {
    const token = tokensFromBalance.find((t) => t.id === tokenId);
    if (!token) return;

    setLocalSelectedChainIds((prev) => {
      const allChainsSelected = token.chains.every((c) =>
        prev.has(`${token.id}-${c.id}`),
      );
      const newChainIds = new Set(prev);

      if (allChainsSelected) {
        token.chains.forEach((chain) =>
          newChainIds.delete(`${token.id}-${chain.id}`),
        );
      } else {
        token.chains.forEach((chain) =>
          newChainIds.add(`${token.id}-${chain.id}`),
        );
      }
      return newChainIds;
    });
  }, [tokensFromBalance]);

  const toggleChainSelection = useCallback(
    (tokenId: string, chainId: number) => {
      const key = `${tokenId}-${chainId}`;
      setLocalSelectedChainIds((prev) => {
        const newChainIds = new Set(prev);
        if (newChainIds.has(key)) {
          newChainIds.delete(key);
        } else {
          newChainIds.add(key);
        }
        return newChainIds;
      });
    },
    [],
  );

  const toggleExpanded = useCallback((tokenId: string) => {
    setLocalExpandedTokens((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(tokenId)) {
        newExpanded.delete(tokenId);
      } else {
        newExpanded.add(tokenId);
      }
      return newExpanded;
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setLocalSelectedChainIds(new Set());
    setLocalFilter("custom");
  }, []);

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

  const isChainSelected = useCallback(
    (tokenId: string, chainId: number) => {
      return selectedChainIds.has(`${tokenId}-${chainId}`);
    },
    [selectedChainIds],
  );

  const getCheckState = useCallback(
    (token: TokenListItem) => {
      const selectedCount = token.chains.filter((c) =>
        selectedChainIds.has(`${token.id}-${c.id}`),
      ).length;
      if (selectedCount === 0) return false;
      if (selectedCount === token.chains.length) return true;
      return "indeterminate";
    },
    [selectedChainIds],
  );

  return (
    <>
      <WidgetHeader
        title="Pay using"
        onBack={widget.goBack}
        onClose={onClose}
      />
      <CardContent>
        <div className="flex flex-col gap-4">
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
            <div className="relative">
              <div
                ref={scrollContainerRef}
                className="w-full overflow-y-auto max-h-[300px] scrollbar-hide"
              >
                <div className="w-full rounded-lg border overflow-hidden">
                  {tokensFromBalance.map((token, index) => {
                    const checkState = getCheckState(token);
                    const isExpanded = expandedTokens.has(token.id);
                    const isLast = index === tokensFromBalance.length - 1;

                    return (
                      <div key={token.id}>
                        <div
                          className={`p-4 flex items-center gap-3 cursor-pointer ${
                            !isLast ? "border-b" : ""
                          }`}
                          onClick={() => toggleExpanded(token.id)}
                        >
                          <div
                            className="h-5 w-5 flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTokenSelection(token.id);
                            }}
                          >
                            {checkState === true && (
                              <svg
                                className="w-4 h-4 text-primary"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {checkState === false && (
                              <div className="w-4 h-4 border-2 border-muted-foreground rounded-sm" />
                            )}
                            {checkState === "indeterminate" && (
                              <svg
                                className="w-4 h-4 text-primary"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          {token.logo && (
                            <img
                              src={token.logo}
                              alt={token.symbol}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              ${token.totalBalanceUsd.toFixed(2)}
                            </div>
                          </div>
                          <ChevronDownIcon
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>

                        {isExpanded && (
                          <div className="bg-muted/30">
                            {token.chains.map((chain) => {
                              const isSelected = isChainSelected(
                                token.id,
                                chain.id,
                              );
                              return (
                                <div
                                  key={chain.id}
                                  className="pl-14 pr-4 py-3 flex items-center gap-3 border-t first:border-t-0"
                                  onClick={() =>
                                    toggleChainSelection(token.id, chain.id)
                                  }
                                >
                                  <div
                                    className={`h-4 w-4 border-2 rounded-full flex items-center justify-center ${
                                      isSelected
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground"
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="w-2 h-2 bg-background rounded-full" />
                                    )}
                                  </div>
                                  {chain.logo && (
                                    <img
                                      src={chain.logo}
                                      alt={chain.name}
                                      className="w-5 h-5 rounded-full"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <div className="text-sm">{chain.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {chain.balance}{" "}
                                      {token.symbol === chain.balance
                                        ? ""
                                        : token.symbol}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {!showProgressBar && (
                <div
                  className="absolute bottom-0 left-px right-px h-12 pointer-events-none dark:hidden"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--background) 100%)",
                  }}
                />
              )}
              {!showProgressBar && (
                <div
                  className="absolute bottom-0 left-px right-px h-12 pointer-events-none hidden dark:block"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, var(--background) 100%)",
                  }}
                />
              )}
            </div>

            <Button className="w-full rounded-t-none" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </CardContent>

      {isProgressBarVisible && (
        <div
          className={`absolute -bottom-6 left-0 right-0 z-20 flex flex-col gap-2 pt-5 pb-8 px-7 bg-base border-t shadow-[0_-11px_12px_0_rgba(91,91,91,0.05)] transform transition-transform duration-300 ease-out ${
            isProgressBarEntering || isProgressBarExiting
              ? "translate-y-full"
              : "translate-y-0"
          }`}
        >
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
