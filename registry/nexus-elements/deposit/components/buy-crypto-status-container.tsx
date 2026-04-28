"use client";

import { useEffect, useRef } from "react";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import type { UseMeldReturn } from "../hooks/use-meld";
import { CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { CheckIcon } from "./icons";
import { TOKEN_IMAGES } from "../constants/assets";
import { CHAIN_ID_TO_NAME, type MeldTransactionStatus } from "../constants/meld";

interface BuyCryptoStatusContainerProps {
  widget: DepositWidgetContextValue;
  meld: UseMeldReturn;
  heading?: string;
  onClose?: () => void;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type StepState = "completed" | "active" | "pending";

function getStepStates(status: MeldTransactionStatus | undefined): [StepState, StepState, StepState] {
  switch (status) {
    case "COMPLETED":
    case "SETTLED":
      return ["completed", "completed", "completed"];
    case "SETTLING":
      return ["completed", "completed", "active"];
    case "PENDING":
      return ["completed", "active", "pending"];
    case "INITIATED":
      return ["active", "pending", "pending"];
    case "FAILED":
    case "CANCELLED":
      return ["completed", "pending", "pending"];
    default:
      return ["active", "pending", "pending"];
  }
}

function StepIndicator({ state, number }: { state: StepState; number: number }) {
  if (state === "completed") {
    return (
      <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <CheckIcon size={14} className="text-emerald-400" />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="h-6 w-6 rounded-full border-2 border-emerald-400 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    );
  }
  return (
    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
      <span className="text-[11px] text-muted-foreground font-sans">
        {number}
      </span>
    </div>
  );
}

const BuyCryptoStatusContainer = ({
  widget,
  meld,
  onClose,
}: BuyCryptoStatusContainerProps) => {
  const hasStartedPolling = useRef(false);

  const quote = meld.quote;
  const tx = meld.transaction;
  const tokenSymbol = widget.destination.tokenSymbol;
  const chainLabel = CHAIN_ID_TO_NAME[widget.destination.chainId] ?? `Chain ${widget.destination.chainId}`;
  const providerName =
    quote?.serviceProviderName || quote?.serviceProvider || "Provider";

  // Start polling if we have a transaction ID
  useEffect(() => {
    if (hasStartedPolling.current) return;
    if (meld.transactionId) {
      hasStartedPolling.current = true;
      meld.pollTransactionStatus(meld.transactionId);
    }
  }, [meld.transactionId, meld.pollTransactionStatus]);

  const isTerminal =
    tx?.status === "COMPLETED" ||
    tx?.status === "SETTLED" ||
    tx?.status === "FAILED" ||
    tx?.status === "CANCELLED";
  const isSuccess = tx?.status === "COMPLETED" || tx?.status === "SETTLED";
  const isFailed = tx?.status === "FAILED" || tx?.status === "CANCELLED";

  const stepStates = getStepStates(tx?.status);

  const handleClose = () => {
    meld.resetMeld();
    widget.reset();
    onClose?.();
  };

  const handleTryAgain = () => {
    meld.resetMeld();
    widget.goToStep("buy-crypto");
  };

  // --- Success state ---
  if (isSuccess) {
    return (
      <>
        <WidgetHeader
          title="Deposit complete"
          onClose={onClose}
          depositTargetLogo={widget.destination.depositTargetLogo}
        />
        <CardContent>
          <div className="flex flex-col">
            <div className="bg-base rounded-t-lg border-t border-l border-r border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] px-6 pt-6 pb-1 flex flex-col items-center gap-5">
              {/* Success icon */}
              <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckIcon size={28} className="text-emerald-400" />
              </div>

              {/* Title */}
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-lg font-medium tracking-[0.36px] text-center">
                  {tx?.destinationAmount ?? quote?.destinationAmount ?? ""}{" "}
                  {tokenSymbol} deposited
                </span>
                <span className="text-sm text-muted-foreground font-sans">
                  on {chainLabel}
                </span>
              </div>

              {/* Summary */}
              <div className="w-full border-t py-5 flex flex-col gap-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground font-sans">
                    Paid
                  </span>
                  <span className="text-sm text-card-foreground font-sans tabular-nums">
                    {formatUsd(tx?.sourceAmount ?? quote?.sourceAmount ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground font-sans">
                    Received
                  </span>
                  <span className="text-sm text-card-foreground font-sans">
                    {tx?.destinationAmount ?? quote?.destinationAmount ?? "—"}{" "}
                    {tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground font-sans">
                    Provider
                  </span>
                  <span className="text-sm text-card-foreground font-sans">
                    {providerName}
                  </span>
                </div>
                {tx?.transactionHash && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground font-sans">
                      Tx hash
                    </span>
                    <span className="text-sm text-card-foreground font-sans font-mono">
                      {tx.transactionHash.slice(0, 6)}...
                      {tx.transactionHash.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button className="rounded-t-none" onClick={handleClose}>
              Done
            </Button>
          </div>
        </CardContent>
      </>
    );
  }

  // --- Failed state ---
  if (isFailed) {
    return (
      <>
        <WidgetHeader
          title="Purchase failed"
          onClose={onClose}
        />
        <CardContent>
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="h-14 w-14 rounded-full bg-red-500/15 flex items-center justify-center">
              <span className="text-2xl text-red-400">!</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="font-display text-lg font-medium tracking-[0.36px]">
                Transaction {tx?.status === "CANCELLED" ? "cancelled" : "failed"}
              </span>
              <span className="text-sm text-muted-foreground font-sans text-center">
                Your purchase via {providerName} could not be completed
              </span>
            </div>
            <div className="flex gap-3 w-full">
              <Button className="flex-1" onClick={handleTryAgain}>
                Try again
              </Button>
              <Button
                className="flex-1"
                variant="secondary"
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </>
    );
  }

  // --- Pending/processing state ---
  return (
    <>
      <WidgetHeader
        title="Purchase status"
        onClose={onClose}
        depositTargetLogo={widget.destination.depositTargetLogo}
      />
      <CardContent>
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Animated processing icon */}
          <div className="h-16 w-16 rounded-full border-2 border-dashed border-emerald-400/50 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
            {TOKEN_IMAGES[tokenSymbol] ? (
              <img
                src={TOKEN_IMAGES[tokenSymbol]}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
                alt={tokenSymbol}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted" />
            )}
          </div>

          {/* Title */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-display text-lg font-medium tracking-[0.36px]">
              Processing purchase
            </span>
            <span className="text-sm text-muted-foreground font-sans">
              {providerName} is completing your transaction
            </span>
          </div>

          {/* Step tracker */}
          <div className="w-full flex flex-col gap-0">
            {/* Step 1: Payment received */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <StepIndicator state={stepStates[0]} number={1} />
                <div className="w-px h-8 bg-border" />
              </div>
              <div className="flex flex-col gap-0.5 pb-4">
                <span className="text-sm text-card-foreground font-sans">
                  Payment received
                </span>
                <span className="text-[13px] text-muted-foreground font-sans">
                  {formatUsd(quote?.sourceAmount ?? 0)} via card
                </span>
              </div>
            </div>

            {/* Step 2: Buying crypto */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <StepIndicator state={stepStates[1]} number={2} />
                <div className="w-px h-8 bg-border" />
              </div>
              <div className="flex flex-col gap-0.5 pb-4">
                <span className="text-sm text-card-foreground font-sans">
                  Buying {quote?.destinationAmount ?? ""} {tokenSymbol}
                </span>
                <span className="text-[13px] text-muted-foreground font-sans">
                  Usually takes 2-5 min
                </span>
              </div>
            </div>

            {/* Step 3: Deposit into protocol */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <StepIndicator state={stepStates[2]} number={3} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-card-foreground font-sans">
                  {widget.destination.label ?? "Deposit"}
                </span>
                <span className="text-[13px] text-muted-foreground font-sans">
                  On {chainLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  );
};

export default BuyCryptoStatusContainer;
