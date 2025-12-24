"use client";

import { CardContent, CardFooter } from "./ui/card";
import WidgetHeader from "./widget-header";
import { TransactionSteps } from "./transaction-steps";
import { AmountDisplay } from "./amount-display";
import {
  MOCK_DEMO_VALUES,
  MOCK_TRANSACTION,
  TRANSACTION_STEPS,
} from "../constants";
import type { DepositWidgetContextValue } from "../types";

interface TransactionStatusContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

function TransferIndicator({ isProcessing }: { isProcessing: boolean }) {
  const baseClasses = "w-2 h-2 transition-all duration-300";

  if (isProcessing) {
    // Animated wave effect when processing
    return (
      <>
        <div
          className={`${baseClasses} bg-primary animate-transfer-wave`}
          style={{ animationDelay: "0ms" }}
        />
        <div
          className={`${baseClasses} bg-primary animate-transfer-wave`}
          style={{ animationDelay: "100ms" }}
        />
        <div
          className={`${baseClasses} bg-primary animate-transfer-wave`}
          style={{ animationDelay: "200ms" }}
        />
        <div
          className={`${baseClasses} bg-primary animate-transfer-wave`}
          style={{ animationDelay: "300ms" }}
        />
        <div
          className={`${baseClasses} bg-primary animate-transfer-wave`}
          style={{ animationDelay: "400ms" }}
        />
      </>
    );
  }

  return (
    <>
      <div className={`${baseClasses} bg-primary/10`} />
      <div className={`${baseClasses} bg-primary/50`} />
      <div className={`${baseClasses} bg-primary`} />
      <div className={`${baseClasses} bg-primary/50`} />
      <div className={`${baseClasses} bg-primary/10`} />
    </>
  );
}

const TransactionStatusContainer = ({
  widget,
  onClose,
}: TransactionStatusContainerProps) => {
  const handleComplete = () => {
    setTimeout(() => {
      widget.goToStep("transaction-complete");
    }, 1000);
  };

  const getStatusMessage = () => {
    if (widget.isError && widget.txError) {
      return <span className="text-destructive">{widget.txError}</span>;
    }
    if (widget.isSuccess) return "Transaction complete";
    if (widget.isProcessing) return "Processing transaction...";
    return "Verifying intent";
  };

  return (
    <>
      <WidgetHeader title="Deposit USDC" onClose={onClose} />
      <CardContent>
        <div className="flex flex-col bg-base rounded-lg border border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] pt-8 pb-7">
          <div className="flex w-full mt-2 items-end justify-center">
            <div className="flex gap-7 items-center">
              <AmountDisplay
                amount={MOCK_DEMO_VALUES.spendAmount}
                suffix="USD"
                label={`${MOCK_DEMO_VALUES.assetCount} assets`}
              />
              <div className="flex w-[64px] gap-1.5 items-center justify-center">
                <TransferIndicator isProcessing={widget.isProcessing} />
              </div>
              <AmountDisplay
                amount={MOCK_DEMO_VALUES.receiveAmount}
                suffix="USDC"
                label="on Arbitrum"
              />
            </div>
          </div>
          <div
            className="w-full h-10 relative"
            style={{
              background:
                "linear-gradient(0deg, rgba(0, 107, 244, 0.15) 0%, rgba(255, 255, 255, 0.00) 90.79%)",
            }}
          >
            <div className="absolute bottom-0 left-0 h-1 bg-primary animate-progress" />
          </div>
          <div className="py-5 mt-1 font-sans text-sm leading-4.5 text-muted-foreground text-center">
            {getStatusMessage()}
          </div>
          <TransactionSteps
            steps={[...TRANSACTION_STEPS]}
            totalDuration={MOCK_TRANSACTION.stepsDurationMs}
            onComplete={handleComplete}
          />
        </div>
      </CardContent>
      <CardFooter />
    </>
  );
};

export default TransactionStatusContainer;
