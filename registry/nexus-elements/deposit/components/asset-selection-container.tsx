"use client";

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "./icons";
import WidgetHeader from "./widget-header";
import type {
  DepositWidgetContextValue,
  AssetFilterType,
  Token,
  TokenCategory,
  ChainItem,
} from "../types";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import TokenRow from "./token-row";
import {
  CHAIN_METADATA,
  formatTokenBalance,
  type UserAsset,
} from "@avail-project/nexus-core";
import { usdFormatter } from "../../common";
import { assertCurrentChain } from "viem";

interface AssetSelectionContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

function isStablecoin(symbol: string): boolean {
  return ["USDC", "USDT", "DAI", "TUSD", "USDP"].includes(symbol);
}

function isNative(symbol: string): boolean {
  return Object.values(CHAIN_METADATA).some(
    (chain) => chain.nativeCurrency.symbol === symbol,
  );
}

function transformSwapBalanceToTokens(
  swapBalance: UserAsset[] | null,
): Token[] {
  if (!swapBalance) return [];

  return swapBalance
    .filter((asset) => asset.breakdown && asset.breakdown.length > 0)
    .map((asset) => {
      const chains: ChainItem[] = (asset.breakdown || [])
        .filter((b) => b.chain && b.balance)
        .map((b) => {
          const balanceNum = parseFloat(b.balance);
          return {
            id: `${asset.symbol}-${b.chain.id}`,
            name: b.chain.name,
            usdValue: b.balanceInFiat,
            amount: balanceNum,
          };
        })
        .sort((a, b) => {
          const aVal = a.usdValue;
          const bVal = b.usdValue;
          return bVal - aVal;
        });

      const totalUsdValue = chains.reduce((sum, c) => sum + c.usdValue, 0);

      const totalAmount = chains.reduce((sum, c) => sum + c.amount, 0);

      let category: TokenCategory;
      if (isStablecoin(asset.symbol)) {
        category = "stablecoin";
      } else if (isNative(asset.symbol)) {
        category = "native";
      } else {
        category = "memecoin";
      }

      return {
        id: asset.symbol,
        symbol: asset.symbol,
        chainsLabel: `${chains.length} Chain${chains.length !== 1 ? "s" : ""}`,
        usdValue: usdFormatter.format(totalUsdValue),
        amount: formatTokenBalance(totalAmount, {
          decimals: asset.decimals,
          symbol: asset.symbol,
        }),
        decimals: asset.decimals,
        logo: asset.icon || "",
        category,
        chains,
      };
    });
}

