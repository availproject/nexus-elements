import React, { useMemo } from "react";
import {
  formatTokenBalance,
  type UserAssetDatum,
} from "@avail-project/nexus-core";
import Decimal from "decimal.js";

interface AmountInputUnifiedProps {
  amount: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  disabled?: boolean;
  maxAvailableAmount?: string;
  unifiedBalances?: UserAssetDatum[];
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
  unifiedBalances,
  tokenIcon,
  usdValue,
  tokenSymbol,
}: AmountInputUnifiedProps) {
  const handleMax = () => {
    if (!totalBalance) return;
    onChange(totalBalance);
    onCommit?.(totalBalance);
  };

  const totalBalance = useMemo(() => {
    if (!unifiedBalances || !unifiedBalances.length) return "0";
    return unifiedBalances
      .reduce((acc, curr) => acc.add(curr.balanceInFiat), new Decimal(0))
      .toDecimalPlaces(2)
      .toFixed();
  }, [unifiedBalances]);

  return (
    <div
      className="w-full flex flex-col items-center justify-center p-5 bg-white gap-y-3 min-h-[200px]"
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border-default, #E8E8E7)",
        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
        background: "#FFFFFF",
      }}
    >
      {/* Central Input row: large amount + MAX button inline */}
      <div className="flex items-center justify-center w-full gap-x-3 flex-1">
        <div
          className="flex items-center justify-center text-center"
          style={{
            fontSize: "40px",
            fontWeight: 500,
            gap: "2px",
          }}
        >
          $
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            className="min-w-0 text-start bg-transparent border-none outline-none p-0 focus:ring-0 placeholder:text-gray-300 truncate tabular-nums"
            style={{
              fontFamily: "'Delight', sans-serif",
              fontWeight: 500,
              fontSize: "40px",
              lineHeight: "100%",
              height: "40px",
              letterSpacing: "2%",
              color: "var(--foreground-primary, #161615)",
              fieldSizing: "content",
              minWidth: "1ch",
              maxWidth: "6ch",
            }}
            value={amount}
            disabled={disabled}
            onChange={(e) => {
              let next = e.target.value.replaceAll(/[^0-9.]/g, "");
              const parts = next.split(".");
              if (parts.length > 2)
                next = parts[0] + "." + parts.slice(1).join("");
              if (next === ".") next = "0.";
              onChange(next);
            }}
            onBlur={() => onCommit?.(amount)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommit?.(amount);
            }}
          />
        </div>
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
            fontFamily:
              "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "100%",
          }}
        >
          MAX
        </button>
      </div>

      {/* USD value */}
      {/* {usdValue && (
        <p className="text-sm font-normal text-gray-400">~ ${usdValue}</p>
      )} */}

      {/* Balance display — below amount + MAX row */}
      {(totalBalance || maxAvailableAmount) && (
        <p
          style={{
            color: "var(--widget-card-foreground-muted, #848483)",
            fontFamily:
              "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: "100%",
            textAlign: "center",
          }}
        >
          Balance: {totalBalance ? `$${totalBalance}` : `$0`}
        </p>
      )}
    </div>
  );
}
