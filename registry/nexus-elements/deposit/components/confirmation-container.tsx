"use client";

import { useState, useMemo } from "react";
import SummaryCard from "./summary-card";
import { GasPumpIcon, CoinIcon, ChevronDownIcon, ChevronUpIcon } from "./icons";
import WidgetHeader from "./widget-header";
import { ReceiveAmountDisplay } from "./receive-amount-display";
import { ErrorBanner } from "./error-banner";
import type { DepositWidgetContextValue } from "../types";
import { Button } from "../../ui/button";
import { CardContent } from "../../ui/card";

interface ConfirmationContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const ConfirmationContainer = ({
  widget,
  onClose,
}: ConfirmationContainerProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const { confirmationDetails, feeBreakdown, handleConfirmOrder, isProcessing, txError, activeIntent } =
    widget;

  const receiveAmount = confirmationDetails?.receiveAmountAfterSwap ?? "0";
  const timeLabel = confirmationDetails?.estimatedTime ?? "~30s";
  const amountSpent = confirmationDetails?.amountSpent ?? "0";
  const tokenNames = confirmationDetails?.sources
    .filter((s) => s)
    .map((s) => s?.symbol)
    .slice(0, 2)
    .join(", ");
  const moreCount =
    (confirmationDetails?.sources.filter((s) => s).length ?? 0) - 2;
  const tokenNamesSummary =
    moreCount > 0 ? `${tokenNames} + ${moreCount} more` : tokenNames;

  const sourceDetails = useMemo(() => {
    if (!activeIntent?.intent.sources) return [];
    return activeIntent.intent.sources.map((source) => ({
      chain: source.chain.name,
      chainLogo: source.chain.logo,
      token: source.token.symbol,
      amount: source.amount,
    }));
  }, [activeIntent]);

  return (
    <>
      <WidgetHeader
        title="Deposit USDC"
        onBack={widget.goBack}
        onClose={onClose}
      />
      <CardContent>
        <div className="flex flex-col">
          <div className="bg-base rounded-t-lg border-t border-l border-r shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] px-6 pt-10 pb-1 flex flex-col gap-6">
            <ReceiveAmountDisplay
              amount={receiveAmount}
              timeLabel={timeLabel}
            />
            <div>
              <SummaryCard
                icon={<CoinIcon className="w-5 h-5 text-muted-foreground" />}
                title="You spend"
                subtitle={tokenNamesSummary || "Selected assets"}
                value={amountSpent}
                valueSuffix="USD"
                showBreakdown
              />
              <SummaryCard
                icon={<GasPumpIcon className="w-5 h-5 text-muted-foreground" />}
                title="Total fees"
                subtitle="Network & protocol"
                value={feeBreakdown.gasFormatted}
                valueSuffix="USD"
                showBreakdown
              />
            </div>

            {sourceDetails.length > 0 && (
              <div className="border-t pt-4">
                <button
                  className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <span>View details</span>
                  {showDetails ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>

                {showDetails && (
                  <div className="mt-4 space-y-3">
                    {sourceDetails.map((source, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {source.chainLogo && (
                            <img
                              src={source.chainLogo}
                              alt={source.chain}
                              className="w-5 h-5 rounded-full"
                            />
                          )}
                          <span>{source.chain}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {Number(source.amount).toFixed(6)} {source.token}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {txError && widget.status === "error" && (
            <ErrorBanner message={txError} />
          )}
          <Button
            className="rounded-t-none"
            onClick={handleConfirmOrder}
            disabled={isProcessing}
          >
            {isProcessing
              ? "Processing..."
              : "Confirm and deposit"}
          </Button>
        </div>
      </CardContent>
    </>
  );
}

export default ConfirmationContainer;
