"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import SummaryCard from "./summary-card";
import { GasPumpIcon, CoinIcon } from "./icons";
import WidgetHeader from "./widget-header";
import { ReceiveAmountDisplay } from "./receive-amount-display";
import { ErrorBanner } from "./error-banner";
import type { DepositWidgetContextValue } from "../types";
import { Button } from "../../ui/button";
import { CardContent } from "../../ui/card";
import { usdFormatter } from "../../common";
import { formatTokenBalance } from "@avail-project/nexus-core";
import { useNexus } from "../../nexus/NexusProvider";

interface ConfirmationContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const ConfirmationContainer = ({
  widget,
  onClose,
}: ConfirmationContainerProps) => {
  const [showSpendDetails, setShowSpendDetails] = useState(false);
  const [showFeeDetails, setShowFeeDetails] = useState(false);
  const { getFiatValue } = useNexus();

  const {
    confirmationDetails,
    feeBreakdown,
    handleConfirmOrder,
    isProcessing,
    txError,
    activeIntent,
    simulationLoading,
  } = widget;

  const isLoading = simulationLoading || !activeIntent;

  const receiveAmount =
    confirmationDetails?.receiveAmountAfterSwapUsd?.toFixed(2) ?? "0";
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
      chainName: source.chain.name,
      chainLogo: source.chain.logo,
      tokenSymbol: source.token.symbol,
      tokenDecimals: source.token.decimals,
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
              loading={isLoading}
            />
            <div>
              <SummaryCard
                icon={<CoinIcon className="w-5 h-5 text-muted-foreground" />}
                title="You spend"
                subtitle={
                  isLoading
                    ? "Calculating..."
                    : tokenNamesSummary || "Selected assets"
                }
                value={amountSpent}
                valueSuffix="USD"
                showBreakdown={!isLoading && sourceDetails.length > 0}
                loading={isLoading}
                expanded={showSpendDetails}
                onToggleExpand={() => setShowSpendDetails(!showSpendDetails)}
              >
                <div className="space-y-4">
                  {sourceDetails.map((source, index) => {
                    const amountUsd = getFiatValue(
                      parseFloat(source.amount),
                      source.tokenSymbol,
                    );
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {source.chainLogo && (
                            <Image
                              src={source.chainLogo}
                              alt={source.chainName}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-sans text-sm text-card-foreground">
                              {source.tokenSymbol}
                            </span>
                            <span className="font-sans text-[13px] text-muted-foreground">
                              {source.chainName}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 items-end">
                          <span className="font-sans text-sm text-card-foreground">
                            {usdFormatter.format(amountUsd)}
                          </span>
                          <span className="font-sans text-[13px] text-muted-foreground">
                            {formatTokenBalance(parseFloat(source.amount), {
                              decimals: source.tokenDecimals,
                              symbol: source.tokenSymbol,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SummaryCard>
              <SummaryCard
                icon={<GasPumpIcon className="w-5 h-5 text-muted-foreground" />}
                title="Total fees"
                subtitle="Network & protocol"
                value={feeBreakdown.gasFormatted}
                valueSuffix="USD"
                showBreakdown={!isLoading}
                loading={isLoading}
                expanded={showFeeDetails}
                onToggleExpand={() => setShowFeeDetails(!showFeeDetails)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-sans text-sm text-muted-foreground">
                    Gas fee
                  </span>
                  <span className="font-sans text-sm text-card-foreground">
                    {usdFormatter.format(feeBreakdown.gasUsd)}
                  </span>
                </div>
              </SummaryCard>
            </div>
          </div>
          {txError && widget.status === "error" && (
            <ErrorBanner message={txError} />
          )}
          <Button
            className="rounded-t-none"
            onClick={handleConfirmOrder}
            disabled={isProcessing || isLoading}
          >
            {isProcessing
              ? "Processing..."
              : isLoading
                ? "Loading..."
                : "Confirm and deposit"}
          </Button>
        </div>
      </CardContent>
    </>
  );
};

export default ConfirmationContainer;
