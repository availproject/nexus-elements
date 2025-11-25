"use client";

import { useState } from "react";
import { DepositHeader } from "./deposit-header";
import { StepIndicator } from "./step-indicator";
import { TokenIcon } from "./token-icon";
import { InfoCard } from "./info-card";
import { InfoRow } from "./info-row";
import { Button } from "../../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { ChevronRight, ExternalLink, Info } from "lucide-react";

interface ProcessingDetails {
  sourceLabel: string;
  sourceTokenLogo?: string;
  networkCost?: number;
  priceImpact?: number;
}

interface ProcessingStepProps {
  step: "swap" | "deposit";
  details: ProcessingDetails;
  receiveAmount: number;
  receiveSymbol: string;
  onClose: () => void;
  onNewDeposit: () => void;
}

const usd = (value?: number) =>
  value !== undefined ? `$${value.toFixed(2)}` : "—";

export const ProcessingStep = ({
  step,
  details,
  receiveAmount,
  receiveSymbol,
  onClose,
  onNewDeposit,
}: ProcessingStepProps) => {
  const [open, setOpen] = useState(false);
  const isSwap = step === "swap";
  const title = isSwap
    ? "Submitting transaction..."
    : "Depositing into your account...";
  const subtitle = isSwap
    ? "Filling your transaction on the blockchain."
    : "It will take a few seconds to finalize.";

  return (
    <div className="flex h-full flex-col bg-background">
      <DepositHeader title="Deposit USDC" onClose={onClose} showBack={false} showClose />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <StepIndicator currentStep={isSwap ? 1 : 2} step1Complete={!isSwap} />

        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <InfoCard>
          <InfoRow label="Fill status" value="Processing" />
        </InfoCard>

        <InfoCard>
          <InfoRow
            label="Source"
            value={
              <div className="flex items-center gap-2">
                <TokenIcon
                  symbol="SRC"
                  tokenLogo={details.sourceTokenLogo}
                  size="sm"
                />
                <span>{details.sourceLabel}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            }
          />
        </InfoCard>

        <InfoCard>
          <InfoRow
            label="You receive"
            value={
              <div className="flex items-center gap-2">
                <TokenIcon symbol={receiveSymbol} size="sm" />
                <span>
                  {receiveAmount.toFixed(6)} {receiveSymbol}
                </span>
              </div>
            }
          />
        </InfoCard>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <span>More details</span>
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                open ? "rotate-90" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <InfoCard className="space-y-0">
              <InfoRow label="Network cost" value={usd(details.networkCost)} />
              <div className="border-t border-border" />
              <InfoRow
                label="Price impact"
                value={
                  details.priceImpact !== undefined
                    ? `${details.priceImpact.toFixed(2)}%`
                    : "—"
                }
              />
            </InfoCard>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4" />
          Experiencing problems?{" "}
          <a href="#" className="text-foreground underline">
            Get help
          </a>
        </div>
      </div>

      <div className="flex gap-3 border-t border-border p-4">
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1 rounded-xl text-base"
        >
          Close
        </Button>
        <Button
          onClick={onNewDeposit}
          className="flex-1 rounded-xl text-base"
        >
          New deposit
        </Button>
      </div>
    </div>
  );
};

