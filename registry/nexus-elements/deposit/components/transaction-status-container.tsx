"use client";

import { CardContent, CardFooter } from "../../ui/card";
import WidgetHeader from "./widget-header";
import { TransactionSteps } from "./transaction-steps";
import { AmountDisplay } from "./amount-display";
import type { DepositWidgetContextValue } from "../types";
import { useMemo } from "react";

interface TransactionStatusContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

function TransferIndicator({ isProcessing }: { isProcessing: boolean }) {
  const baseClasses = "w-2 h-2 transition-all duration-300";

  if (isProcessing) {
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
  const { steps, timer, confirmationDetails, isProcessing, isSuccess, isError, txError } = widget;

  const handleComplete = () => {
    setTimeout(() => {
      widget.goToStep("transaction-complete");
    }, 1000);
  };

  const getStatusMessage = () => {
    if (isError && txError) {
      return <span className="text-destructive">{txError}</span>;
    }
    if (isSuccess) return "Transaction complete";
    if (isProcessing) return "Processing transaction...";
    return "Verifying intent";
  };

  const formattedTimer = useMemo(() => {
    const minutes = Math.floor(timer / 60);
    const seconds = Math.floor(timer % 60);
    const ms = Math.floor((timer % 1) * 10);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}.${ms}`;
    }
    return `${seconds}.${ms}s`;
  }, [timer]);

  const spendAmount = confirmationDetails?.amountSpent ?? "0";
  const receiveAmount = confirmationDetails?.receiveAmountAfterSwap ?? "0";
  const receiveTokenSymbol = confirmationDetails?.receiveTokenSymbol ?? "USDC";
  const chainName = "destination";

  return (
    <>
      <WidgetHeader title="Deposit USDC" onClose={onClose} />
      <CardContent>
        <div className="flex flex-col bg-base rounded-lg border border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] pt-8 pb-7">
          <div className="flex w-full mt-2 items-end justify-center">
            <div className="flex gap-7 items-center">
              <AmountDisplay
                amount={spendAmount}
                suffix="USD"
                label={`${confirmationDetails?.sources.filter(s => s).length ?? 0} assets`}
              />
              <div className="flex w-16 gap-1.5 items-center justify-center">
                <TransferIndicator isProcessing={isProcessing} />
              </div>
              <AmountDisplay
                amount={receiveAmount}
                suffix={receiveTokenSymbol}
                label={`on ${chainName}`}
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
            steps={steps}
            timer={formattedTimer}
            onComplete={handleComplete}
          />
        </div>
      </CardContent>
      <CardFooter />
    </>
  );
};

export default TransactionStatusContainer;
