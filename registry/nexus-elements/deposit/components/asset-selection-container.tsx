"use client";

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  startTransition,
  useDeferredValue,
} from "react";
import { ChevronDownIcon } from "./icons";
import WidgetHeader from "./widget-header";
import type {
  DepositWidgetContextValue,
  Token,
  TokenCategory,
  ChainItem,
} from "../types";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import TokenRow from "./token-row";
import { formatTokenBalance, type UserAsset } from "@avail-project/nexus-core";
import { usdFormatter } from "../../common";
import {
  isStablecoin,
  checkIfMatchesPreset,
  isNative,
} from "../utils/asset-helpers";
import { buildSortedFromSources } from "../utils/source-priority";
import { X } from "lucide-react";
import {
  SCROLL_THRESHOLD_PX,
  PROGRESS_BAR_ANIMATION_DELAY_MS,
  PROGRESS_BAR_EXIT_DURATION_MS,
  MIN_SELECTABLE_SOURCE_BALANCE_USD,
} from "../constants/widget";

interface AssetSelectionContainerProps {
  widget: DepositWidgetContextValue;
  heading?: string;
  onClose?: () => void;
}

interface TokenWithMeta extends Token {
  totalUsdValue: number;
  priorityRank: number;
  isSelectable: boolean;
}

function parseNonNegativeNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function transformSwapBalanceToTokens(
  swapBalance: UserAsset[] | null,
  destination: Pick<
    DepositWidgetContextValue["destination"],
    "chainId" | "tokenAddress" | "tokenSymbol"
  >,
): TokenWithMeta[] {
  if (!swapBalance) return [];

  const allSourceIds = new Set<string>();
  swapBalance.forEach((asset) => {
    asset.breakdown?.forEach((breakdown) => {
      if (!breakdown.chain?.id || !breakdown.contractAddress) return;
      allSourceIds.add(`${breakdown.contractAddress}-${breakdown.chain.id}`);
    });
  });

  const orderedSources = buildSortedFromSources({
    sourceIds: allSourceIds,
    swapBalance,
    destination,
  });

  const sourceOrderIndex = new Map<string, number>();
  orderedSources.forEach((source, index) => {
    sourceOrderIndex.set(
      `${source.tokenAddress.toLowerCase()}-${source.chainId}`,
      index,
    );
  });

  const getSourceOrder = (tokenAddress: string, chainId: number) =>
    sourceOrderIndex.get(`${tokenAddress.toLowerCase()}-${chainId}`) ??
    Number.MAX_SAFE_INTEGER;

  return swapBalance
    .filter((asset) => asset.breakdown && asset.breakdown.length > 0)
    .map((asset) => {
      const chains: ChainItem[] = (asset.breakdown || [])
        .filter((b) => b.chain && b.balance)
        .map((b) => {
          const balanceNum = parseFloat(b.balance);
          const usdValue = parseNonNegativeNumber(b.balanceInFiat);
          return {
            id: `${b.contractAddress}-${b.chain.id}`,
            tokenAddress: b.contractAddress as `0x${string}`,
            chainId: b.chain.id,
            name: b.chain.name,
            usdValue,
            amount: balanceNum,
          };
        })
        .sort((a, b) => {
          const orderDiff =
            getSourceOrder(a.tokenAddress, a.chainId) -
            getSourceOrder(b.tokenAddress, b.chainId);
          if (orderDiff !== 0) return orderDiff;
          return b.usdValue - a.usdValue;
        });

      const totalUsdFromBreakdown = chains.reduce((sum, c) => sum + c.usdValue, 0);
      const totalUsdValue = Math.max(
        parseNonNegativeNumber(asset.balanceInFiat),
        totalUsdFromBreakdown,
      );

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
        chainsLabel:
          chains.length > 1
            ? `${chains.length} Chain${chains.length !== 1 ? "s" : ""}`
            : chains[0].name,
        usdValue: usdFormatter.format(totalUsdValue),
        amount: formatTokenBalance(totalAmount, {
          decimals: asset.decimals,
          symbol: asset.symbol,
        }),
        decimals: asset.decimals,
        logo: asset.icon || "",
        category,
        priorityRank: chains.length
          ? getSourceOrder(chains[0].tokenAddress, chains[0].chainId)
          : Number.MAX_SAFE_INTEGER,
        totalUsdValue,
        isSelectable: totalUsdValue >= MIN_SELECTABLE_SOURCE_BALANCE_USD,
        chains,
      };
    })
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      return b.totalUsdValue - a.totalUsdValue;
    });
}

