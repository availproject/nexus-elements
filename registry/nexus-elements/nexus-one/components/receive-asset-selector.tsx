"use client";
import React, { useState, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { type SwapTokenOption } from "./swap-asset-selector";

interface ReceiveAssetSelectorProps {
  onSelect: (token: SwapTokenOption) => void;
  onBack: () => void;
}

const TOKEN_LIST = [
  {
    symbol: "USDC",
    name: "USDC",
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/tokens/usdc/logo.png",
    chains: [
      "Ethereum",
      "Arbitrum",
      "Base",
      "OP Mainnet",
      "Polygon",
      "Monad",
      "Kaia",
      "Citrea",
      "Avalanche",
      "Scroll",
    ],
  },
  {
    symbol: "USDT",
    name: "USDT",
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/tokens/usdt/logo.png",
    chains: [
      "Ethereum",
      "Arbitrum",
      "Base",
      "OP Mainnet",
      "Polygon",
      "Monad",
      "Kaia",
      "Citrea",
      "Avalanche",
      "Scroll",
      "MegaETH"
    ],
  },
  {
    symbol: "USDM",
    name: "USDM",
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/tokens/usdm/logo.png",
    chains: ["MegaETH"],
  },
  {
    symbol: "ETH",
    name: "ETH",
    logo: "https://raw.githubusercontent.com/availproject/nexus-assets/main/tokens/eth/logo.png",
    chains: ["Ethereum", "Scroll", "Base", "Arbitrum", "OP Mainnet"],
  },
];

const CHAIN_LOGOS: Record<string, string> = {
  "Ethereum": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/ethereum/logo.png",
  "Arbitrum": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/arbitrum/logo.png",
  "Base": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/base/logo.png",
  "OP Mainnet": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/optimism/logo.png",
  "Polygon": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/polygon/logo.png",
  "Monad": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/monad/logo.png",
  "Kaia": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/kaia/logo.png",
  "Citrea": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/citrea/logo.png",
  "Avalanche": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/avalanche/logo.png",
  "Scroll": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/scroll/logo.png",
  "MegaETH": "https://raw.githubusercontent.com/availproject/nexus-assets/main/chains/megaeth/logo.png",
};

export function ReceiveAssetSelector({
  onSelect,
  onBack,
}: ReceiveAssetSelectorProps) {
  const [query, setQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<typeof TOKEN_LIST[0] | null>(null);

  const filteredTokens = useMemo(() => {
    if (!query.trim()) return TOKEN_LIST;
    const q = query.toLowerCase();
    return TOKEN_LIST.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q)
    );
  }, [query]);

  const handleChainSelect = (chainName: string) => {
    if (!selectedToken) return;
    // Construct minimal required SwapTokenOption payload just to maintain UI structure
    onSelect({
      contractAddress: "0xMockAddress",
      symbol: selectedToken.symbol,
      name: selectedToken.name,
      logo: selectedToken.logo,
      decimals: 18,
      balance: "0",
      balanceInFiat: "$0.00",
      chainId: 1, // Mock chainId as required type
      chainName: chainName,
      chainLogo: CHAIN_LOGOS[chainName],
    });
  };

  return (
    <div className="flex flex-col h-full w-full antialiased bg-transparent">
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 bg-transparent flex flex-col gap-4">
        {/* Search */}
        <div
          className="flex items-center px-4 w-full"
          style={{
            height: "44px",
            gap: "12px",
            borderRadius: "12px",
            borderWidth: "1px",
            background: "var(--background-tertiary, #F0F0EF)",
            borderColor: "transparent",
          }}
        >
          <Search
            className="shrink-0"
            style={{ width: "20px", height: "20px", color: "var(--foreground-muted, #848483)" }}
          />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[14px]"
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              color: "var(--widget-card-foreground-primary, #161615)",
            }}
          />
        </div>

        {/* Tokens List Container */}
        <div
          style={{
            border: "1px solid var(--widget-card-border, #E8E8E7)",
            borderRadius: "8px",
            background: "var(--widget-card-background-primary, #FFFFFE)",
            overflow: "hidden",
          }}
          className="flex flex-col divide-y divide-[#E8E8E7]"
        >
          {filteredTokens.length === 0 ? (
            <p className="text-sm text-center text-gray-400 py-8">No tokens found</p>
          ) : (
            filteredTokens.map((token) => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition-colors group"
              >
                <div className="flex items-center gap-x-3">
                  <div className="relative shrink-0">
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="w-9 h-9 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
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
                </div>
                <div className="text-gray-400 shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 z-40 ${
          selectedToken ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`} 
        onClick={() => setSelectedToken(null)}
      />

      {/* Slide-up Chain Modal */}
      <div
        className={`absolute inset-x-0 bottom-0 rounded-t-2xl flex flex-col transition-transform duration-300 ease-in-out z-50 ${
          selectedToken ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ 
          height: "calc(100% - 24px)", 
          background: "var(--widget-background, #F9F9F8)",
          boxShadow: "0px 1px 12px 0px #5B5B5B0D"
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "16px",
              fontWeight: 500,
              color: "var(--foreground-primary, #161615)",
            }}
          >
            Select a Chain
          </span>
          <button
            onClick={() => setSelectedToken(null)}
            className="p-1 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div
            style={{
              border: "1px solid var(--widget-card-border, #E8E8E7)",
              borderRadius: "8px",
              background: "var(--widget-card-background-primary, #FFFFFE)",
              overflow: "hidden",
            }}
            className="flex flex-col divide-y divide-[#E8E8E7]"
          >
            {selectedToken?.chains.map((chainName) => (
              <button
                key={chainName}
                onClick={() => handleChainSelect(chainName)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 transition-colors"
              >
                <div className="flex items-center gap-x-3">
                  <div className="relative shrink-0 w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden bg-white">
                    {CHAIN_LOGOS[chainName] ? (
                      <img
                        src={CHAIN_LOGOS[chainName]}
                        alt={chainName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-xs font-medium text-gray-500">
                        {chainName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-sans), sans-serif",
                      fontWeight: 500,
                      fontSize: "15px",
                      color: "var(--foreground-primary, #161615)",
                    }}
                  >
                    {chainName === "Ethereum" ? "Mainnet" : chainName}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
