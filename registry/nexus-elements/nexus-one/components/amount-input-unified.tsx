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
  header?: React.ReactNode;
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
  header,
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
      className="w-full flex flex-col bg-white min-h-[200px]"
      style={{
        borderRadius: "12px",
        border: "1px solid var(--border-default, #E8E8E7)",
        boxShadow: "0px 1px 12px 0px #5B5B5B0D",
        background: "#FFFFFF",
      }}
    >
      {header && (
        <div className="w-full border-b border-[#E8E8E7] px-5 py-4">
          {header}
        </div>
      )}
      <div className="flex-1 w-full flex flex-col items-center justify-center p-5 relative">
      {/* Central Input row: large amount + MAX button inline */}
      <div className="flex items-center justify-center w-full gap-x-3 mb-2">
        <div
          className="flex items-center justify-center text-center"
          style={{
            fontSize: "40px",
            fontWeight: 500,
            gap: "2px",
          }}
        >
          {tokenIcon ? (
            <div className="flex items-center justify-center mr-4">
              {tokenIcon}
            </div>
          ) : (
            <span className="leading-none text-gray-800 mr-2">$</span>
          )}
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

      {/* Balance display — below amount + MAX row */}
      {(totalBalance || maxAvailableAmount) && (
        <div className="absolute bottom-5 left-0 w-full flex justify-center">
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
        </div>
      )}
      </div>
    </div>
  );
}
