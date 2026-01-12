"use client";

import { useState } from "react";
import WidgetHeader from "./widget-header";
import { ReceiveAmountDisplay } from "./receive-amount-display";
import type { DepositWidgetContextValue } from "../types";
import { ArrowBoxUpRightIcon, ChevronDownIcon } from "./icons";
import { CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { useNexus } from "../../nexus/NexusProvider";

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 13) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

interface TransactionCompleteContainerProps {
  widget: DepositWidgetContextValue;
  onClose?: () => void;
}

const TransactionCompleteContainer = ({
  widget,
  onClose,
}: TransactionCompleteContainerProps) => {
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  const { getFiatValue } = useNexus();
  const handleNewDeposit = () => {
    widget.reset();
    widget.goToStep("amount");
  };

  const handleClose = () => {
    widget.reset();
    onClose?.();
  };

  const hasSourceSwaps = widget.sourceSwaps.length > 0;
  const receiveAmountUsd = getFiatValue(
    parseFloat(widget.activeIntent?.intent.destination.amount ?? "0"),
    widget.confirmationDetails?.receiveTokenSymbol ?? "",
  ).toFixed(4);
  const completionTime = formatTimer(widget.timer);

  return (
    <>
      <WidgetHeader title="Deposit USDC" onClose={onClose} />
      <CardContent>
        <div className="flex flex-col">
          <div className="bg-base rounded-t-lg border-t border-l border-r border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] px-6 pt-6 pb-1 flex flex-col items-center gap-5">
            <ReceiveAmountDisplay
              label="You received"
              amount={receiveAmountUsd}
              timeLabel={completionTime}
              showClockIcon={true}
            />
            <span className="font-sans text-sm w-full text-center leading-4.5 text-muted-foreground">
              Transaction successful
            </span>
            <div className="w-full">
              {/* Source swaps and deposit transaction section */}
              <div className="border-t py-5 flex flex-col gap-5">
                {/* Collected on sources - only show if there were source swaps */}
                {hasSourceSwaps && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-sans text-sm leading-4.5 text-card-foreground">
                        Collected on sources
                      </span>
                      <button
                        className="font-sans flex gap-0.5 text-muted-foreground text-sm leading-4.5 underline cursor-pointer items-center"
                        onClick={() => setShowSourceDetails(!showSourceDetails)}
                      >
                        {showSourceDetails ? "hide details" : "view details"}
                        <ChevronDownIcon
                          size={16}
                          className={`text-muted-foreground transition-transform duration-300 ${
                            showSourceDetails ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        showSourceDetails
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="flex gap-3 flex-wrap pt-2 pb-3">
                          {widget.sourceSwaps.map((swap, index) => (
                            <a
                              key={`${swap.chainId}-${index}`}
                              href={swap.explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-sans flex gap-1 items-center text-muted-foreground text-sm leading-4.5 underline transition-all hover:text-card-foreground"
                              style={{
                                animationDelay: showSourceDetails
                                  ? `${index * 50}ms`
                                  : "0ms",
                              }}
                            >
                              {swap.chainName}
                              <ArrowBoxUpRightIcon
                                size={16}
                                className="text-muted-foreground"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deposit transaction */}
                {widget.explorerUrls.executeUrl && (
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-sm leading-4.5 text-card-foreground">
                      Deposit transaction
                    </span>
                    <a
                      href={widget.explorerUrls.executeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans flex gap-0.5 text-muted-foreground text-sm leading-4.5 underline cursor-pointer hover:text-card-foreground"
                    >
                      {truncateHash(
                        widget.explorerUrls.executeUrl.split("/").pop() ?? "",
                      )}
                      <ArrowBoxUpRightIcon
                        size={16}
                        className="text-muted-foreground"
                      />
                    </a>
                  </div>
                )}

                {/* View on Nexus Explorer */}
                {widget.explorerUrls.intentUrl && (
                  <div className="flex justify-between items-center">
                    <span className="font-sans text-sm leading-4.5 text-card-foreground">
                      View on Nexus Explorer
                    </span>
                    <a
                      href={widget.explorerUrls.intentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans flex gap-0.5 text-muted-foreground text-sm leading-4.5 underline cursor-pointer hover:text-card-foreground"
                    >
                      <ArrowBoxUpRightIcon
                        size={16}
                        className="text-muted-foreground"
                      />
                    </a>
                  </div>
                )}
              </div>

              {/* Fees section */}
              <div className="border-t py-5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-sans text-sm leading-4.5 text-card-foreground">
                      Total fees
                    </span>
                    <span className="font-sans text-[13px] text-muted-foreground leading-4.5">
                      Network & protocol
                    </span>
                  </div>
                  <span className="font-sans text-muted-foreground text-sm leading-4.5">
                    {widget.feeBreakdown.gasFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full">
            <Button
              className="w-1/2 rounded-t-none rounded-br-none"
              onClick={handleNewDeposit}
            >
              New Deposit
            </Button>
            <Button
              className="w-1/2 rounded-t-none rounded-bl-none"
              variant="secondary"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter />
    </>
  );
};

export default TransactionCompleteContainer;
