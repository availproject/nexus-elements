"use client";
import React, { FC } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import AmountInput from "./components/amount-input";
import SourceAssetSelect from "./components/source-asset-select";
import DestinationAssetSelect from "./components/destination-asset-select";
import { useNexus } from "../../nexus/NexusProvider";
import useExactIn from "./hooks/useExactIn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import TransactionProgress from "../../fast-bridge/components/transaction-progress";
import SwapSourceBreakdown from "./components/swap-source-breakdown";
import SwapFeeBreakdown from "./components/swap-fee-breakdown";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

interface SwapExactInProps {}

const SwapExactIn: FC<SwapExactInProps> = () => {
  const { nexusSDK, swapIntent } = useNexus();
  const {
    inputs,
    setInputs,
    loading,
    isDialogOpen,
    setIsDialogOpen,
    txError,
    setTxError,
    timer,
    steps,
    explorerUrl,
    handleSwap,
  } = useExactIn({ nexusSDK });

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Swap</p>
          <span className="text-xs text-muted-foreground">Exact In</span>
        </div>

        <SourceAssetSelect
          selectedChain={inputs.fromChainID}
          selectedToken={inputs.fromToken}
          onSelect={(fromChainID, fromToken) =>
            setInputs({ ...inputs, fromChainID, fromToken })
          }
        />
        <div className="flex flex-col gap-y-2">
          <label className="text-sm font-medium" htmlFor="swap-amount">
            Amount
          </label>
          <AmountInput
            amount={inputs.fromAmount}
            onChange={(val) => setInputs({ ...inputs, fromAmount: val })}
            symbol={inputs.fromToken?.symbol}
          />
        </div>

        <DestinationAssetSelect
          selectedChain={inputs.toChainID}
          selectedToken={inputs.toToken}
          onSelect={(toChainID, toToken) =>
            setInputs({ ...inputs, toChainID, toToken })
          }
        />

        {swapIntent && (
          <div className="flex flex-col gap-y-2">
            <Label className="text-sm font-medium" htmlFor="swap-receive">
              You receive (estimated)
            </Label>
            <Input
              id="swap-receive"
              className="w-full border rounded px-3 py-2 text-sm bg-muted cursor-not-allowed"
              value={`${swapIntent.intent.destination.amount}`}
              placeholder="—"
              readOnly
            />
          </div>
        )}

        {!swapIntent && (
          <Button onClick={handleSwap} disabled={loading}>
            {loading ? "Swapping..." : "Swap"}
          </Button>
        )}

        {swapIntent && (
          <div className="w-full flex items-center gap-x-2 justify-between">
            <Button
              variant={"destructive"}
              onClick={() => swapIntent.deny()}
              className="w-1/2"
            >
              Deny
            </Button>
            <Button
              onClick={() => {
                // swapIntent.allow()
              }}
              className="w-1/2"
            >
              Accept
            </Button>
          </div>
        )}

        {swapIntent?.intent && (
          <>
            <SwapSourceBreakdown intent={swapIntent.intent} />
            <SwapFeeBreakdown />
          </>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(o) => !loading && setIsDialogOpen(o)}
        >
          <DialogContent>
            <DialogHeader className="sr-only">
              <DialogTitle>Swap Progress</DialogTitle>
            </DialogHeader>
            <TransactionProgress
              timer={timer}
              steps={steps}
              viewIntentUrl={explorerUrl}
              operationType="swap"
            />
          </DialogContent>
        </Dialog>

        {txError && (
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-lg">
            <span className="flex-1 max-w-">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => setTxError(null)}
              className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
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

export default SwapExactIn;
