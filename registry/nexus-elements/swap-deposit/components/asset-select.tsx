"use client";

import { DepositHeader } from "./deposit-header";
import { TokenIcon } from "./token-icon";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Checkbox } from "../../ui/checkbox";
import { cn } from "@/lib/utils";
import { useNexus } from "../../nexus/NexusProvider";

// Selection result containing the data needed for inputs
export interface AssetSelection {
  chainId: number;
  tokenAddress: `0x${string}`;
  decimals: number;
  symbol: string;
  balance: string;
  balanceInFiat: number;
  tokenLogo?: string;
  chainLogo?: string;
  chainName?: string;
}

interface AssetSelectProps {
  title?: string;
  availableAssets: AssetSelection[];
  selectedSources: AssetSelection[];
  onToggle: (source: AssetSelection) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onContinue: () => void;
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

const LOW_BALANCE_THRESHOLD = 5;

const AssetSelect = ({
  title = "Select Sources",
  availableAssets,
  selectedSources,
  onToggle,
  // onSelectAll,
  // onDeselectAll,
  onContinue,
  onBack,
  onClose,
  emptyLabel = "No swappable assets found",
  ctaLabel = "Continue",
}: AssetSelectProps) => {
  const { nexusSDK } = useNexus();

  const isSourceSelected = (source: AssetSelection) => {
    const sourceId = `${source.symbol}-${source.chainId}-${source.tokenAddress}`;
    return selectedSources.some(
      (s) => `${s.symbol}-${s.chainId}-${s.tokenAddress}` === sourceId
    );
  };

  // const allSelected =
  //   availableAssets.length > 0 &&
  //   selectedSources.length === availableAssets.length;
  const noneSelected = selectedSources.length === 0;

  return (
    <div className="flex h-full flex-col bg-background no-scrollbar">
      <DepositHeader
        title={title}
        onBack={onBack}
        onClose={onClose}
        showClose
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {availableAssets.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <>
            {/* Select All / Deselect All buttons */}
            {/* <div className="mb-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSelectAll}
                disabled={allSelected}
                className="flex-1"
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeselectAll}
                disabled={noneSelected}
                className="flex-1"
              >
                Deselect All
              </Button>
            </div> */}

            <ul className="space-y-1.5">
              {availableAssets.map((option) => {
                const sourceId = `${option.symbol}-${option.chainId}-${option.tokenAddress}`;
                const isSelected = isSourceSelected(option);
                const numericBalance = Number.parseFloat(option.balance);
                const usdValue = option.balanceInFiat;
                const isLowBalance = numericBalance < LOW_BALANCE_THRESHOLD;

                return (
                  <li key={sourceId}>
                    <div
                      className={cn(
                        "flex h-auto w-full items-center justify-between rounded-xl p-3 transition-colors",
                        isSelected
                          ? "bg-secondary/50 hover:bg-background"
                          : "hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-center gap-x-3 text-left">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggle(option)}
                        />
                        <TokenIcon
                          symbol={option.symbol}
                          tokenLogo={option.tokenLogo}
                          chainLogo={option.chainLogo}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-foreground">
                            {option.symbol}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {nexusSDK?.utils?.formatTokenBalance(
                              option.balance,
                              {
                                symbol: option.symbol,
                                decimals: option.decimals,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-x-2">
                        {isLowBalance && (
                          <Badge
                            variant="secondary"
                            className="bg-secondary text-muted-foreground text-[10px]"
                          >
                            Low Balance
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {usdFormatter.format(usdValue)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-border p-4">
        <Button
          onClick={onContinue}
          disabled={noneSelected}
          className="w-full rounded-xl text-base font-medium"
        >
          {ctaLabel} ({selectedSources.length} selected)
        </Button>
      </div>
    </div>
  );
};

export default AssetSelect;
