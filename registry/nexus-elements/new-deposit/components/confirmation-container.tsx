"use client";

import { CardContent } from "./ui/card";
import { Button } from "./ui/button";
import SummaryCard from "./summary-card";
import { GasPumpIcon, CoinIcon } from "./icons";
import WidgetHeader from "./widget-header";
import { ReceiveAmountDisplay } from "./receive-amount-display";
import { MOCK_DEMO_VALUES, MOCK_FEES, MOCK_TIME_ESTIMATES } from "../constants";
import type { DepositWidgetContextValue } from "../types";

interface ConfirmationContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const ConfirmationContainer = ({ widget, onClose }: ConfirmationContainerProps) => {
  return (
    <>
      <WidgetHeader title="Deposit USDC" onBack={widget.goBack} onClose={onClose} />
      <CardContent>
        <div className="flex flex-col">
          <div className="bg-base border-t border-l border-r shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] px-6 pt-10 pb-1 flex flex-col gap-10">
            <ReceiveAmountDisplay
              amount={MOCK_DEMO_VALUES.receiveAmountFormatted}
              timeLabel={MOCK_TIME_ESTIMATES.confirmation}
            />
            <div>
              <SummaryCard
                icon={<CoinIcon className="w-5 h-5 text-muted-foreground" />}
                title="You spend"
                subtitle={MOCK_DEMO_VALUES.assetSummary}
                value={MOCK_DEMO_VALUES.receiveAmount}
                valueSuffix="USDC"
                showBreakdown
              />
              <SummaryCard
                icon={<GasPumpIcon className="w-5 h-5 text-muted-foreground" />}
                title="Total fees"
                subtitle={MOCK_FEES.description}
                value={MOCK_FEES.totalUsd}
                valueSuffix="USD"
                showBreakdown
              />
            </div>
          </div>
          <Button
            onClick={() => {
              widget.startTransaction();
              widget.goToStep("transaction-status");
            }}
            disabled={widget.isProcessing}
          >
            {widget.isProcessing ? "Processing..." : "Confirm transaction"}
          </Button>
        </div>
      </CardContent>
    </>
  );
};

export default ConfirmationContainer;
