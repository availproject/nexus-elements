"use client";
import React from "react";
import { Card, CardContent } from "../ui/card";
import ChainSelect from "./components/chain-select";
import TokenSelect from "./components/token-select";
import { Button } from "../ui/button";
import { LoaderPinwheel } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
import ReceipientAddress from "./components/receipient-address";
import AmountInput from "./components/amount-input";
import FeeBreakdown from "./components/fee-breakdown";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import TransactionProgress from "./components/transaction-progress";
import AllowanceModal from "./components/allowance-modal";
import useListenTransaction from "./hooks/useListenTransaction";
import useBridge from "./hooks/useBridge";
import SourceBreakdown from "./components/source-breakdown";
import { type SUPPORTED_TOKENS } from "@avail-project/nexus-core";
import { type Address } from "viem";

interface FastBridgeProps {
  connectedAddress: Address;
}

const FastBridge: React.FC<FastBridgeProps> = ({ connectedAddress }) => {
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
    handleTransaction,
    reset,
    filteredUnifiedBalance,
    startTransaction,
    setIsDialogOpen,
    setTxError,
  } = useBridge({
    network: network ?? "mainnet",
    connectedAddress,
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    setAllowance,
  });

  const { processing, latestCompletedIndex, explorerUrl } =
    useListenTransaction(nexusSDK);

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
        />
        <TokenSelect
          selectedChain={inputs?.chain}
          selectedToken={inputs?.token}
          handleTokenSelect={(token) => setInputs({ ...inputs, token })}
        />
        <AmountInput
          amount={inputs?.amount}
          onChange={(amount) => setInputs({ ...inputs, amount })}
          unifiedBalance={filteredUnifiedBalance}
        />
        <ReceipientAddress
          address={inputs?.recipient}
          onChange={(address) =>
            setInputs({ ...inputs, recipient: address as `0x${string}` })
          }
        />
        {intent?.intent && (
          <>
            <SourceBreakdown
              intent={intent?.intent}
              tokenSymbol={filteredUnifiedBalance?.symbol as SUPPORTED_TOKENS}
            />
            <div className="w-full flex items-start justify-between gap-x-4">
              <p className="text-base font-semibold">You receive</p>
              <div className="flex flex-col gap-y-1 min-w-fit">
                <p className="text-base font-semibold text-right">
                  {intent?.intent?.destination?.amount}{" "}
                  {filteredUnifiedBalance?.symbol}
                </p>
                <p className="text-sm font-medium text-right">
                  on {intent?.intent?.destination?.chainName}
                </p>
              </div>
            </div>
            <FeeBreakdown intent={intent?.intent} />
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <TransactionProgress
              timer={timer}
              steps={processing}
              latestCompletedIndex={latestCompletedIndex}
              viewIntentUrl={explorerUrl}
              operationType={"bridge"}
            />
          </DialogContent>
        </Dialog>
        {allowance && (
          <AllowanceModal
            allowanceModal={allowance}
            setAllowanceModal={setAllowance}
            callback={startTransaction}
          />
        )}

        {txError && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start justify-between gap-x-3">
            <span className="flex-1">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => setTxError(null)}
              className="text-red-700/80 hover:text-red-900 focus:outline-none"
              aria-label="Dismiss error"
            >
              ×
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FastBridge;
