"use client";

import { CardContent, CardFooter } from "../../ui/card";
import WidgetHeader from "./widget-header";
import { AmountDisplay } from "./amount-display";
import { TransactionSteps, type SimplifiedStep } from "./transaction-steps";
import type { DepositWidgetContextValue } from "../types";
import { useMemo } from "react";
import { usdFormatter } from "../../common";
import { useNexus } from "../../nexus/NexusProvider";

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
  const { steps, confirmationDetails, activeIntent, isProcessing } = widget;

  const receiveAmount = confirmationDetails?.receiveAmountAfterSwap ?? "0";
  const receiveTokenSymbol = confirmationDetails?.receiveTokenSymbol ?? "USDC";
  const destinationChainName =
    activeIntent?.intent?.destination?.chain?.name ?? "destination";
  const sourceCount = activeIntent?.intent?.sources?.length ?? 0;
  const spendAmountUsd = widget?.confirmationDetails?.amountSpent ?? 0;

  // Derive 3 simplified steps from actual SDK events
  const simplifiedSteps = useMemo((): SimplifiedStep[] => {
    const hasRffId = steps.some((s) => s.step.type === "RFF_ID" && s.completed);
    // Use SOURCE_SWAP_HASH for "Collecting on Source" step
    const hasSourceSwapHash = steps.some(
      (s) => s.step.type === "DESTINATION_SWAP_HASH" && s.completed,
    );
    // Deposit transaction only completes when the entire transaction succeeds
    const isTransactionComplete = widget.isSuccess;

    return [
      {
        id: "intent-verification",
        label: "Intent Verification",
        completed: hasRffId,
      },
      {
        id: "collecting-on-source",
        label: "Collecting on Source",
        completed: hasSourceSwapHash,
      },
      {
        id: "deposit-transaction",
        label: "Deposit transaction",
        completed: isTransactionComplete,
      },
    ];
  }, [steps, widget.isSuccess]);

  // Calculate progress as 33% -> 66% -> 100%
  const progress = useMemo(() => {
    const completedCount = simplifiedSteps.filter((s) => s.completed).length;
    return Math.round((completedCount / 3) * 100);
  }, [simplifiedSteps]);

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
            <div className="flex justify-between items-center w-full px-3 gap-x-3">
              <AmountDisplay
                amount={usdFormatter.format(spendAmountUsd)}
                suffix="USD"
                label={`${sourceCount} asset${sourceCount !== 1 ? "s" : ""}`}
              />
              <div className="flex w-16 gap-1.5 items-center justify-center">
                <TransferIndicator isProcessing={isProcessing} />
              </div>
              <AmountDisplay
                amount={receiveAmount.split(" ")[0]}
                suffix={receiveTokenSymbol}
                label={`on ${destinationChainName}`}
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
            <div
              className="absolute bottom-0 left-0 h-1 bg-primary animate-progress"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
          <div className="py-5 mt-1 font-sans text-sm leading-4.5 text-muted-foreground text-center">
            {getStatusMessage()}
          </div>
          <TransactionSteps steps={simplifiedSteps} />
        </div>
      </CardContent>
      <CardFooter />
    </>
  );
};

export default TransactionStatusContainer;
