import React, { Dispatch, type RefObject, SetStateAction } from "react";
import { Label } from "../../ui/label";
import { cn } from "@/lib/utils";
import {
  CHAIN_METADATA,
  type OnSwapIntentHookData,
  type SUPPORTED_CHAINS_IDS,
  type UserAsset,
} from "@avail-project/nexus-core";
import { type SwapInputs } from "../exact-in/hooks/useExactIn";
import { Button } from "../../ui/button";
import { TokenIcon } from "./token-icon";
import AmountInput from "./amount-input";
import { usdFormatter } from "../../common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { ChevronDown } from "lucide-react";
import DestinationAssetSelect from "./destination-asset-select";

interface DestinationContainerProps {
  destinationHovered: boolean;
  inputs: SwapInputs;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  destinationBalance?: UserAsset["breakdown"][0];
  availableStables: UserAsset[];
  setInputs: Dispatch<SetStateAction<SwapInputs>>;
  getFiatValue: (amount: number, token: string) => number;
  formatBalance: (
    balance?: string | number,
    symbol?: string,
    decimals?: number,
  ) => string | undefined;
}

const DestinationContainer: React.FC<DestinationContainerProps> = ({
  destinationHovered,
  inputs,
  swapIntent,
  destinationBalance,
  availableStables,
  setInputs,
  getFiatValue,
  formatBalance,
}) => {
  return (
    <div className="bg-background rounded-xl p-4 flex flex-col items-center w-full gap-y-4">
      <div className="w-full flex items-center justify-between">
        <Label className="text-lg font-medium text-foreground">Buy</Label>
        {(!inputs?.toToken || !inputs?.toChainID) && (
          <div
            className={cn(
              "flex transition-all duration-150 ease-out w-full justify-end gap-x-2",
              destinationHovered
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-1",
            )}
          >
            {availableStables.map((token) => (
              <Button
                key={token?.symbol}
                size={"icon-sm"}
                variant={"secondary"}
                onClick={() => {
                  if (!token) return;
                  setInputs({
                    ...inputs,
                    toToken: {
                      tokenAddress: token.breakdown[0].contractAddress,
                      decimals: token.decimals,
                      logo: token.icon ?? "",
                      name: token.symbol,
                      symbol: token.symbol,
                    },
                    toChainID: token.breakdown[0].chain
                      .id as SUPPORTED_CHAINS_IDS,
                  });
                }}
                className="bg-transparent rounded-full hover:-translate-y-1 hover:object-scale-down"
              >
                <TokenIcon
                  symbol={token?.symbol}
                  tokenLogo={token?.icon}
                  chainLogo={token.breakdown[0].chain.logo}
                  size="sm"
                />
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start justify-between gap-y-4">
          <AmountInput
            amount={
              formatBalance(
                swapIntent?.current?.intent.destination.amount,
                swapIntent.current?.intent.destination.token.symbol,
                swapIntent.current?.intent.destination.token.decimals,
              ) ?? "0"
            }
            disabled={true}
          />
          {swapIntent?.current?.intent?.destination?.amount &&
          inputs?.toToken ? (
            <span className="text-sm text-accent-foreground">
              {usdFormatter.format(
                getFiatValue(
                  Number.parseFloat(
                    swapIntent?.current?.intent?.destination?.amount,
                  ),
                  inputs.toToken?.logo,
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
              <div className="flex items-center gap-x-3 bg-card/50 hover:bg-card-foreground/10 border border-border min-w-max rounded-full p-1 cursor-pointer transition-colors">
                <TokenIcon
                  symbol={inputs?.toToken?.symbol}
                  tokenLogo={inputs?.toToken?.logo}
                  chainLogo={CHAIN_METADATA[inputs?.toChainID]?.logo}
                  size="lg"
                />
                <span className="font-medium">{inputs?.toToken?.symbol}</span>
                <ChevronDown size={16} className="mr- ref={isSourceHovered}1" />
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Destination</DialogTitle>
              </DialogHeader>
              <DestinationAssetSelect
                onSelect={(toChainID, toToken) =>
                  setInputs({ ...inputs, toChainID, toToken })
                }
              />
            </DialogContent>
          </Dialog>

          {inputs?.toToken ? (
            <span className="text-sm text-muted-foreground">
              {formatBalance(
                destinationBalance?.balance,
                inputs?.toToken?.symbol,
                destinationBalance?.decimals,
              ) || inputs?.toToken?.symbol
                ? `0 ${inputs?.toToken?.symbol}`
                : ""}
            </span>
          ) : (
            <span className="h-5" />
          )}
        </div>
      </div>
    </div>
  );
};

export default DestinationContainer;
