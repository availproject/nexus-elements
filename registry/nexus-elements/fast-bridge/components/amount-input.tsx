import React, { FC } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { type UserAsset } from "@avail-project/nexus-core";

interface AmountInputProps {
  amount?: string;
  onChange: (value: string) => void;
  unifiedBalance?: UserAsset;
}

const AmountInput: FC<AmountInputProps> = ({
  amount,
  onChange,
  unifiedBalance,
}) => {
  const onMaxClick = () => {
    if (!unifiedBalance) return;
    const maxBalAvailable = unifiedBalance?.balance;
    onChange(maxBalAvailable);
  };
  return (
    <div className="w-full flex border border-border rounded-lg gap-y-2">
      <Input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        value={amount ?? ""}
        placeholder="Enter Amount"
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0"
        aria-invalid={Boolean(amount) && Number.isNaN(Number(amount))}
      />
      <div className="flex items-center justify-end-safe gap-x-4 w-fit px-2 border-l border-border">
        <div className="flex items-center gap-x-3 min-w-max">
          {unifiedBalance && (
            <p className="text-base font-semibold">
              {parseFloat(unifiedBalance?.balance)?.toFixed(6)}{" "}
              {unifiedBalance?.symbol}
            </p>
          )}
          <Button
            size={"sm"}
            variant={"ghost"}
            onClick={onMaxClick}
            className="px-0"
          >
            Max
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AmountInput;
