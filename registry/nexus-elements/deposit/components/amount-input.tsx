"use client";

import {
  SUPPORTED_CHAINS_IDS,
  SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { type UserAsset } from "@avail-project/nexus-core";

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
    value: 1.0,
  },
];

interface AmountInputProps {
  token?: SUPPORTED_TOKENS;
  chain: SUPPORTED_CHAINS_IDS;
  value?: string;
  onChange: (value: string) => void;
  unifiedBalance?: UserAsset;
}

const AmountInput = ({
  token,
  chain,
  value,
  onChange,
  unifiedBalance,
}: AmountInputProps) => {
  return (
    <div className="flex flex-col items-start gap-y-1 w-full p-2">
      <div className="flex items-center justify-between w-full">
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="1.002..."
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="p-0 text-2xl! placeholder:text-2xl w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
        />
        <p>{token}</p>
      </div>
      <div className="flex gap-x-3">
        {RANGE_OPTIONS.map((option) => (
          <Button
            size={"icon"}
            variant={"ghost"}
            key={option.label}
            className="text-xs py-0.5 px-0 size-max"
            onClick={() => {
              if (!unifiedBalance?.balance) return;
              const max = Number(unifiedBalance?.balance);
              const next = (max * option.value).toString();
              onChange(next);
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
