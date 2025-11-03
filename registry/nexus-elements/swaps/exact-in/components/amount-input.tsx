import React, { FC, useEffect, useRef } from "react";
import { Input } from "../../../ui/input";

interface AmountInputProps {
  amount?: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  disabled?: boolean;
  symbol?: string;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  onCommit,
  disabled,
  symbol,
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
    <div className="w-full flex border border-border rounded-lg gap-y-2">
      <Input
        type="text"
        inputMode="decimal"
        value={amount ?? ""}
        placeholder={`Enter Amount${symbol ? ` (${symbol})` : ""}`}
        onChange={(e) => {
          let next = e.target.value.replace(/[^0-9.]/g, "");
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
        className="w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none py-0 px-3"
        aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
        disabled={disabled}
      />
      <div className="flex items-center justify-end-safe gap-x-4 w-fit px-2 border-l border-border">
        {symbol && <p className="text-base font-semibold">{symbol}</p>}
      </div>
    </div>
  );
};

export default AmountInput;