const AssetSelectionContainer = ({
  widget,
  heading,
  onClose,
}: AssetSelectionContainerProps) => {
  const { assetSelection, setAssetSelection, swapBalance } = widget;

  const [isProgressBarVisible, setIsProgressBarVisible] = useState(false);
  const [isProgressBarEntering, setIsProgressBarEntering] = useState(false);
  const [isProgressBarExiting, setIsProgressBarExiting] = useState(false);
  const [showStickyPopular, setShowStickyPopular] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const popularSectionRef = useRef<HTMLDivElement>(null);

  const selectedChainIds = assetSelection.selectedChainIds;
  const filter = assetSelection.filter;
  const expandedTokens = assetSelection.expandedTokens;
  const destinationForSorting = useMemo(
    () => ({
      chainId: widget.destination.chainId,
      tokenAddress: widget.destination.tokenAddress,
      tokenSymbol: widget.destination.tokenSymbol,
    }),
    [
      widget.destination.chainId,
      widget.destination.tokenAddress,
      widget.destination.tokenSymbol,
    ],
  );

  // Defer expensive token transformation to avoid blocking UI
  const deferredSwapBalance = useDeferredValue(swapBalance);

  const tokens = useMemo(
    () =>
      transformSwapBalanceToTokens(deferredSwapBalance, destinationForSorting),
    [deferredSwapBalance, destinationForSorting],
  );

  const disabledChainIds = useMemo<Set<string>>(() => {
    const disabled = new Set<string>();
    tokens.forEach((token) => {
      if (token.isSelectable) return;
      token.chains.forEach((chain) => {
        disabled.add(chain.id);
      });
    });
    return disabled;
  }, [tokens]);

  const selectableChainIds = useMemo(() => {
    const selectable = new Set<string>();
    tokens.forEach((token) => {
      token.chains.forEach((chain) => {
        if (!disabledChainIds.has(chain.id)) {
          selectable.add(chain.id);
        }
      });
    });
    return selectable;
  }, [tokens, disabledChainIds]);

  const selectableTokens = useMemo(
    () =>
      tokens.map((token) => ({
        ...token,
        chains: token.chains.filter((chain) => !disabledChainIds.has(chain.id)),
      })),
    [tokens, disabledChainIds],
  );

  const sortAndGateSelection = useCallback(
    (chainIds: Iterable<string>) => {
      const eligibleSourceIds = [...new Set(chainIds)].filter(
        (id) => !disabledChainIds.has(id),
      );

      return new Set(
        buildSortedFromSources({
          sourceIds: eligibleSourceIds,
          swapBalance,
          destination: destinationForSorting,
        }).map((source) => `${source.tokenAddress}-${source.chainId}`),
      );
    },
    [swapBalance, destinationForSorting, disabledChainIds],
  );

  // Build index Map for O(1) token lookups (js-index-maps)
  const tokensById = useMemo(
    () => new Map(tokens.map((t) => [t.id, t])),
    [tokens],
  );

  useEffect(() => {
    if (selectedChainIds.size === 0) return;
    const nextSelected = new Set(
      [...selectedChainIds].filter((id) => selectableChainIds.has(id)),
    );
    if (nextSelected.size === selectedChainIds.size) return;

    const nextFilter = checkIfMatchesPreset(selectableTokens, nextSelected);
    setAssetSelection({
      selectedChainIds: sortAndGateSelection(nextSelected),
      filter: nextFilter,
    });
  }, [
    selectedChainIds,
    selectableChainIds,
    selectableTokens,
    setAssetSelection,
    sortAndGateSelection,
  ]);

  const mainTokens = useMemo(
    () =>
      tokens.filter(
        (t) => t.category === "stablecoin" || t.category === "native",
      ),
    [tokens],
  );

  const otherTokens = useMemo(
    () => tokens.filter((t) => t.category === "memecoin"),
    [tokens],
  );

  const selectedAmount = useMemo(() => {
    let total = 0;
    tokens.forEach((token) => {
      token.chains.forEach((chain) => {
        if (selectedChainIds.has(chain.id) && !disabledChainIds.has(chain.id)) {
          total += chain.usdValue;
        }
      });
    });
    return total;
  }, [tokens, selectedChainIds, disabledChainIds]);

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
      }, PROGRESS_BAR_ANIMATION_DELAY_MS);
      return () => clearTimeout(timer);
    } else if (isProgressBarVisible) {
      setIsProgressBarExiting(true);
      const timer = setTimeout(() => {
        setIsProgressBarVisible(false);
        setIsProgressBarExiting(false);
      }, PROGRESS_BAR_EXIT_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [showProgressBar, isProgressBarVisible]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use startTransition for non-urgent scroll updates (rerender-transitions)
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      startTransition(() => {
        setShowStickyPopular(scrollTop > SCROLL_THRESHOLD_PX);
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToPopular = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const handlePresetClick = useCallback(
    (preset: "all" | "stablecoins" | "native") => {
      const newChainIds = new Set<string>();
      tokens.forEach((token) => {
        const shouldInclude =
          preset === "all" ||
          (preset === "stablecoins" && token.category === "stablecoin") ||
          (preset === "native" && token.category === "native");

        if (shouldInclude) {
          token.chains.forEach((chain) => {
            if (!disabledChainIds.has(chain.id)) {
              newChainIds.add(chain.id);
            }
          });
        }
      });
      setAssetSelection({
        selectedChainIds: sortAndGateSelection(newChainIds),
        filter: preset,
      });
    },
    [tokens, setAssetSelection, disabledChainIds, sortAndGateSelection],
  );

  const toggleTokenSelection = useCallback(
    (tokenId: string) => {
      const token = tokensById.get(tokenId); // O(1) lookup instead of O(n)
      if (!token) return;

      const selectableChains = token.chains.filter(
        (chain) => !disabledChainIds.has(chain.id),
      );
      if (selectableChains.length === 0) return;

      const allChainsSelected = selectableChains.every((c) =>
        selectedChainIds.has(c.id),
      );
      const newChainIds = new Set(selectedChainIds);

      if (allChainsSelected) {
        selectableChains.forEach((chain) => newChainIds.delete(chain.id));
      } else {
        selectableChains.forEach((chain) => newChainIds.add(chain.id));
      }

      const newFilter = checkIfMatchesPreset(selectableTokens, newChainIds);
      setAssetSelection({
        selectedChainIds: sortAndGateSelection(newChainIds),
        filter: newFilter,
      });
    },
    [
      selectableTokens,
      tokensById,
      selectedChainIds,
      setAssetSelection,
      disabledChainIds,
      sortAndGateSelection,
    ],
  );

  const toggleChainSelection = useCallback(
    (chainId: string) => {
      if (disabledChainIds.has(chainId)) return;

      const newChainIds = new Set(selectedChainIds);
      if (newChainIds.has(chainId)) {
        newChainIds.delete(chainId);
      } else {
        newChainIds.add(chainId);
      }

      const newFilter = checkIfMatchesPreset(selectableTokens, newChainIds);
      setAssetSelection({
        selectedChainIds: sortAndGateSelection(newChainIds),
        filter: newFilter,
      });
    },
    [
      disabledChainIds,
      selectableTokens,
      selectedChainIds,
      setAssetSelection,
      sortAndGateSelection,
    ],
  );

  const toggleExpanded = useCallback(
    (tokenId: string) => {
      let newExpanded = new Set(expandedTokens);
      if (tokenId === "others-section") {
        if (newExpanded.has("others-section")) {
          newExpanded.delete("others-section");
        } else {
          newExpanded = new Set(newExpanded);
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
      } else {
        const othersExpanded = newExpanded.has("others-section");
        if (newExpanded.has(tokenId)) {
          newExpanded = othersExpanded
            ? new Set(["others-section"])
            : new Set();
        } else {
          newExpanded = othersExpanded
            ? new Set(["others-section", tokenId])
            : new Set([tokenId]);
        }
      }
      setAssetSelection({ expandedTokens: newExpanded });
    },
    [expandedTokens, setAssetSelection],
  );

  const handleDeselectAll = useCallback(() => {
    setAssetSelection({
      selectedChainIds: new Set(),
      filter: "custom",
    });
  }, [setAssetSelection]);

  const handleDone = useCallback(() => {
    widget.goToStep("amount");
  }, [widget]);

  return (
    <>
      <WidgetHeader
        title={heading ?? ""}
        onBack={widget.goBack}
        onClose={onClose}
        depositTargetLogo={widget?.destination?.depositTargetLogo}
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
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={handleDeselectAll}
            >
              {filter === "custom" ? <X className="size-4" /> : "Deselect all"}
            </button>
          </div>

          <div className="flex flex-col">
            <div className="relative">
              {showStickyPopular && mainTokens.length > 0 && (
                <button
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer border border-primary/10 px-2 py-1 bg-background"
                  onClick={scrollToPopular}
                >
                  Popular
                </button>
              )}
              <div
                ref={scrollContainerRef}
                className="w-full overflow-y-auto max-h-75 scrollbar-hide"
              >
                {mainTokens.length > 0 && (
                  <div
                    ref={popularSectionRef}
                    className="w-full rounded-lg border overflow-hidden"
                  >
                    <div className="px-5 py-2 bg-muted/30 border-b">
                      <span className="font-sans text-xs font-medium text-muted-foreground">
                        Popular
                      </span>
                    </div>
                    {mainTokens.map((token, index) => (
                      <TokenRow
                        key={token.id}
                        token={token}
                        disabledChainIds={disabledChainIds}
                        selectedChainIds={selectedChainIds}
                        isExpanded={expandedTokens.has(token.id)}
                        onToggleExpand={() => toggleExpanded(token.id)}
                        onToggleToken={() => toggleTokenSelection(token.id)}
                        onToggleChain={toggleChainSelection}
                        isFirst={false}
                        isLast={index === mainTokens.length - 1}
                      />
                    ))}
                  </div>
                )}

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
                        {disabledChainIds.size > 0 && (
                          <div className="px-5 py-4 border-b bg-muted/20">
                            <span className="font-sans text-[13px] leading-5 text-muted-foreground">
                              A minimum total token balance of $
                              {MIN_SELECTABLE_SOURCE_BALANCE_USD.toFixed(2)} is
                              required for a token to be selectable.
                            </span>
                          </div>
                        )}
                        {otherTokens.map((token, index) => (
                          <TokenRow
                            key={token.id}
                            token={token}
                            disabledChainIds={disabledChainIds}
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
          className={`absolute -bottom-6 left-0 right-0 z-20 flex flex-col gap-2 pt-5 pb-8 px-7 bg-card border-t shadow-[0_-11px_12px_0_rgba(91,91,91,0.05)] transform transition-transform duration-300 ease-out ${
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
