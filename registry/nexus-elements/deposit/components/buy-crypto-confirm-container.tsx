"use client";

import { useCallback } from "react";
import WidgetHeader from "./widget-header";
import type { DepositWidgetContextValue } from "../types";
import type { UseMeldReturn } from "../hooks/use-meld";
import { CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { useAccount } from "wagmi";
import { InfoIcon } from "./icons";
import { CHAIN_ID_TO_NAME } from "../constants/meld";
import { CHAIN_METADATA } from "@avail-project/nexus-core";

interface BuyCryptoConfirmContainerProps {
  widget: DepositWidgetContextValue;
  meld: UseMeldReturn;
  heading?: string;
  onClose?: () => void;
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BuyCryptoConfirmContainer = ({
  widget,
  meld,
  onClose,
}: BuyCryptoConfirmContainerProps) => {
  const { address } = useAccount();
  const quote = meld.quote;
  const tokenSymbol = widget.destination.tokenSymbol;
  const chainName = CHAIN_ID_TO_NAME[widget.destination.chainId] ?? `Chain ${widget.destination.chainId}`;
  const providerName =
    quote?.serviceProviderName || quote?.serviceProvider || "Provider";

  const handleProceed = useCallback(async () => {
    if (!quote || !address) return;

    const session = await meld.createSession({
      sessionType: "BUY",
      sessionData: {
        sourceAmount: String(quote.sourceAmount),
        sourceCurrencyCode: quote.sourceCurrencyCode,
        destinationCurrencyCode: quote.destinationCurrencyCode,
        walletAddress: address,
        countryCode: "US",
        serviceProvider: quote.serviceProvider,
        paymentMethodType: quote.paymentMethodType,
        redirectUrl: window.location.href,
      },
      externalCustomerId: address,
      externalSessionId: crypto.randomUUID(),
      bypassKyc: true,
    });

    const widgetUrl = session?.serviceProviderWidgetUrl || session?.widgetUrl;
    if (widgetUrl) {
      meld.openProviderWidget(widgetUrl);
      widget.goToStep("buy-crypto-status");
    }
  }, [quote, address, meld, widget]);

  return (
    <>
      <WidgetHeader
        title="Review purchase"
        onBack={() => widget.goBack()}
        onClose={onClose}
      />
      <CardContent>
        <div className="flex flex-col gap-5">
          {/* Redirect block */}
          <div className="flex flex-col items-center gap-1 py-4">
            <span className="text-sm text-muted-foreground font-sans">
              Complete payment via
            </span>
            <span className="font-display text-xl font-medium tracking-[0.36px]">
              {providerName}
            </span>
          </div>

          {/* Summary card */}
          <div className="bg-base rounded-t-lg border border-border shadow-[0_1px_12px_0_rgba(91,91,91,0.05)] p-4 flex flex-col gap-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground font-sans">
                Buying
              </span>
              <span className="text-sm text-card-foreground font-sans">
                {quote?.destinationAmount ?? "—"} {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-sans">
                Network
              </span>
              <span className="text-sm text-card-foreground font-sans flex items-center gap-1.5">
                {CHAIN_METADATA[widget.destination.chainId as keyof typeof CHAIN_METADATA]?.logo && (
                  <img
                    src={CHAIN_METADATA[widget.destination.chainId as keyof typeof CHAIN_METADATA].logo}
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded-full"
                    alt={chainName}
                  />
                )}
                {chainName}
              </span>
            </div>
            {widget.destination.label && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-sans">
                  Deposit
                </span>
                <span className="text-sm text-card-foreground font-sans">
                  {widget.destination.label}
                </span>
              </div>
            )}
            <div className="border-t border-border" />
            <div className="flex justify-between">
              <span className="text-sm text-card-foreground font-sans font-medium">
                Total
              </span>
              <span className="text-sm text-card-foreground font-sans font-medium tabular-nums">
                {quote ? formatUsd(quote.sourceAmount) : "—"}
              </span>
            </div>
          </div>

          {/* CTA */}
          <Button
            className="rounded-t-none -mt-5"
            onClick={handleProceed}
            disabled={!quote || meld.isLoadingSession || !address}
          >
            {meld.isLoadingSession
              ? "Creating session..."
              : `Proceed to ${providerName}`}
          </Button>

          {/* Error display */}
          {meld.error && (
            <div className="flex items-start gap-2 px-4">
              <InfoIcon size={16} className="text-red-400 mt-0.5 shrink-0" />
              <span className="text-sm text-red-400 font-sans">{meld.error}</span>
            </div>
          )}

        </div>
      </CardContent>
    </>
  );
};

export default BuyCryptoConfirmContainer;
