import React from "react";
import { Label } from "../../ui/label";
import { cn } from "@/lib/utils";
import { Button } from "../../ui/button";
import { TransactionStatus, type SwapInputs } from "../hooks/useExactIn";
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
  status: TransactionStatus;
  sourceHovered: boolean;
  inputs: SwapInputs;
  availableBalance?: UserAsset["breakdown"][0];
  swapBalance: UserAsset[] | null;
  setInputs: (inputs: Partial<SwapInputs>) => void;
  setTxError: (error: string | null) => void;
  getFiatValue: (amount: number, token: string) => number;
  formatBalance: (
    balance?: string | number,
    symbol?: string,
    decimals?: number,
  ) => string | undefined;
}

const SourceContainer: React.FC<SourceContainerProps> = ({
  status,
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
    <div className="bg-background rounded-xl flex flex-col items-center w-full gap-y-4">
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
      <div className="flex items-center justify-between gap-x-4 w-full">
        <AmountInput
          amount={inputs?.fromAmount ?? ""}
          onChange={(val) => {
            if (availableBalance?.balance) {
              const parsedAvailableBalance = Number.parseFloat(
                availableBalance?.balance,
              );
              const parsedVal = Number.parseFloat(val);
              if (parsedVal > parsedAvailableBalance) {
                setTxError("Insufficient Balance");
                return;
              }
            }
            setInputs({ ...inputs, fromAmount: val });
          }}
          disabled={status === "simulating"}
        />

        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-x-3 bg-card/50 hover:bg-card-foreground/10 border border-border min-w-max rounded-full p-1 cursor-pointer  transition-colors">
              <TokenIcon
                symbol={inputs?.fromToken?.symbol}
                tokenLogo={inputs?.fromToken?.logo}
                chainLogo={
                  inputs?.fromChainID
                    ? CHAIN_METADATA[inputs?.fromChainID]?.logo
                    : undefined
                }
                size="lg"
              />
              <span className="font-medium">{inputs?.fromToken?.symbol}</span>
              <ChevronDown size={16} className="mr-1" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md!">
            <DialogHeader>
              <DialogTitle>Select a Token</DialogTitle>
            </DialogHeader>
            <SourceAssetSelect
              onSelect={(fromChainID, fromToken) =>
                setInputs({ ...inputs, fromChainID, fromToken })
              }
              swapBalance={swapBalance}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center justify-between gap-x-4 w-full">
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

        <span className="text-sm text-muted-foreground">
          {formatBalance(
            availableBalance?.balance ?? "0",
            inputs?.fromToken?.symbol,
            availableBalance?.decimals,
          )}
        </span>
      </div>
    </div>
  );
};

export default SourceContainer;
