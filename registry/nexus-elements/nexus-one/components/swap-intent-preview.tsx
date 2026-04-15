"use client";
import React, { useState } from "react";
import {
  ArrowRight,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Layers,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "../../ui/button";
import { type SwapTokenOption } from "./swap-asset-selector";

// ---------------------------------------------------------------------------
// Types for intent data from SDK swap intent hook
// ---------------------------------------------------------------------------
export interface SwapIntentSource {
  amount: string;
  chain: { id: number; logo: string; name: string };
  token: { contractAddress: string; decimals: number; symbol: string };
}

export interface SwapIntentDestination {
  amount: string;
  chain: { id: number; logo: string; name: string };
  token: { contractAddress: string; decimals: number; symbol: string };
  gas: {
    amount: string;
    token: { contractAddress: string; decimals: number; symbol: string };
  };
}

export interface SwapIntentData {
  sources: SwapIntentSource[];
  destination: SwapIntentDestination;
}

export interface SwapIntentPreviewProps {
  /** The from tokens selected by user (for logo display) */
  fromTokens?: SwapTokenOption[];
  fromToken?: SwapTokenOption;
  toToken?: SwapTokenOption;
  /** Human-readable amount user entered */
  fromAmount: string;
  /** Total USD value of what user is swapping */
  fromAmountUsd?: string;
  /** Amount user will receive */
  toAmount?: string;
  toAmountUsd?: string;
  toAmountTokens?: string;
  totalFeeUsd?: string;
  estimatedTime?: string;
  isLoading?: boolean;
  /** Actual SDK intent data from setOnSwapIntentHook */
  intentData?: SwapIntentData | null;
  onAccept: () => void;
  onReject: () => void;
}

export function SwapIntentPreview({
  fromTokens,
  fromToken,
  toToken,
  fromAmount,
  fromAmountUsd,
  toAmount,
  toAmountUsd,
  toAmountTokens,
  totalFeeUsd,
  estimatedTime = "~10s",
  isLoading,
  intentData,
  onAccept,
  onReject,
}: SwapIntentPreviewProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Resolve display sources — prefer intent data if available
  const sources =
    fromTokens && fromTokens.length > 0
      ? fromTokens
      : fromToken
        ? [fromToken]
        : [];

  // Use intent sources if available for detail breakdown
  const intentSources = intentData?.sources ?? [];
  const intentDest = intentData?.destination;

  // Compute actual USD values from intent if available
  const displayFromAmountUsd = intentSources.length > 0
    ? intentSources.reduce((sum, s) => sum + Number(s.amount || 0), 0).toFixed(2)
    : (fromAmountUsd || fromAmount);

  const displayToAmountUsd = intentDest
    ? Number(intentDest.amount || 0).toFixed(2)
    : (toAmountUsd || toAmount || "—");

  const displayToAmountTokens = intentDest
    ? `${Number(intentDest.amount || 0).toFixed(4)}`
    : toAmountTokens;

  const displayFeeUsd = (() => {
    if (intentSources.length > 0 && intentDest) {
      const totalIn = intentSources.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      const totalOut = Number(intentDest.amount || 0);
      const fee = totalIn - totalOut;
      return fee > 0 ? fee.toFixed(2) : "0.00";
    }
    return totalFeeUsd || "0.00";
  })();

  // Build summary label like "USDC, ETH +2 more"
  const sourceLabel = (() => {
    if (intentSources.length > 0) {
      const syms = [...new Set(intentSources.map((s) => s.token.symbol))];
      if (syms.length <= 2) return syms.join(", ");
      return `${syms[0]}, ${syms[1]} +${syms.length - 2} more`;
    }
    if (sources.length === 0) return "—";
    const syms = [...new Set(sources.map((s) => s.symbol))];
    if (syms.length <= 2) return syms.join(", ");
    return `${syms[0]}, ${syms[1]} +${syms.length - 2} more`;
  })();

  const hasBreakdown = intentSources.length > 1 || sources.length > 1;
  const destTokenSymbol = intentDest?.token.symbol || toToken?.symbol || "—";

  return (
    <div className="flex flex-col gap-y-4 w-full">
      {/* ------------------------------------------------------------------ */}
      {/* White card: wraps logos + detail rows                              */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid var(--border-default, #E8E8E7)",
          boxShadow: "0px 1px 12px 0px #5B5B5B0D",
          padding: "16px",
        }}
      >
        {/* Token logo visualization + estimated time */}
        <div className="flex flex-col items-center gap-y-2 pb-3">
        <div className="flex items-center gap-x-3">
          {/* Source token logos (tightly stacked, no white border) */}
          <div className="flex items-center">
            {sources.slice(0, 3).map((token, i) => {
              const matchingIntentSrc = intentSources.find(
                 is => (is.token.contractAddress || "").toLowerCase() === (token.contractAddress || "").toLowerCase()
                    && is.chain.id === token.chainId
              );
              let amountStr = "—";
              if (matchingIntentSrc) {
                amountStr = `${Number(matchingIntentSrc.amount || 0).toFixed(4)} ${token.symbol}`;
              } else if (sources.length > 0) {
                const evenlySplitAmt = Number(fromAmount) / sources.length;
                amountStr = `${evenlySplitAmt.toFixed(4)} ${token.symbol}`;
              }

              return (
              <div
                key={`src-${token.contractAddress}-${token.chainId}-${i}`}
                className="relative shrink-0 group/logo cursor-default"
                style={{ marginLeft: i > 0 ? "-12px" : "0", zIndex: 3 - i }}
              >
                {/* When hovered, we force this relative block to bump above its siblings */}
                <div className="group-hover/logo:z-20 relative">
                  {token.logo ? (
                    <img
                      src={token.logo}
                      alt={token.symbol}
                      className="rounded-full object-cover transition-transform group-hover/logo:scale-105"
                      style={{ width: 36, height: 36 }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform group-hover/logo:scale-105"
                      style={{
                        width: 36,
                        height: 36,
                        background:
                          "var(--interactive-button-primary-background, #006BF4)",
                      }}
                    >
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}

                  {/* Tooltip */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover/logo:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center justify-center z-50 text-center"
                    style={{
                      background: "var(--background-inverse, #161615)",
                      boxShadow: "0px 1px 4px 0px #5555550D",
                      minWidth: 94,
                      height: 30,
                      borderRadius: 4,
                      gap: 8,
                      padding: "6px 10px",
                      fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                      fontWeight: 400,
                      fontSize: 14,
                      lineHeight: "18px",
                      color: "var(--foreground-inverse, #F0F0EF)",
                    }}
                  >
                    {amountStr}
                  </div>
                </div>
              </div>
            )})}
          </div>

          {/* Arrow */}
          <ArrowRight
            style={{
              width: 24,
              height: 24,
              color: "var(--foreground-muted, #848483)",
            }}
          />

          {/* Destination token logo */}
          {toToken && (
            <div className="relative shrink-0 group/logo cursor-default z-0 hover:z-20">
              {toToken.logo ? (
                <img
                  src={toToken.logo}
                  alt={toToken.symbol}
                  className="rounded-full object-cover transition-transform group-hover/logo:scale-105"
                  style={{ width: 36, height: 36 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="rounded-full flex items-center justify-center text-xs font-bold text-white transition-transform group-hover/logo:scale-105"
                  style={{
                    width: 36,
                    height: 36,
                    background:
                      "var(--interactive-button-primary-background, #006BF4)",
                  }}
                >
                  {toToken.symbol.slice(0, 2)}
                </div>
              )}

              {/* Tooltip */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover/logo:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center justify-center z-50 text-center"
                style={{
                  background: "var(--background-inverse, #161615)",
                  boxShadow: "0px 1px 4px 0px #5555550D",
                  minWidth: 94,
                  height: 30,
                  borderRadius: 4,
                  gap: 8,
                  padding: "6px 10px",
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: "18px",
                  color: "var(--foreground-inverse, #F0F0EF)",
                }}
              >
                {displayToAmountTokens && displayToAmountTokens !== "—"
                  ? `${displayToAmountTokens} ${destTokenSymbol}`
                  : `— ${destTokenSymbol}`}
              </div>
            </div>
          )}
        </div>

        {/* Estimated time */}
        <div className="flex items-center gap-x-1">
          <span
            style={{
              fontFamily: "Geist, var(--font-geist-sans), sans-serif",
              fontWeight: 400,
              fontSize: "13px",
              lineHeight: "18px",
              color: "var(--widget-card-foreground-muted, #848483)",
            }}
          >
            in about {estimatedTime}
          </span>
          <Clock
            style={{
              width: 16,
              height: 16,
              color: "var(--widget-card-foreground-muted, #848483)",
            }}
          />
        </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Detail rows                                                    */}
        {/* -------------------------------------------------------------- */}
        <div className="flex flex-col gap-y-0">
        {/* You Swap */}
        <div className="flex items-start justify-between px-1 py-3">
          <div className="flex items-start gap-x-2.5">
            <Layers
              className="shrink-0 mt-0.5"
              style={{
                width: 20,
                height: 20,
                color: "var(--foreground-muted, #848483)",
              }}
            />
            <div className="flex flex-col">
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "var(--foreground-primary, #161615)",
                }}
              >
                You Swap
              </span>
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontSize: "13px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {sourceLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span
              style={{
                fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                fontWeight: 500,
                fontSize: "14px",
                color: "var(--foreground-primary, #161615)",
              }}
            >
              {displayFromAmountUsd}{" "}
              <span style={{ fontWeight: 400 }}>USD</span>
            </span>
            {hasBreakdown && (
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="flex items-center gap-x-0.5 hover:opacity-80 transition-opacity"
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontSize: "13px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {showDetails ? "hide details" : "view details"}
                {showDetails ? (
                  <ChevronUp style={{ width: 14, height: 14 }} />
                ) : (
                  <ChevronDown style={{ width: 14, height: 14 }} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Expanded source breakdown — white card, max 200px scrollable */}
        {showDetails && intentSources.length > 0 && (
          <div
            className="ml-7 mb-2 overflow-y-auto"
            style={{
              maxHeight: "200px",
              background: "var(--widget-background, #F9F9F8)",
              borderRadius: "10px",
              padding: "4px 0",
            }}
          >
            {intentSources.map((src, idx) => (
              <div
                key={`intent-src-${idx}`}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="flex items-center gap-x-2">
                  {src.chain.logo ? (
                    <img
                      src={src.chain.logo}
                      alt={src.chain.name}
                      className="rounded-full object-cover"
                      style={{ width: 24, height: 24 }}
                    />
                  ) : (
                    <div
                      className="rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        width: 24,
                        height: 24,
                        background:
                          "var(--interactive-button-primary-background, #006BF4)",
                      }}
                    >
                      {src.token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span
                      style={{
                        fontFamily:
                          "Geist, var(--font-geist-sans), sans-serif",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--foreground-primary, #161615)",
                      }}
                    >
                      {src.token.symbol}
                    </span>
                    <span
                      style={{
                        fontFamily:
                          "Geist, var(--font-geist-sans), sans-serif",
                        fontSize: "12px",
                        color: "var(--foreground-muted, #848483)",
                      }}
                    >
                      {src.chain.name}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    style={{
                      fontFamily:
                        "Geist, var(--font-geist-sans), sans-serif",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--foreground-primary, #161615)",
                    }}
                  >
                    ${Number(src.amount || 0).toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontFamily:
                        "Geist, var(--font-geist-sans), sans-serif",
                      fontSize: "12px",
                      color: "var(--foreground-muted, #848483)",
                    }}
                  >
                    {Number(src.amount || 0).toFixed(4)} {src.token.symbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Separator */}
        <div
          style={{
            height: "1px",
            background: "var(--border-default, #E8E8E7)",
          }}
        />

        {/* Total Fees */}
        <div className="flex items-start justify-between px-1 py-3">
          <div className="flex items-start gap-x-2.5">
            <TrendingDown
              className="shrink-0 mt-0.5"
              style={{
                width: 20,
                height: 20,
                color: "var(--foreground-muted, #848483)",
              }}
            />
            <div className="flex flex-col">
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "var(--foreground-primary, #161615)",
                }}
              >
                Total Fees
              </span>
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontSize: "13px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                Network &amp; protocol
              </span>
            </div>
          </div>
          <span
            style={{
              fontFamily: "Geist, var(--font-geist-sans), sans-serif",
              fontWeight: 500,
              fontSize: "14px",
              color: "var(--red-400, #DC5253)",
            }}
          >
            {isLoading ? "…" : `- ${displayFeeUsd}`}{" "}
            <span style={{ fontWeight: 400 }}>USD</span>
          </span>
        </div>

        {/* Separator */}
        <div
          style={{
            height: "1px",
            background: "var(--border-default, #E8E8E7)",
          }}
        />

        {/* You Receive */}
        <div className="flex items-start justify-between px-1 py-3">
          <div className="flex items-start gap-x-2.5">
            <Wallet
              className="shrink-0 mt-0.5"
              style={{
                width: 20,
                height: 20,
                color: "var(--foreground-muted, #848483)",
              }}
            />
            <div className="flex flex-col">
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "var(--foreground-primary, #161615)",
                }}
              >
                You Receive
              </span>
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontSize: "13px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {destTokenSymbol}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span
              style={{
                fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                fontWeight: 500,
                fontSize: "14px",
                color: "var(--foreground-primary, #161615)",
              }}
            >
              {isLoading ? "…" : displayToAmountUsd}{" "}
              <span style={{ fontWeight: 400 }}>USD</span>
            </span>
            {displayToAmountTokens && (
              <span
                style={{
                  fontFamily: "Geist, var(--font-geist-sans), sans-serif",
                  fontSize: "13px",
                  color: "var(--foreground-muted, #848483)",
                }}
              >
                {displayToAmountTokens}
              </span>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Swap now button                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Button
        onClick={onAccept}
        disabled={isLoading || (!toAmount && !intentDest)}
        className="w-full font-medium text-white transition-opacity hover:opacity-90 active:opacity-100 text-[14px]"
        style={{
          background: "var(--interactive-button-primary-background, #006BF4)",
          boxShadow: "0px 1px 4px 0px #5555550D",
          height: "48px",
          borderRadius: "12px",
        }}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Swap now"}
      </Button>
    </div>
  );
}