const AssetSelectionContainer = ({
  widget,
  onClose,
}: AssetSelectionContainerProps) => {
  const { assetSelection, setAssetSelection, swapBalance } = widget;

  const [localSelectedChainIds, setLocalSelectedChainIds] = useState<
    Set<string>
  >(() => {
    if (swapBalance) {
      const initial = new Set<string>();
      swapBalance.forEach((asset) => {
        if (asset.breakdown) {
          asset.breakdown.forEach((b) => {
            if (b.chain && b.balance) {
              initial.add(`${asset.symbol}-${b.chain.id}`);
            }
          });
        }
      });
      return initial;
    }
    return new Set<string>();
  });

  const [localFilter, setLocalFilter] = useState<AssetFilterType>(
    assetSelection.filter,
  );
  const [localExpandedTokens, setLocalExpandedTokens] = useState<Set<string>>(
    () => new Set(assetSelection.expandedTokens),
  );
  const [isProgressBarVisible, setIsProgressBarVisible] = useState(false);
  const [isProgressBarEntering, setIsProgressBarEntering] = useState(false);
  const [isProgressBarExiting, setIsProgressBarExiting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedChainIds = localSelectedChainIds;
  const filter = localFilter;
  const expandedTokens = localExpandedTokens;

  const tokens = useMemo(
    () => transformSwapBalanceToTokens(swapBalance),
    [swapBalance],
  );

  console.log("TRANSFORMED TOKENS", tokens);

  const mainTokens = useMemo(
    () =>
      tokens
        .filter((t) => t.category === "stablecoin" || t.category === "native")
        .sort(
          (a, b) =>
            parseFloat(b.usdValue.replace(/[$,]/g, "")) -
            parseFloat(a.usdValue.replace(/[$,]/g, "")),
        ),
    [tokens],
  );

  const otherTokens = useMemo(
    () =>
      tokens
        .filter((t) => t.category === "memecoin")
        .sort(
          (a, b) =>
            parseFloat(b.usdValue.replace(/[$,]/g, "")) -
            parseFloat(a.usdValue.replace(/[$,]/g, "")),
        ),
    [tokens],
  );

  const sortedMainTokens = useMemo(() => {
    if (filter === "custom") {
      return mainTokens;
    }

    const autoSelectedSymbols = ["USDC", "ETH", "SOL"];
    return [...mainTokens].sort((a, b) => {
      const aMatches =
        (filter === "all" && autoSelectedSymbols.includes(a.symbol)) ||
        (filter === "stablecoins" && a.category === "stablecoin") ||
        (filter === "native" && a.symbol === "ETH");

      const bMatches =
        (filter === "all" && autoSelectedSymbols.includes(b.symbol)) ||
        (filter === "stablecoins" && b.category === "stablecoin") ||
        (filter === "native" && b.symbol === "ETH");

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return (
        parseFloat(b.usdValue.replace(/[$,]/g, "")) -
        parseFloat(a.usdValue.replace(/[$,]/g, ""))
      );
    });
  }, [mainTokens, filter]);

  const selectedAmount = useMemo(() => {
    let total = 0;
    tokens.forEach((token) => {
      token.chains.forEach((chain) => {
        if (selectedChainIds.has(chain.id)) {
          total += chain.usdValue;
        }
      });
    });
    return total;
  }, [tokens, selectedChainIds]);

  const requiredAmount = widget.inputs.amount
    ? parseFloat(widget.inputs.amount.replace(/,/g, ""))
    : 0;

  const showProgressBar = requiredAmount > 0 && requiredAmount > selectedAmount;
  const progressPercent =
    requiredAmount > 0
      ? Math.min((selectedAmount / requiredAmount) * 100, 100)
      : 0;

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
      tokens.forEach((token) => {
        const shouldInclude =
          (preset === "all" &&
            (token.symbol === "USDC" || token.symbol === "ETH")) ||
          (preset === "stablecoins" && token.category === "stablecoin") ||
          (preset === "native" && token.symbol === "ETH");

        if (shouldInclude) {
          token.chains.forEach((chain) => newChainIds.add(chain.id));
        }
      });
      setLocalSelectedChainIds(newChainIds);
      setLocalFilter(preset);
    },
    [tokens],
  );

  const toggleTokenSelection = useCallback(
    (tokenId: string) => {
      const token = tokens.find((t) => t.id === tokenId);
      if (!token) return;

      setLocalSelectedChainIds((prev) => {
        const allChainsSelected = token.chains.every((c) => prev.has(c.id));
        const newChainIds = new Set(prev);

        if (allChainsSelected) {
          token.chains.forEach((chain) => newChainIds.delete(chain.id));
        } else {
          token.chains.forEach((chain) => newChainIds.add(chain.id));
        }
        return newChainIds;
      });
    },
    [tokens],
  );

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
      if (tokenId === "others-section") {
        if (newExpanded.has("others-section")) {
          newExpanded.delete("others-section");
        } else {
          newExpanded.add("others-section");
          setTimeout(() => {
            if (scrollContainerRef.current) {
              const currentScrollTop = scrollContainerRef.current.scrollTop;
              scrollContainerRef.current.scrollTo({
                top: currentScrollTop + 70,
                behavior: "smooth",
              });
            }
          }, 100);
        }
        return newExpanded;
      } else {
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
                  {sortedMainTokens.map((token, index) => (
                    <TokenRow
                      key={token.id}
                      token={token}
                      selectedChainIds={selectedChainIds}
                      isExpanded={expandedTokens.has(token.id)}
                      onToggleExpand={() => toggleExpanded(token.id)}
                      onToggleToken={() => toggleTokenSelection(token.id)}
                      onToggleChain={toggleChainSelection}
                      isFirst={index === 0}
                      isLast={index === sortedMainTokens.length - 1}
                    />
                  ))}
                </div>

                {otherTokens.length > 0 && (
                  <div className="w-full bg-base rounded-t-lg border overflow-hidden mt-4">
                    <div
                      className="p-5 flex justify-between items-center cursor-pointer"
                      onClick={() => toggleExpanded("others-section")}
                    >
                      <span className="font-sans text-sm text-muted-foreground">
                        Others ({otherTokens.length})
                      </span>
                      <ChevronDownIcon
                        className={`text-muted-foreground transition-transform duration-200 ${
                          expandedTokens.has("others-section")
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </div>

                    {expandedTokens.has("others-section") && (
                      <div className="w-full border-t">
                        {otherTokens.map((token, index) => (
                          <TokenRow
                            key={token.id}
                            token={token}
                            selectedChainIds={selectedChainIds}
                            isExpanded={expandedTokens.has(token.id)}
                            onToggleExpand={() => toggleExpanded(token.id)}
                            onToggleToken={() => toggleTokenSelection(token.id)}
                            onToggleChain={toggleChainSelection}
                            isFirst={index === 0}
                            isLast={index === otherTokens.length - 1}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
