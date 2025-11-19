import React, { type FC, useEffect, useRef } from "react";
import { Input } from "../../ui/input";

interface AmountInputProps {
  amount?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  disabled?: boolean;
  symbol?: string;
  hideBalance?: boolean;
  balance?: string;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  onCommit,
  disabled,
  symbol,
  hideBalance = false,
  balance,
}) => {
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleCommit = (val: string) => {
    if (!onCommit || disabled) return;
    if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    commitTimerRef.current = setTimeout(() => {
      onCommit(val);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full flex sm:flex-row flex-col border border-border rounded-lg gap-y-2">
      <Input
        type="text"
        inputMode="decimal"
        value={amount ?? ""}
        placeholder={`Enter Amount ${symbol ?? ""}`}
        onChange={(e) => {
          let next = e.target.value.replaceAll(/[^0-9.]/g, "");
          const parts = next.split(".");
          if (parts.length > 2) next = parts[0] + "." + parts.slice(1).join("");
          if (next === ".") next = "0.";
          onChange(next);
          scheduleCommit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (commitTimerRef.current) {
              clearTimeout(commitTimerRef.current);
              commitTimerRef.current = null;
            }
            onCommit?.(amount ?? "");
          }
        }}
        className="w-full border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none py-0 px-3"
        aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
        disabled={disabled}
      />
      {!hideBalance && balance && (
        <div className="flex items-center justify-end-safe gap-x-4 w-max px-2 border-l border-border">
          <p className="text-sm font-semibold w-max">{balance}</p>
        </div>
      )}
    </div>
  );
};

export default AmountInput;
