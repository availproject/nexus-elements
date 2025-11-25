"use client";

import { useEffect, useMemo, useState } from "react";
import { DepositHeader } from "./deposit-header";
import { TokenIcon } from "./token-icon";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { cn } from "@/lib/utils";

export type AssetSelectOption = {
  id: string;
  symbol: string;
  readableBalance: string;
  usdValue?: number;
  isLowBalance?: boolean;
  chainName?: string;
  chainLogo?: string;
  chainId: number;
  contractAddress: `0x${string}`;
  decimals: number;
  tokenLogo?: string;
};

interface AssetSelectProps {
  title?: string;
  options: AssetSelectOption[];
  onSelect: (option: AssetSelectOption) => void;
  onBack: () => void;
  onClose: () => void;
  emptyLabel?: string;
  ctaLabel?: string;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const AssetSelect = ({
  title = "Deposit USDC",
  options,
  onSelect,
  onBack,
  onClose,
  emptyLabel = "No swappable assets found",
  ctaLabel = "Continue",
}: AssetSelectProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    options[0]?.id ?? null
  );

  useEffect(() => {
    if (!options.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !options.some((opt) => opt.id === selectedId)) {
      setSelectedId(options[0]?.id ?? null);
    }
  }, [options, selectedId]);

  const selected = useMemo(
    () => options.find((option) => option.id === selectedId) ?? null,
    [options, selectedId]
  );

  const handleContinue = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <DepositHeader
        title={title}
        onBack={onBack}
        onClose={onClose}
        showClose
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {options.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <ul className="space-y-1">
            {options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <li key={option.id}>
                  <button
                    onClick={() => setSelectedId(option.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border p-3 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <TokenIcon
                        symbol={option.symbol}
                        tokenLogo={option.tokenLogo}
                        chainLogo={option.chainLogo}
                        size="lg"
                      />
                      <div>
                        <p className="font-medium text-foreground">
                          {option.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.readableBalance}
                          {option.chainName ? ` · ${option.chainName}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {option.isLowBalance && (
                        <Badge
                          variant="secondary"
                          className="bg-secondary text-muted-foreground text-[10px]"
                        >
                          Low balance
                        </Badge>
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {option.usdValue === undefined
                          ? "—"
                          : usdFormatter.format(option.usdValue)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-4">
        <Button
          onClick={handleContinue}
          disabled={!selectedId}
          className="h-12 w-full rounded-xl text-base font-medium"
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
};

export default AssetSelect;
