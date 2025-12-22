"use client";

import { CardContent } from "./ui/card";
import { Button } from "./ui/button";
import WidgetHeader from "./widget-header";
import { ReceiveAmountDisplay } from "./receive-amount-display";
import {
  MOCK_DEMO_VALUES,
  MOCK_FEES,
  MOCK_TIME_ESTIMATES,
  MOCK_TRANSACTION,
} from "../constants";
import type { DepositWidgetContextValue } from "../types";

interface TransactionCompleteContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const TransactionCompleteContainer = ({
  widget,
  onClose,
}: TransactionCompleteContainerProps) => {
  const handleNewDeposit = () => {
    widget.reset();
    widget.goToStep("deposit-options");
  };

  const handleClose = () => {
    widget.reset();
    onClose?.();
  };

  return (
    <>
      <WidgetHeader title="Deposit USDC" onClose={onClose} />
      <CardContent>
        <div className="flex flex-col">
          <div className="bg-base border-t border-l border-r border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] px-6 pt-6 pb-1 flex flex-col items-center gap-5">
            <ReceiveAmountDisplay
              label="You received"
              amount={MOCK_DEMO_VALUES.receiveAmountFormatted}
              timeLabel={MOCK_TIME_ESTIMATES.completion}
            />
            <span className="font-sans text-sm w-full text-center leading-4.5 text-muted-foreground">
              Transaction successful
            </span>
            <div className="w-full">
              <div className="border-t py-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm leading-4.5 text-card-foreground">
                    EVM transaction
                  </span>
                  <a
                    href={widget.explorerUrls?.intentUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-muted-foreground text-sm leading-4.5 underline cursor-pointer hover:text-primary transition-colors"
                  >
                    {MOCK_TRANSACTION.txHash}
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-sans text-sm leading-4.5 text-card-foreground">
                    Deposit transaction
                  </span>
                  <span className="font-sans text-muted-foreground text-sm leading-4.5 underline cursor-pointer">
                    {MOCK_TRANSACTION.depositTxHash}
                  </span>
                </div>
              </div>

              <div className="border-t py-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-sans text-sm leading-4.5 text-card-foreground">
                      Total fees
                    </span>
                    <span className="font-sans text-[13px] text-muted-foreground leading-4.5">
                      {MOCK_FEES.description}
                    </span>
                  </div>
                  <span className="font-sans text-muted-foreground text-sm leading-4.5">
                    {MOCK_FEES.totalFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full">
            <Button className="w-1/2" onClick={handleNewDeposit}>
              New Deposit
            </Button>
            <Button className="w-1/2" variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default TransactionCompleteContainer;
