"use client";

import SummaryCard from "./summary-card";
import { GasPumpIcon, CoinIcon } from "./icons";
import WidgetHeader from "./widget-header";
import { ReceiveAmountDisplay } from "./receive-amount-display";
import type { DepositWidgetContextValue } from "../types";
import { Button } from "../../ui/button";
import { CardContent } from "../../ui/card";
import { usdFormatter } from "../../common";

interface ConfirmationContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const ConfirmationContainer = ({
  widget,
  onClose,
}: ConfirmationContainerProps) => {
  const { confirmationDetails, feeBreakdown, handleConfirmOrder, isProcessing } =
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
          </div>
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
};

export default ConfirmationContainer;
