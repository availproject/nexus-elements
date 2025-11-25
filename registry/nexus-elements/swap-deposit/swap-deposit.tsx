"use client";

import {
  type ExecuteParams,
  type SUPPORTED_CHAINS_IDS,
} from "@avail-project/nexus-core";
import { type Address } from "viem";
import { useNexus } from "../nexus/NexusProvider";
import useSwapDeposit from "./hooks/useSwapDeposit";
import AssetSelect from "./components/asset-select";
import { AmountStep } from "./components/amount-step";
import { ConfirmationStep } from "./components/confirmation-step";
import TransactionStatusStep from "./components/transaction-status-step";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationConfig {
  chainId: SUPPORTED_CHAINS_IDS;
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenLogo?: string;
  label?: string;
  estimatedTime?: string;
  gasTokenSymbol?: string;
}

interface SwapDepositProps {
  executeDeposit: (
    tokenSymbol: string,
    tokenAddress: string,
    amount: bigint,
    chainId: number,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
  destination: DestinationConfig;
  title?: string;
}

const SwapDeposit = ({
  executeDeposit,
  destination,
  title = "Select Sources",
}: SwapDepositProps) => {
  const { nexusSDK } = useNexus();

  const {
    status,
    loading,
    txError,
    simulationLoading,
    timer,
    getFiatValue,
    availableAssets,
    selectedSources,
    totalSelectedBalance,
    activeIntent,
    confirmationDetails,
    feeBreakdown,
    handleToggleSource,
    handleSelectAll,
    handleDeselectAll,
    handleSourcesContinue,
    handleAmountContinue,
    handleConfirmOrder,
    handleBack,
    reset,
    explorerUrls,
  } = useSwapDeposit({
    executeDeposit,
    destination,
  });

  const isAmountStep =
    status === "set-source-assets" && selectedSources.length > 0;
  const isSimulating = status === "simulating";
  const isProcessing =
    status === "swapping" || status === "depositing" || loading;
  const isSuccess = status === "success";
  const isError = status === "error";
  const showReview = status === "view-breakdown" && Boolean(activeIntent);

  if (!nexusSDK) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderContent = () => {
    if (isError && txError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">{txError}</p>
          <Button onClick={reset}>Try again</Button>
        </div>
      );
    }

    if (isSuccess || isProcessing) {
      return (
        <TransactionStatusStep
          details={{
            sourceLabel: confirmationDetails?.sourceLabel ?? "",
            successTitle: `Deposit ${destination.tokenSymbol}`,
            sources: confirmationDetails?.sources,
            gasTokenSymbol: confirmationDetails?.gasTokenSymbol,
            networkCost: feeBreakdown?.gasUsd,
          }}
          receiveAmount={confirmationDetails?.receiveAmountAfterSwap ?? ""}
          tokenLogo={destination.tokenLogo ?? ""}
          totalTime={
            status === "success"
              ? `${Math.max(1, Math.floor(timer))}s`
              : undefined
          }
          onClose={reset}
          onNewDeposit={reset}
          status={status}
          explorerUrls={
            explorerUrls ?? {
              source: null,
              destination: null,
              depositUrl: null,
            }
          }
        />
      );
    }

    if (showReview && confirmationDetails && activeIntent) {
      return (
        <div className="flex h-full flex-col">
          <ConfirmationStep
            amount={confirmationDetails.receiveAmountAfterSwapUsd}
            details={{
              ...confirmationDetails,
              sourceLabel:
                confirmationDetails.sourceLabel ??
                destination.label ??
                "Source route",
              networkCost: feeBreakdown.gasFormatted,
            }}
            countdown={Math.max(0, 30 - Math.floor(timer))}
            onConfirm={handleConfirmOrder}
            onBack={handleBack}
            title={destination.label ?? destination.tokenSymbol}
          />
        </div>
      );
    }

    if (isSimulating) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Fetching best route...
          </p>
        </div>
      );
    }

    if (isAmountStep) {
      // Show amount step - using total selected balance as max
      const primarySource = selectedSources[0];
      return (
        <AmountStep
          token={{
            symbol:
              selectedSources.length === 1 ? primarySource.symbol : "Multiple",
            maxAmount: totalSelectedBalance,
            readableBalance: `${totalSelectedBalance} (${selectedSources.length} sources)`,
            sources: selectedSources,
            receiveSymbol: destination.tokenSymbol,
            receiveTokenLogo: destination.tokenLogo,
            receiveTokenDecimals: destination.tokenDecimals,
            receiveChainId: destination.chainId,
          }}
          onContinue={handleAmountContinue}
          onBack={reset}
          onClose={reset}
        />
      );
    }

    // Default: show asset selection
    return (
      <AssetSelect
        title={title}
        availableAssets={availableAssets}
        getFiatValue={getFiatValue}
        selectedSources={selectedSources}
        onToggle={handleToggleSource}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onContinue={handleSourcesContinue}
        onBack={reset}
        onClose={reset}
      />
    );
  };

  return (
    <Card
      className={cn(
        "relative mx-auto h-[520px] py-0 w-full max-w-md overflow-y-scroll no-scrollbar"
      )}
    >
      {simulationLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      {renderContent()}
    </Card>
  );
};

export default SwapDeposit;
