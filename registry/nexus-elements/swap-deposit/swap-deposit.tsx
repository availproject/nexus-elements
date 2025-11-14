"use client";

import React, { type FC } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { useNexus } from "../nexus/NexusProvider";
import type { Address } from "viem";
import TokenMultiSelect from "./components/token-multi-select";
import AmountStep from "./components/amount-step";
import useSwapDeposit from "./hooks/useSwapDeposit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { type ExecuteParams } from "@avail-project/nexus-core";

interface SwapDepositProps {
  address: Address;
  title?: string;
  destination?: {
    chainId: number;
    tokenAddress?: Address;
    tokenOptions?: Address[];
  };
  executeBuilder: (
    amount: string,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
}

const SwapDeposit: FC<SwapDepositProps> = ({
  address,
  title = "Deposit",
  destination,
  executeBuilder,
}) => {
  const { nexusSDK } = useNexus();
  const hookDestination = destination?.tokenAddress
    ? {
        chainId: destination.chainId,
        tokenAddress: destination.tokenAddress,
      }
    : destination?.tokenOptions
    ? { chainId: destination.chainId, tokenOptions: destination.tokenOptions }
    : null;

  const {
    uiStep,
    selectedSources,
    destinationOptions,
    destinationMeta,
    sourcesModalOpen,
    destinationModalOpen,
    setSourcesModalOpen,
    setDestinationModalOpen,
    continueFromSelect,
    continueFromAmount,
    setTotalUsd,
    autoDistribute,
    setDestinationToken,
    buildIntent,
  } = useSwapDeposit({
    nexusSDK,
    address,
    destination: hookDestination,
    executeBuilder,
  });

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-y-4 w-full">
        {uiStep === "select" && (
          <TokenMultiSelect
            title={`${title}`}
            onContinue={continueFromSelect}
          />
        )}
        {uiStep === "amount" && (
          <AmountStep
            title={`${title}`}
            selectedSources={selectedSources}
            destinationSymbol={destinationMeta?.symbol}
            destinationLogo={destinationMeta?.logo}
            onBack={() => {
              // return to selection
              setSourcesModalOpen(true);
            }}
            onContinue={(usd) => {
              setTotalUsd(usd);
              continueFromAmount();
              buildIntent(selectedSources);
              // Review screen will follow; we just prepare amounts here
            }}
            onEditSources={() => setSourcesModalOpen(true)}
            onEditDestination={() => {
              if (
                hookDestination?.tokenAddress &&
                !hookDestination?.tokenOptions
              )
                return;
              if (!destinationOptions.length) {
                // locked, do nothing
                return;
              }
              setDestinationModalOpen(true);
            }}
          />
        )}

        {/* Sources modal */}
        <Dialog open={sourcesModalOpen} onOpenChange={setSourcesModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select sources</DialogTitle>
            </DialogHeader>
            <TokenMultiSelect
              title="Select sources"
              onContinue={(sources) => {
                continueFromSelect(sources);
                setSourcesModalOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Destination modal */}
        <Dialog
          open={destinationModalOpen}
          onOpenChange={setDestinationModalOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select destination token</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col">
              {destinationOptions.map((t) => {
                const selected =
                  String(destinationMeta?.tokenAddress || "").toLowerCase() ===
                  String(t.tokenAddress).toLowerCase();
                return (
                  <button
                    key={t.tokenAddress}
                    type="button"
                    onClick={() => {
                      setDestinationToken(t.tokenAddress);
                      setDestinationModalOpen(false);
                    }}
                    className={`w-full px-3 py-3 flex items-center justify-between hover:bg-muted/40 transition-colors rounded-md ${
                      selected ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-x-3">
                      <img
                        src={t.logo}
                        alt={t.symbol}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{t.symbol}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.name}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SwapDeposit;
