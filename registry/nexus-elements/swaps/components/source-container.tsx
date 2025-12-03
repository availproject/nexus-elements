import React, { Dispatch, SetStateAction } from "react";
import { Label } from "../../ui/label";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { type SwapInputs } from "../exact-in/hooks/useExactIn";
import { computeAmountFromFraction, usdFormatter } from "../../common";
import { CHAIN_METADATA, type UserAsset } from "@avail-project/nexus-core";
import AmountInput from "./amount-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { TokenIcon } from "./token-icon";
import { ChevronDown } from "lucide-react";
import SourceAssetSelect from "./source-asset-select";

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

const SAFETY_MARGIN = 0.05;

interface SourceContainerProps {
  sourceHovered: boolean;
  inputs: SwapInputs;
  availableBalance?: UserAsset["breakdown"][0];
  swapBalance: UserAsset[] | null;
  setInputs: Dispatch<SetStateAction<SwapInputs>>;
  setTxError: Dispatch<SetStateAction<string | null>>;
  getFiatValue: (amount: number, token: string) => number;
  formatBalance: (
    balance?: string | number,
    symbol?: string,
    decimals?: number,
  ) => string | undefined;
}

const SourceContainer: React.FC<SourceContainerProps> = ({
  sourceHovered,
  inputs,
  availableBalance,
  swapBalance,
  setInputs,
  setTxError,
  getFiatValue,
  formatBalance,
}) => {
  return (
    <div className="bg-background rounded-xl p-4 flex flex-col items-center w-full gap-y-4">
      <div className="w-full flex items-center justify-between">
        <Label className="text-lg font-medium text-foreground">Sell</Label>
        <div
          className={cn(
            "flex transition-all duration-150 ease-out w-full justify-end gap-x-2",
            sourceHovered
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-1",
          )}
        >
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.label}
              size={"icon-sm"}
              variant={"secondary"}
              disabled={!inputs.fromChainID || !inputs.fromToken}
              onClick={() => {
                if (!inputs.fromToken) return 0;
                const amount = computeAmountFromFraction(
                  availableBalance?.balance ?? "0",
                  option.value,
                  inputs?.fromToken?.decimals,
                  SAFETY_MARGIN,
                );
                setInputs({ ...inputs, fromAmount: amount });
              }}
              className="px-5 py-1.5 rounded-full hover:-translate-y-1 hover:object-scale-down"
            >
              <p className="text-xs font-medium">{option.label}</p>
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start justify-between gap-y-4">
          <AmountInput
            amount={inputs?.fromAmount}
            onChange={(val) => {
              const parsedAvailableBalance = Number.parseFloat(
                availableBalance?.balance ?? "0",
              );
              const parsedVal = Number.parseFloat(val);
              if (parsedVal > parsedAvailableBalance) {
                setTxError("Insufficient Balance");
                return;
              }
              setInputs({ ...inputs, fromAmount: val });
            }}
            disabled={false}
          />
          {inputs.fromAmount && inputs?.fromToken ? (
            <span className="text-sm text-accent-foreground">
              {usdFormatter.format(
                getFiatValue(
                  Number.parseFloat(inputs.fromAmount),
                  inputs.fromToken?.logo,
                ),
              )}
            </span>
          ) : (
            <span className="h-5" />
          )}
        </div>
        <div className="flex flex-col items-end justify-between gap-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-center gap-x-3 bg-card/50 hover:bg-card-foreground/10 border border-border min-w-max rounded-full p-1 cursor-pointer  transition-colors">
                <TokenIcon
                  symbol={inputs?.fromToken?.symbol}
                  tokenLogo={inputs?.fromToken?.logo}
                  chainLogo={CHAIN_METADATA[inputs?.fromChainID]?.logo}
                  size="lg"
                />
                <span className="font-medium">{inputs?.fromToken?.symbol}</span>
                <ChevronDown size={16} className="mr-1" />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Source</DialogTitle>
              </DialogHeader>
              <SourceAssetSelect
                onSelect={(fromChainID, fromToken) =>
                  setInputs({ ...inputs, fromChainID, fromToken })
                }
                swapBalance={swapBalance}
              />
            </DialogContent>
          </Dialog>

          <span className="text-sm text-muted-foreground">
            {formatBalance(
              availableBalance?.balance ?? "0",
              inputs?.fromToken?.symbol,
              availableBalance?.decimals,
            ) || inputs?.fromToken?.symbol
              ? `0 ${inputs?.fromToken?.symbol}`
              : ""}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SourceContainer;
