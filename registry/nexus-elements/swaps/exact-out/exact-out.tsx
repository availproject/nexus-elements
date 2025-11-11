import React, { type FC } from "react";
import { Card, CardContent } from "../../ui/card";
import AmountInput from "../components/amount-input";
import DestinationAssetSelect from "../components/destination-asset-select";
import { Button } from "../../ui/button";
import { LoaderPinwheel } from "lucide-react";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import SwapSourceBreakdown from "../components/swap-source-breakdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import TransactionProgress from "../components/transaction-progress";
import { useNexus } from "../../nexus/NexusProvider";
import useExactOut from "./hooks/useExactOut";

interface SwapExactOutProps {
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  prefill?: {
    toChainID?: number;
    toToken?: string;
    toAmount?: string;
  };
}

const SwapExactOut: FC<SwapExactOutProps> = ({
  onComplete,
  onStart,
  onError,
  prefill,
}) => {
  const { nexusSDK, swapIntent, setSwapIntent } = useNexus();
  const {
    inputs,
    setInputs,
    loading,
    isDialogOpen,
    setIsDialogOpen,
    txError,
    timer,
    steps,
    sourceExplorerUrl,
    destinationExplorerUrl,
    handleSwap,
    reset,
  } = useExactOut({ nexusSDK, onComplete, onStart, onError, prefill });
  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Swap</p>
          <span className="text-xs text-muted-foreground">Exact Out</span>
        </div>
        <div className="flex flex-col gap-y-2">
          <label className="text-sm font-medium" htmlFor="swap-amount">
            Amount
          </label>
          <AmountInput
            amount={inputs.toAmount}
            onChange={(val) => setInputs({ ...inputs, toAmount: val })}
            symbol={inputs.toToken?.symbol}
            disabled={Boolean(prefill?.toAmount)}
            hideBalance={true}
          />
        </div>

        <DestinationAssetSelect
          selectedChain={inputs.toChainID}
          selectedToken={inputs.toToken}
          onSelect={(toChainID, toToken) =>
            setInputs({ ...inputs, toChainID, toToken })
          }
          disabled={Boolean(prefill?.toChainID && prefill?.toToken)}
        />

        {!swapIntent && (
          <Button onClick={handleSwap} disabled={loading}>
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Swap"
            )}
          </Button>
        )}

        {swapIntent && (
          <>
            <div className="flex flex-col gap-y-2">
              <Label className="text-sm font-medium" htmlFor="swap-receive">
                You receive (estimated)
              </Label>
              <Input
                id="swap-receive"
                disabled
                className="w-full border rounded px-3 py-2 text-sm bg-muted cursor-not-allowed"
                value={`${swapIntent.intent.destination.amount}`}
                placeholder="—"
                readOnly
              />
            </div>
            <div className="w-full flex items-center gap-x-2 justify-between">
              <Button
                variant={"destructive"}
                onClick={() => {
                  swapIntent.deny();
                  setSwapIntent(null);
                  reset();
                }}
                className="w-1/2"
              >
                Deny
              </Button>
              <Button
                onClick={() => {
                  swapIntent.allow();
                  setIsDialogOpen(true);
                }}
                className="w-1/2"
              >
                Accept
              </Button>
            </div>
            <SwapSourceBreakdown intent={swapIntent.intent} />
          </>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(o) => {
            if (loading) return;
            if (!o) reset();
            setIsDialogOpen(o);
          }}
        >
          <DialogContent>
            <DialogHeader className="sr-only">
              <DialogTitle>Swap Progress</DialogTitle>
            </DialogHeader>
            <TransactionProgress
              timer={timer}
              steps={steps}
              sourceExplorerUrl={sourceExplorerUrl}
              destinationExplorerUrl={destinationExplorerUrl}
            />
          </DialogContent>
        </Dialog>

        {txError && (
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-lg">
            <span className="flex-1 max-w-md truncate">{txError}</span>
            <Button
              type="button"
              size={"icon"}
              variant={"ghost"}
              onClick={() => {
                reset();
              }}
              className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
              aria-label="Dismiss error"
            >
              X
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SwapExactOut;
