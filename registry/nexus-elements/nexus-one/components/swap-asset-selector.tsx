"use client";
import React, { useMemo, useState } from "react";
import { Search, X, ChevronLeft, Loader2 } from "lucide-react";
import {
  type UserAsset,
  CHAIN_METADATA,
  formatTokenBalance,
} from "@avail-project/nexus-core";

export interface SwapTokenOption {
  contractAddress: string;
  symbol: string;
  name: string;
  logo?: string;
  decimals: number;
  balance: string;
  balanceInFiat: string;
  chainId?: number;
  chainName?: string;
  chainLogo?: string;
}

interface SwapAssetSelectorProps {
  /** Title shown in the panel header */
  title: string;
  /** swapBalance from useNexus for source tokens. Pass null to show loader. */
  swapBalance: UserAsset[] | null;
  /** For dest-mode we accept a static list instead */
  staticOptions?: SwapTokenOption[];
  onSelect: (token: SwapTokenOption) => void;
  onBack: () => void;
}

/** Derive flat list of SwapTokenOption from UserAsset[] */
function deriveTokenOptions(swapBalance: UserAsset[]): SwapTokenOption[] {
  const tokens: SwapTokenOption[] = [];
  for (const asset of swapBalance) {
    for (const bd of asset.breakdown ?? []) {
      if (Number.parseFloat(bd.balance ?? "0") <= 0) continue;
      const chainMeta = bd.chain?.id ? CHAIN_METADATA[bd.chain.id] : undefined;
      tokens.push({
        contractAddress: bd.contractAddress,
        symbol: bd.symbol ?? asset.symbol,
        name: bd.symbol ?? asset.symbol,
        logo: asset.icon ?? "",
        decimals: bd.decimals ?? asset.decimals ?? 18,
        balance: formatTokenBalance(bd.balance, {
          symbol: bd.symbol ?? asset.symbol,
          decimals: bd.decimals ?? asset.decimals ?? 18,
        }) ?? bd.balance,
        balanceInFiat: bd.balanceInFiat != null ? `$${Number(bd.balanceInFiat).toFixed(2)}` : "$0.00",
        chainId: bd.chain?.id,
        chainName: chainMeta?.name ?? bd.chain?.name,
        chainLogo: chainMeta?.logo ?? bd.chain?.logo,
      });
    }
  }
  // Dedupe by contractAddress + chainId
  const seen = new Map<string, SwapTokenOption>();
  for (const t of tokens) {
    seen.set(`${t.contractAddress.toLowerCase()}-${t.chainId}`, t);
  }
  return Array.from(seen.values());
}

export function SwapAssetSelector({
  title,
  swapBalance,
  staticOptions,
  onSelect,
  onBack,
}: SwapAssetSelectorProps) {
  const [query, setQuery] = useState("");

  const allTokens = useMemo<SwapTokenOption[]>(() => {
    if (staticOptions) return staticOptions;
    if (!swapBalance) return [];
    return deriveTokenOptions(swapBalance);
  }, [swapBalance, staticOptions]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allTokens;
    const q = query.toLowerCase();
    return allTokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.chainName ?? "").toLowerCase().includes(q)
    );
  }, [allTokens, query]);

  const isLoading = !staticOptions && swapBalance === null;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Panel header */}
      <div
        className="flex items-center gap-x-3 px-4 pb-3 pt-1"
        style={{ borderBottom: "1px solid var(--border-default, #E8E8E7)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/5 transition-colors shrink-0"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontWeight: 600,
            fontSize: "14px",
            color: "var(--foreground-primary, #161615)",
          }}
        >
          {title}
        </span>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-x-2 px-3"
          style={{
            background: "var(--background-tertiary, #F0F0EF)",
            borderRadius: "10px",
            height: "38px",
          }}
        >
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400"
            style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="shrink-0">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-y-3">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <p className="text-sm text-gray-400">Loading assets…</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-center text-gray-400 py-8">No tokens found</p>
        ) : (
          filtered.map((token) => (
            <button
              key={`${token.contractAddress}-${token.chainId}`}
              onClick={() => onSelect(token)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-black/5 transition-colors group"
            >
              <div className="flex items-center gap-x-3">
                {/* Token + Chain Icon stack */}
                <div className="relative shrink-0">
                  {token.logo ? (
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="w-9 h-9 rounded-full border border-white shadow-sm object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: "var(--interactive-button-primary-background, #006BF4)" }}
                    >
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  {token.chainLogo && (
                    <img
                      src={token.chainLogo}
                      alt={token.chainName}
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-white shadow-sm object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans), sans-serif",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "var(--foreground-primary, #161615)",
                    }}
                  >
                    {token.symbol}
                  </span>
                  {token.chainName && (
                    <span
                      style={{
                        fontFamily: "var(--font-geist-sans), sans-serif",
                        fontSize: "12px",
                        color: "var(--foreground-muted, #848483)",
                      }}
                    >
                      {token.chainName}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span
                  style={{
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    fontWeight: 500,
                    fontSize: "13px",
                    color: "var(--foreground-primary, #161615)",
                  }}
                >
                  {token.balance}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-sans), sans-serif",
                    fontSize: "12px",
                    color: "var(--foreground-muted, #848483)",
                  }}
                >
                  {token.balanceInFiat}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
