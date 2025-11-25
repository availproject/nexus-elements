"use client";

import { useState } from "react";
import { DepositHeader } from "./deposit-header";
import { TokenIcon } from "./token-icon";
import { InfoCard } from "./info-card";
import { InfoRow } from "./info-row";
import { Button } from "../../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
import { ChevronRight, Fuel, Info } from "lucide-react";

const usd = (value?: number) =>
  value !== undefined ? `$${value.toFixed(2)}` : "—";

export interface ConfirmationDetails {
  sourceLabel: string;
  sourceTokenLogo?: string;
  estimatedTime?: string;
  sendTokenSymbol: string;
  sendAmount: number;
  sendTokenLogo?: string;
  receiveTokenSymbol: string;
  receiveAmount: number;
  receiveTokenLogo?: string;
  networkCost?: number;
  sourceChainGas?: number;
  destinationChainGas?: number;
  priceImpact?: number;
  maxSlippage?: number;
}

interface ConfirmationStepProps {
  amount: number;
  details: ConfirmationDetails;
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
}: ConfirmationStepProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-background">
      <DepositHeader
        title={title}
        onBack={onBack}
        countdown={countdown}
        showClose={false}
      />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="text-center py-2">
          <p className="text-4xl font-light text-foreground">
            ${amount.toFixed(2)}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-sm">
            <TokenIcon
              symbol={details.receiveTokenSymbol}
              tokenLogo={details.receiveTokenLogo}
              size="sm"
            />
            <span>
              {details.receiveAmount.toFixed(6)} {details.receiveTokenSymbol}
            </span>
          </div>
        </div>

        <InfoCard>
          <InfoRow
            label="Source"
            value={
              <div className="flex items-center gap-2">
                <TokenIcon
                  symbol={details.sendTokenSymbol}
                  tokenLogo={details.sourceTokenLogo}
                  size="sm"
                />
                <span>{details.sourceLabel}</span>
              </div>
            }
          />
          <div className="border-t border-border" />
          <InfoRow
            label="Estimated time"
            value={details.estimatedTime ?? "Few seconds"}
          />
        </InfoCard>

        <InfoCard>
          <InfoRow
            label="You send"
            value={
              <div className="flex items-center gap-2">
                <TokenIcon
                  symbol={details.sendTokenSymbol}
                  tokenLogo={details.sendTokenLogo}
                  size="sm"
                />
                <span>
                  {details.sendAmount.toFixed(6)} {details.sendTokenSymbol}
                </span>
              </div>
            }
          />
          <div className="border-t border-border" />
          <InfoRow
            label="You receive"
            value={
              <div className="flex items-center gap-2">
                <TokenIcon
                  symbol={details.receiveTokenSymbol}
                  tokenLogo={details.receiveTokenLogo}
                  size="sm"
                />
                <span>
                  {details.receiveAmount.toFixed(6)} {details.receiveTokenSymbol}
                </span>
              </div>
            }
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
                            Source gas: {usd(details.sourceChainGas)}
                          </p>
                          <p className="text-xs">
                            Destination gas: {usd(details.destinationChainGas)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  }
                  value={
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                      {usd(details.networkCost)}
                    </span>
                  }
                />
                <div className="border-t border-border" />
                <InfoRow
                  label={
                    <span className="flex items-center gap-1">
                      Price impact
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Estimated market impact for this trade.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  }
                  value={
                    details.priceImpact !== undefined
                      ? `${details.priceImpact.toFixed(2)}%`
                      : "—"
                  }
                />
                <div className="border-t border-border" />
                <InfoRow
                  label={
                    <span className="flex items-center gap-1">
                      Max slippage
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Maximum price movement allowed before reverting.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  }
                  value={
                    details.maxSlippage !== undefined
                      ? `Auto · ${details.maxSlippage.toFixed(2)}%`
                      : "Auto"
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
          <a href="#" className="text-foreground underline">
            terms
          </a>
          .
        </p>
        <Button
          onClick={onConfirm}
          className="h-12 w-full rounded-xl text-base font-semibold"
        >
          Confirm order
        </Button>
      </div>
    </div>
  );
};

