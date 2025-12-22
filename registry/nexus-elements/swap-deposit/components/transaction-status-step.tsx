"use client";

import { useState } from "react";
import { DepositHeader } from "./deposit-header";
import { StepIndicator } from "./step-indicator";
import { TokenIcon } from "./token-icon";
import { InfoRow, InfoCard } from "./info";
import { Button } from "../../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/nexus-elements/ui/collapsible";
import { ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { type AssetSelection } from "./asset-select";
import { type TransactionStatus } from "../hooks/useSwapDeposit";
import { cn } from "@/lib/utils";

interface DepositStatusDetails {
  sourceLabel: string;
  sources?: (AssetSelection | undefined)[];
  gasTokenSymbol?: string;
  networkCost?: number;
  priceImpact?: number;
  successTitle?: string;
}

interface TransactionStatusStepProps {
  details: DepositStatusDetails;
  receiveAmount: string;
  status: TransactionStatus;
  tokenLogo: string;
  totalTime?: string;
  onClose: () => void;
  onNewDeposit: () => void;
  explorerUrls: {
    source: string | null;
    destination: string | null;
    depositUrl: string | null;
  };
}

const TransactionStatusStep = ({
  details,
  receiveAmount,
  onClose,
  onNewDeposit,
  status,
  tokenLogo,
  totalTime,
  explorerUrls,
}: TransactionStatusStepProps) => {
  const [open, setOpen] = useState(false);
  const isSuccessView = status === "success";
  const headerTitle = isSuccessView
    ? (details.successTitle ?? details.sourceLabel)
    : details.sourceLabel;
  const processingTitle =
    status === "swapping"
      ? "Submitting transaction..."
      : "Depositing into your account...";
  const processingSubtitle =
    status === "swapping"
      ? "Filling your transaction on the blockchain."
      : "It will take a few seconds to finalize.";
  const title = isSuccessView ? "Deposit successful" : processingTitle;
  const subtitle = isSuccessView
    ? "Your funds were successfully deposited."
    : processingSubtitle;
  const isSwap = status === "swapping";
  const currentStep = isSwap ? 1 : 2;
  return (
    <div className="flex h-full flex-col bg-background no-scrollbar">
      <DepositHeader
        title={headerTitle || "Deposit"}
        onClose={onClose}
        showBack={false}
        showClose
      />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <StepIndicator currentStep={currentStep} stepComplete={isSuccessView} />
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <InfoCard>
          <InfoRow
            label="Fill status"
            value={
              isSuccessView ? (
                <span className="text-success font-semibold">Successful</span>
              ) : (
                "Processing"
              )
            }
          />
          {isSuccessView && (
            <InfoRow label="Total time" value={totalTime ?? "—"} />
          )}
        </InfoCard>

        {isSuccessView ? (
          <InfoCard>
            {explorerUrls?.source && (
              <InfoRow
                label="Source Swap Hash"
                value={
                  <div className="flex items-center gap-2">
                    <a href={explorerUrls.source} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </div>
                }
              />
            )}

            {explorerUrls?.destination && (
              <InfoRow
                label="Destination Swap Hash"
                value={
                  <div className="flex items-center gap-2">
                    <a href={explorerUrls.destination} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </div>
                }
              />
            )}
            {explorerUrls?.depositUrl && (
              <InfoRow
                label="Deposit Hash"
                value={
                  <div className="flex items-center gap-2">
                    <a href={explorerUrls.depositUrl} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </div>
                }
              />
            )}
          </InfoCard>
        ) : (
          <InfoCard>
            <InfoRow
              label="Sources"
              value={
                <div className="flex items-center gap-2">
                  {details.sources?.map((source, index) => (
                    <TokenIcon
                      key={
                        source?.tokenAddress ??
                        source?.symbol ??
                        `source-${index}`
                      }
                      symbol={source?.symbol}
                      tokenLogo={source?.tokenLogo}
                      chainLogo={source?.chainLogo}
                      size="sm"
                      className={cn(
                        "last:mr-0",
                        index !== (details.sources?.length ?? 0) - 1 && "-mr-3",
                      )}
                    />
                  ))}
                  <span>{details.sourceLabel}</span>
                  {explorerUrls?.source && (
                    <a href={explorerUrls.source} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
              }
            />
            {explorerUrls?.destination && (
              <InfoRow
                label="Destination Swap Hash"
                value={
                  <div className="flex items-center gap-2">
                    <a href={explorerUrls.destination} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </div>
                }
              />
            )}
          </InfoCard>
        )}

        <InfoCard>
          <InfoRow
            label={isSuccessView ? "You received" : "You receive"}
            value={
              <div className="flex items-center gap-2">
                <TokenIcon symbol={tokenLogo} size="sm" />
                <span>{receiveAmount}</span>
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
              <InfoRow
                label="Network cost"
                value={
                  typeof details?.networkCost === "number"
                    ? `$${details.networkCost}`
                    : "—"
                }
              />
            </InfoCard>
          </CollapsibleContent>
        </Collapsible>
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
          disabled={!isSuccessView}
        >
          {isSuccessView ? (
            "New Deposit"
          ) : (
            <Loader2 className="size-5 animate-spin" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default TransactionStatusStep;
