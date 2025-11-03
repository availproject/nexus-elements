"use client";
import React, { FC } from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { LoaderPinwheel, X } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
import AmountInput from "./components/amount-input";
import FeeBreakdown from "./components/fee-breakdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import TransactionProgress from "./components/transaction-progress";
import AllowanceModal from "./components/allowance-modal";
import useBridge from "./hooks/useBridge";
import SourceBreakdown from "./components/source-breakdown";
import { type SUPPORTED_TOKENS } from "@avail-project/nexus-core";
import { type Address } from "viem";
import { Skeleton } from "../ui/skeleton";
import RecipientAddress from "./components/recipient-address";

interface FastBridgeProps {
  connectedAddress: Address;
  prefill?: {
    token: string;
    chainId: number;
    amount?: string;
    recipient?: Address;
  };
  onComplete?: () => void;
}

const FastBridge: FC<FastBridgeProps> = ({
  connectedAddress,
  onComplete,
  prefill,
}) => {
  const {
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    allowance,
    setAllowance,
    network,
  } = useNexus();

  const {
    inputs,
    setInputs,
    timer,
    loading,
    refreshing,
    isDialogOpen,
    txError,
    setTxError,
    handleTransaction,
    reset,
    filteredUnifiedBalance,
    startTransaction,
    setIsDialogOpen,
    stopTimer,
    commitAmount,
    lastExplorerUrl,
    steps,
  } = useBridge({
    prefill,
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    setAllowance,
    onComplete,
  });

  const allCompleted = steps?.length > 0 && steps.every((s) => s.completed);
  React.useEffect(() => {
    if (allCompleted) {
      stopTimer();
    }
  }, [allCompleted, stopTimer]);

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <ChainSelect
          selectedChain={inputs?.chain}
          handleSelect={(chain) =>
            setInputs({
              ...inputs,
              chain,
            })
          }
          label="To"
          disabled={!!prefill?.chainId}
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs({ ...inputs, token })}
          disabled={!!prefill?.token}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs({ ...inputs, amount })}
          unifiedBalance={filteredUnifiedBalance}
          onCommit={() => void commitAmount()}
          disabled={refreshing || !!prefill?.amount}
          inputs={inputs}
        />
        <RecipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
          disabled={!!prefill?.recipient}
        />
        {intent?.intent && (
          <>
            <SourceBreakdown
              intent={intent?.intent}
              tokenSymbol={filteredUnifiedBalance?.symbol as SUPPORTED_TOKENS}
              isLoading={refreshing}
            />
            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-semibold">You receive</p>
              <div className="flex flex-col gap-y-1 min-w-fit">
                {refreshing ? (
                  <Skeleton className="h-5 w-28" />
                ) : (
                  <p className="text-base font-semibold text-right">
                    {intent?.intent?.destination?.amount}{" "}
                    {filteredUnifiedBalance?.symbol}
                  </p>
                )}
                {refreshing ? (
                  <Skeleton className="h-4 w-36" />
                ) : (
                  <p className="text-sm font-medium text-right">
                    on {intent?.intent?.destination?.chainName}
                  </p>
                )}
              </div>
            </div>
            <FeeBreakdown intent={intent?.intent} isLoading={refreshing} />
          </>
        )}

        {!intent && (
          <Button
            onClick={handleTransaction}
            disabled={
              !inputs?.amount ||
              !inputs?.recipient ||
              !inputs?.chain ||
              !inputs?.token ||
              loading
            }
          >
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Bridge"
            )}
          </Button>
        )}
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (loading) return;
            setIsDialogOpen(open);
          }}
        >
          {intent && (
            <div className="w-full flex items-center gap-x-2 justify-between">
              <Button variant={"destructive"} onClick={reset} className="w-1/2">
                Deny
              </Button>
              <DialogTrigger asChild>
                <Button
                  onClick={startTransaction}
                  className="w-1/2"
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing..." : "Accept"}
                </Button>
              </DialogTrigger>
            </div>
          )}
          <DialogContent>
            <DialogHeader className="sr-only">
              <DialogTitle>Transaction Progress</DialogTitle>
            </DialogHeader>
            <TransactionProgress
              timer={timer}
              steps={steps}
              viewIntentUrl={lastExplorerUrl}
              operationType={"bridge"}
            />
          </DialogContent>
        </Dialog>
        {allowance && (
          <AllowanceModal
            allowanceModal={allowance}
            setAllowanceModal={setAllowance}
            callback={startTransaction}
            onCloseCallback={reset}
          />
        )}

        {txError && (
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-lg">
            <span className="flex-1 w-md truncate">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => {
                reset();
                setTxError(null);
              }}
              className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
              aria-label="Dismiss error"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FastBridge;
