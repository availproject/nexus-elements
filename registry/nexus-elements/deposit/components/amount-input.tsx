"use client";

import { type UserAsset } from "@avail-project/nexus-core";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { useCallback, useEffect, useRef } from "react";

const RANGE_OPTIONS = [
  {
    label: "25%",
    value: 0.25,
  },
  {
    label: "50%",
    value: 0.5,
  },
  {
    label: "75%",
    value: 0.75,
  },
  {
    label: "MAX",
    value: 1,
  },
];

interface AmountInputProps {
  value?: string;
  onChange: (value: string) => void;
  unifiedBalance?: UserAsset;
  disabled?: boolean;
  onCommit?: (value: string) => void;
}

const AmountInput = ({
  value,
  onChange,
  unifiedBalance,
  disabled,
  onCommit,
}: AmountInputProps) => {
  const commitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleCommit = useCallback(
    (val: string) => {
      if (!onCommit || disabled) return;
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
      commitTimerRef.current = setTimeout(() => {
        onCommit(val);
      }, 800);
    },
    [onCommit, disabled]
  );

  useEffect(() => {
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-start gap-y-1 w-full py-2">
      <div className="flex items-center justify-between gap-x-3 w-full">
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="1.002..."
          value={value ?? ""}
          onChange={(e) => {
            onChange(e.target.value);
            scheduleCommit(e.target.value);
          }}
          onBlur={(e) => {
            if (commitTimerRef.current) {
              clearTimeout(commitTimerRef.current);
              commitTimerRef.current = null;
            }
            onCommit?.(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (commitTimerRef.current) {
                clearTimeout(commitTimerRef.current);
                commitTimerRef.current = null;
              }
              onCommit?.(value ?? "");
            }
          }}
          className="p-0 text-2xl! placeholder:text-2xl w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent!"
          disabled={disabled}
        />
        {unifiedBalance && (
          <p className="text-base font-semibold min-w-max">
            {Number.parseFloat(unifiedBalance?.balance)?.toFixed(6)}{" "}
            {unifiedBalance?.symbol}
          </p>
        )}
      </div>
      <div className="flex gap-x-3">
        {RANGE_OPTIONS.map((option) => (
          <Button
            size={"icon"}
            variant={"ghost"}
            key={option.label}
            className="text-xs py-0.5 px-0 size-max"
            disabled={disabled}
            onClick={() => {
              if (!unifiedBalance?.balance) return;
              const max = Number(unifiedBalance?.balance);
              const next = (max * option.value).toString();
              onChange(next);
              onCommit?.(next);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default AmountInput;
