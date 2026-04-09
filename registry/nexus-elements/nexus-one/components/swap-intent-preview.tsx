"use client";
import React from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { type SwapTokenOption } from "./swap-asset-selector";

export interface SwapIntentPreviewProps {
  fromToken?: SwapTokenOption;
  toToken?: SwapTokenOption;
  fromAmount: string;
  toAmount?: string;
  totalFeeUsd?: string;
  isLoading?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function TokenAmountRow({
  label,
  token,
  amount,
  amountUsd,
}: {
  label: string;
  token?: SwapTokenOption;
  amount: string;
  amountUsd?: string;
}) {
  return (
    <div
      className="w-full flex items-center justify-between px-4 py-3"
      style={{
        background: "var(--background-secondary, #F5F5F4)",
        borderRadius: "12px",
      }}
    >
      <div className="flex flex-col gap-y-0.5">
        <span
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "12px",
            fontWeight: 400,
            color: "var(--foreground-muted, #848483)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--foreground-primary, #161615)",
            lineHeight: "1.2",
          }}
        >
          {amount} {token?.symbol ?? "—"}
        </span>
        {amountUsd && (
          <span
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "12px",
              fontWeight: 400,
              color: "var(--foreground-muted, #848483)",
            }}
          >
            ≈ {amountUsd}
          </span>
        )}
      </div>

      {/* Token icon stack */}
      {token && (
        <div className="relative shrink-0">
          {token.logo ? (
            <img
              src={token.logo}
              alt={token.symbol}
              className="w-10 h-10 rounded-full border-2 border-white shadow object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "var(--interactive-button-primary-background, #006BF4)" }}
            >
              {token.symbol.slice(0, 2)}
            </div>
          )}
          {token.chainLogo && (
            <img
              src={token.chainLogo}
              alt={token.chainName}
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-white shadow object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function SwapIntentPreview({
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  totalFeeUsd,
  isLoading,
  onAccept,
  onReject,
}: SwapIntentPreviewProps) {
  return (
    <div className="flex flex-col gap-y-3 w-full">
      {/* You Swap */}
      <TokenAmountRow
        label="You Swap"
        token={fromToken}
        amount={fromAmount || "0"}
      />

      {/* Arrow */}
      <div className="flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "var(--background-tertiary, #F0F0EF)",
            border: "1px solid var(--border-default, #E8E8E7)",
          }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <ArrowDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </div>

      {/* You Receive */}
      <TokenAmountRow
        label="You Receive"
        token={toToken}
        amount={isLoading ? "Calculating…" : (toAmount || "—")}
      />

      {/* Total Fees */}
      {(totalFeeUsd || isLoading) && (
        <div
          className="w-full flex items-center justify-between px-4 py-2.5"
          style={{
            background: "var(--background-secondary, #F5F5F4)",
            borderRadius: "10px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "13px",
              color: "var(--foreground-muted, #848483)",
            }}
          >
            Total Fees
          </span>
          <span
            style={{
              fontFamily: "var(--font-geist-sans), sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--foreground-primary, #161615)",
            }}
          >
            {isLoading ? "…" : totalFeeUsd}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-x-3 pt-1">
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center transition-colors hover:bg-red-50"
          style={{
            height: "44px",
            borderRadius: "12px",
            border: "1px solid var(--border-default, #E8E8E7)",
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "#D32F2F",
          }}
        >
          Reject
        </button>
        <Button
          onClick={onAccept}
          disabled={isLoading || !toAmount}
          className="flex-1 font-medium text-white transition-opacity hover:opacity-90 active:opacity-100 text-[14px]"
          style={{
            background: "var(--interactive-button-primary-background, #006BF4)",
            boxShadow: "0px 1px 4px 0px #5555550D",
            height: "44px",
            borderRadius: "12px",
          }}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Swap now"
          )}
        </Button>
      </div>
    </div>
  );
}
