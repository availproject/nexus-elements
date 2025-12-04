import React, { FC, type RefObject, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
} from "../../ui/dialog";
import {
  NexusSDK,
  type SwapStepType,
  type OnSwapIntentHookData,
} from "@avail-project/nexus-core";
import { MoveDown, XIcon } from "lucide-react";
import { TokenIcon } from "./token-icon";
import { type GenericStep, usdFormatter } from "../../common";
import { TOKEN_IMAGES } from "../config/destination";
import { Button } from "../../ui/button";
import { type TransactionStatus } from "../hooks/useExactIn";
import TransactionProgress from "./transaction-progress";
import { Separator } from "../../ui/separator";

interface ViewTransactionProps {
  steps: GenericStep<SwapStepType>[];
  status: TransactionStatus;
  nexusSDK: NexusSDK | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  getFiatValue: (amount: number, token: string) => number;
  setStatus: (status: TransactionStatus) => void;
  explorerUrls: {
    sourceExplorerUrl: string | null;
    destinationExplorerUrl: string | null;
  };
  reset: () => void;
  txError: string | null;
}

interface TokenBreakdownProps
  extends Omit<
    ViewTransactionProps,
    | "swapIntent"
    | "setStatus"
    | "status"
    | "explorerUrls"
    | "steps"
    | "reset"
    | "txError"
  > {
  tokenLogo: string;
  chainLogo: string;
  symbol: string;
  amount: number;
  decimals: number;
}

const TokenBreakdown = ({
  nexusSDK,
  getFiatValue,
  tokenLogo,
  chainLogo,
  symbol,
  amount,
  decimals,
}: TokenBreakdownProps) => {
  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex flex-col items-start gap-y-1">
        <p className="text-xl font-medium ">
          {nexusSDK?.utils.formatTokenBalance(amount, {
            symbol: symbol,
            decimals: decimals,
          })}
        </p>
        <p className="text-base text-muted-foreground font-medium ">
          {usdFormatter.format(getFiatValue(amount, symbol))}
        </p>
      </div>
      <TokenIcon
        symbol={symbol}
        chainLogo={chainLogo}
        tokenLogo={tokenLogo}
        size="lg"
      />
    </div>
  );
};

const ViewTransaction: FC<ViewTransactionProps> = ({
  steps,
  status,
  nexusSDK,
  swapIntent,
  getFiatValue,
  setStatus,
  explorerUrls,
  reset,
  txError,
}) => {
  if (!swapIntent.current?.intent) return null;

  const transactionIntent = swapIntent.current.intent;
  console.log("tra  ", transactionIntent);
  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={(open) => {
        if (!open) {
          console.log("RESET", open);
          reset();
        }
      }}
    >
      <DialogContent className="max-w-md!" showCloseButton={false}>
        <DialogHeader className="flex-row items-center justify-between w-full">
          <p className="text-sm font-medium text-muted-foreground">
            You're Swapping
          </p>
          <DialogClose>
            <XIcon className="size-5 text-muted-foreground" />
          </DialogClose>
        </DialogHeader>
        <div className="flex flex-col items-start w-full gap-y-4">
          <TokenBreakdown
            nexusSDK={nexusSDK}
            getFiatValue={getFiatValue}
            tokenLogo={TOKEN_IMAGES[transactionIntent.sources[0].token.symbol]}
            chainLogo={transactionIntent.sources[0].chain.logo}
            symbol={transactionIntent.sources[0].token.symbol}
            amount={Number.parseFloat(transactionIntent.sources[0].amount)}
            decimals={transactionIntent.sources[0].token.decimals}
          />
          <MoveDown className="size-5 -ml-1.5 text-muted-foreground" />
          <TokenBreakdown
            nexusSDK={nexusSDK}
            getFiatValue={getFiatValue}
            tokenLogo={TOKEN_IMAGES[transactionIntent.destination.token.symbol]}
            chainLogo={transactionIntent.destination.chain.logo}
            symbol={transactionIntent.destination.token.symbol}
            amount={Number.parseFloat(transactionIntent.destination.amount)}
            decimals={transactionIntent.destination.token.decimals}
          />
        </div>
        {status === "error" && (
          <p className="text-destructive text-sm">{txError}</p>
        )}
        {status === "simulating" && (
          <Button
            onClick={() => {
              setStatus("swapping");
              swapIntent.current?.allow();
            }}
          >
            Continue
          </Button>
        )}

        {(status === "swapping" || status === "success") && (
          <>
            <Separator className="transition-opacity" />
            <TransactionProgress
              steps={steps}
              explorerUrls={explorerUrls}
              sourceSymbol={transactionIntent.sources[0].token.symbol}
              destinationSymbol={transactionIntent.destination.token.symbol}
              sourceLogos={{
                token: TOKEN_IMAGES[transactionIntent.sources[0].token.symbol],
                chain: transactionIntent.sources[0].chain.logo,
              }}
              destinationLogos={{
                token: TOKEN_IMAGES[transactionIntent.destination.token.symbol],
                chain: transactionIntent.destination.chain.logo,
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewTransaction;
