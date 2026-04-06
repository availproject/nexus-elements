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
}: AmountInputUnifiedProps) {

  const handlePercentage = (percent: number) => {
    if (!maxAvailableAmount) return;
    if (percent === 100) {
      onChange(maxAvailableAmount);
      onCommit?.(maxAvailableAmount);
    } else {
      const calculated = (Number.parseFloat(maxAvailableAmount) * percent) / 100;
      const formatted = calculated.toFixed(8).replace(/\.?0+$/, "");
      onChange(formatted);
      onCommit?.(formatted);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-6 border rounded-xl bg-white shadow-sm gap-y-4">
      {/* Central Input Area */}
      <div className="flex flex-col items-center justify-center relative">
        <div className="flex items-center justify-center gap-x-2 w-full text-4xl font-medium text-gray-900 leading-tight">
          {tokenIcon && <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 shadow-sm border">{tokenIcon}</div>}
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            className="w-full max-w-[200px] text-center bg-transparent border-none outline-none p-0 focus:ring-0 text-4xl placeholder:text-gray-300 truncate"
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
        </div>
        {usdValue && <p className="text-sm font-normal text-gray-400 mt-1">~ ${usdValue}</p>}
      </div>

      {/* Percentage Shortcuts */}
      <div className="flex items-center justify-center overflow-hidden border rounded-md">
        <button
          onClick={() => handlePercentage(25)}
          disabled={disabled || !maxAvailableAmount}
          className="px-3 py-1 text-xs font-medium border-r hover:bg-gray-50 focus:bg-gray-100 disabled:opacity-50"
        >
          25%
        </button>
        <button
          onClick={() => handlePercentage(50)}
          disabled={disabled || !maxAvailableAmount}
          className="px-3 py-1 text-xs font-medium border-r hover:bg-gray-50 focus:bg-gray-100 disabled:opacity-50"
        >
          50%
        </button>
        <button
          onClick={() => handlePercentage(75)}
          disabled={disabled || !maxAvailableAmount}
          className="px-3 py-1 text-xs font-medium border-r hover:bg-gray-50 focus:bg-gray-100 disabled:opacity-50"
        >
          75%
        </button>
        <button
          onClick={() => handlePercentage(100)}
          disabled={disabled || !maxAvailableAmount}
          className="px-3 py-1 text-xs font-medium hover:bg-gray-50 focus:bg-gray-100 disabled:opacity-50"
        >
          MAX
        </button>
      </div>

      {/* Balance Display */}
      {bridgableBalance && (
        <p className="text-xs text-gray-500">
          Balance:{" "}
          {formatTokenBalance(bridgableBalance.balance, {
            symbol: bridgableBalance.symbol,
            decimals: bridgableBalance.decimals,
          })}
        </p>
      )}
    </div>
  );
}
