"use client";

import { useState } from "react";
import { DepositHeader } from "./deposit-header";
import { TokenIcon } from "./token-icon";
import { InfoRow, InfoCard } from "./info";
import { Button } from "../../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/nexus-elements/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { Skeleton } from "../../ui/skeleton";
import { ChevronRight, Fuel, Info } from "lucide-react";
import { SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";
import { type AssetSelection } from "./asset-select";
import { cn } from "@/lib/utils";
import { Separator } from "../../ui/separator";

export interface ConfirmationDetails {
  sourceLabel: string;
  sources: (AssetSelection | undefined)[];
  gasTokenSymbol?: string;
  estimatedTime?: string;
  amountSpent: string;
  receiveTokenSymbol: string;
  receiveAmountAfterSwap: string;
  receiveTokenChain: SUPPORTED_CHAINS_IDS;
  receiveTokenLogo?: string;
  networkCost?: string;
}

interface ConfirmationStepProps {
  amount: number;
  details: ConfirmationDetails;
  isSimulating: boolean;
  countdown?: number;
  onConfirm: () => void;
  onBack: () => void;
  title?: string;
}

export const ConfirmationStep = ({
  amount,
  details,
  countdown,
  onConfirm,
  onBack,
  title = "Deposit USDC",
  isSimulating = false,
}: ConfirmationStepProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-background no-scrollbar">
      <DepositHeader
        title={title}
        onBack={onBack}
        countdown={countdown}
        showClose={false}
      />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="text-center py-2">
          {isSimulating ? (
            <Skeleton className="h-10 w-32 mx-auto" />
          ) : (
            <p className="text-4xl font-light text-foreground">
              ${amount.toFixed(6)}
            </p>
          )}
          <div className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-sm">
            <TokenIcon
              symbol={details.receiveTokenSymbol}
              tokenLogo={details.receiveTokenLogo}
              size="sm"
            />
            {isSimulating ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span>{details.receiveAmountAfterSwap}</span>
            )}
          </div>
        </div>

        <InfoCard>
          <InfoRow
            label="You send"
            value={
              <div className="flex items-center gap-2 py-1.5">
                {details.sources?.map((source, index) => (
                  <TokenIcon
                    key={source?.tokenAddress}
                    symbol={source?.symbol}
                    tokenLogo={source?.tokenLogo}
                    chainLogo={source?.chainLogo}
                    size="sm"
                    className={cn(
                      "last:mr-0",
                      index !== (details.sources?.length ?? 0) - 1 && "-mr-3"
                    )}
                  />
                ))}
                {isSimulating ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span>{details.amountSpent}</span>
                )}
              </div>
            }
          />
          <Separator className="my-2" />
          <InfoRow
            label="You receive"
            value={
              <div className="flex items-center gap-2 py-1.5">
                <TokenIcon
                  symbol={details.receiveTokenSymbol}
                  tokenLogo={details.receiveTokenLogo}
                  size="sm"
                />
                {isSimulating ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <span>{details.receiveAmountAfterSwap}</span>
                )}
              </div>
            }
          />
          <Separator className="my-2" />
          <InfoRow
            label="Estimated time"
            value={details.estimatedTime ?? "Few seconds"}
            valueClassName="py-1.5"
          />
        </InfoCard>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span>Transaction breakdown</span>
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                open ? "rotate-90" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <InfoCard className="space-y-0">
              <TooltipProvider>
                <InfoRow
                  label={
                    <span className="flex items-center gap-1">
                      Network cost
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Gas fee required to complete the on-chain deposit
                            transaction
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  }
                  value={
                    isSimulating ? (
                      <Skeleton className="h-4 w-20" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                        {details.networkCost}
                      </span>
                    )
                  }
                />
              </TooltipProvider>
            </InfoCard>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="space-y-3 border-t border-border p-4 text-center text-xs text-muted-foreground">
        <p>
          By clicking Confirm, you agree to our{" "}
          <a
            href="https://docs.availproject.org/terms"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline"
          >
            terms
          </a>{" "}
          .
        </p>
        <Button
          onClick={onConfirm}
          disabled={isSimulating}
          className="w-full rounded-xl text-base font-semibold"
        >
          {isSimulating ? "Simulating..." : "Confirm order"}
        </Button>
      </div>
    </div>
  );
};
