import React, { useMemo } from "react";
import { formatTokenBalance, type UserAsset } from "@avail-project/nexus-core";

interface AmountInputUnifiedProps {
  amount: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  disabled?: boolean;
  maxAvailableAmount?: string;
  bridgableBalance?: UserAsset;
  tokenIcon?: React.ReactNode;
  usdValue?: string;
  /** Label shown beside Balance text, e.g. "USDC" */
  tokenSymbol?: string;
}

export function AmountInputUnified({
  amount,
  onChange,
  onCommit,
  disabled,
  maxAvailableAmount,
  bridgableBalance,
  tokenIcon,
  usdValue,
  tokenSymbol,
}: AmountInputUnifiedProps) {
  const handleMax = () => {
    if (!maxAvailableAmount) return;
    onChange(maxAvailableAmount);
    onCommit?.(maxAvailableAmount);
  };

  const balanceLabel = useMemo(() => {
    if (!bridgableBalance) return null;
    return formatTokenBalance(bridgableBalance.balance, {
      symbol: bridgableBalance.symbol,
      decimals: bridgableBalance.decimals,
    });
  }, [bridgableBalance]);

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-5 bg-white gap-y-3"
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border-default, #E8E8E7)",
        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
        background: "#FFFFFF",
      }}
    >
      {/* Central Input row: large amount + MAX button inline */}
      <div className="flex items-center justify-center w-full gap-x-3">
        {tokenIcon && (
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 shadow-sm border">
            {tokenIcon}
          </div>
        )}
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          className="flex-1 min-w-0 text-center bg-transparent border-none outline-none p-0 focus:ring-0 placeholder:text-gray-300 truncate"
          style={{
            fontFamily: "'Delight', sans-serif",
            fontWeight: 500,
            fontSize: "40px",
            lineHeight: "100%",
            letterSpacing: "2%",
            color: "var(--foreground-primary, #161615)",
          }}
          value={amount}
          disabled={disabled}
          onChange={(e) => {
            let next = e.target.value.replaceAll(/[^0-9.]/g, "");
            const parts = next.split(".");
            if (parts.length > 2) next = parts[0] + "." + parts.slice(1).join("");
            if (next === ".") next = "0.";
            onChange(next);
          }}
          onBlur={() => onCommit?.(amount)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit?.(amount);
          }}
        />

        {/* MAX button — inline beside the input */}
        <button
          onClick={handleMax}
          disabled={disabled || !maxAvailableAmount}
          className="shrink-0 focus:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          style={{
            background: "var(--background-tertiary, #F0F0EF)",
            width: "44px",
            height: "26px",
            borderRadius: "6px",
            padding: "4px 8px",
            color: "var(--foreground-muted, #848483)",
            fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "100%",
          }}
        >
          MAX
        </button>
      </div>

      {/* USD value */}
      {usdValue && (
        <p className="text-sm font-normal text-gray-400">~ ${usdValue}</p>
      )}

      {/* Balance display — below amount + MAX row */}
      {(bridgableBalance || maxAvailableAmount) && (
        <p
          style={{
            color: "var(--widget-card-foreground-muted, #848483)",
            fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: "100%",
            textAlign: "center",
          }}
        >
          Balance:{" "}
          {bridgableBalance
            ? balanceLabel
            : `${maxAvailableAmount} ${tokenSymbol ?? ""}`}
        </p>
      )}
    </div>
  );
}
