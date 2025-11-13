"use client";
import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import SourceAssetSelect from "../components/source-asset-select";
import DestinationAssetSelect from "../components/destination-asset-select";
import AmountInput from "../components/amount-input";
import TransactionProgress from "../components/transaction-progress";
import { useNexus } from "../../nexus/NexusProvider";
import useExactIn from "../exact-in/hooks/useExactIn";
import useExactOut from "../exact-out/hooks/useExactOut";
import { LoaderPinwheel, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import ReviewDialog from "../components/review-dialog";
import { SUPPORTED_CHAINS_IDS } from "@avail-project/nexus-core";

type Mode = "in" | "out";

interface UnifiedSwapProps {
  onComplete?: (amount?: string) => void;
  onStart?: () => void;
  onError?: (message: string) => void;
  exactInprefill?: {
    fromChainID?: number;
    fromToken?: string;
    fromAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
  exactOutprefill?: {
    toAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const UnifiedSwap: React.FC<UnifiedSwapProps> = ({
  onComplete,
  onStart,
  onError,
  exactInprefill,
  exactOutprefill,
}) => {
  const { nexusSDK, swapIntent, setSwapIntent } = useNexus();

  // Choose initial mode based on prefill (destination amount implies exact-out)
  const [mode, setMode] = useState<Mode>(
    exactOutprefill?.toAmount ? "out" : "in"
  );
  const [userOverrodeMode, setUserOverrodeMode] = useState(false);
  const handleSetMode = useCallback((m: Mode) => {
    setMode(m);
    setUserOverrodeMode(true);
  }, []);

  // Hooks are instantiated for the active mode only for lower overhead.
  const inHook =
    mode === "in"
      ? useExactIn({
          nexusSDK,
          onComplete,
          onStart,
          onError,
          prefill: exactInprefill,
        })
      : null;
  const outHook =
    mode === "out"
      ? useExactOut({
          nexusSDK,
          onComplete,
          onStart,
          onError,
          prefill: exactOutprefill,
        })
      : null;

  const inputs = inHook ? inHook.inputs : outHook?.inputs;
  const setInputs = inHook ? inHook.setInputs : outHook?.setInputs;
  const loading = Boolean(inHook ? inHook.loading : outHook?.loading);
  const isDialogOpen = Boolean(
    inHook ? inHook.isDialogOpen : outHook?.isDialogOpen
  );
  const setIsDialogOpen = inHook
    ? inHook.setIsDialogOpen
    : outHook?.setIsDialogOpen;
  const txError = inHook ? inHook.txError : outHook?.txError;
  const timer = inHook ? inHook.timer : outHook?.timer;
  const steps = inHook ? inHook.steps : outHook?.steps;
  const sourceExplorerUrl = inHook
    ? inHook.sourceExplorerUrl
    : outHook?.sourceExplorerUrl;
  const destinationExplorerUrl = inHook
    ? inHook.destinationExplorerUrl
    : outHook?.destinationExplorerUrl;
  const handleSwap = inHook ? inHook.handleSwap : outHook?.handleSwap;
  const reset = inHook ? inHook.reset : outHook?.reset;

  // Mode inference on first focus.
  const handleSourceFocus = useCallback(() => {
    if (!userOverrodeMode) setMode("in");
  }, [userOverrodeMode]);
  const handleDestinationFocus = useCallback(() => {
    if (!userOverrodeMode) setMode("out");
  }, [userOverrodeMode]);

  // Enablement logic for the Review action
  const canReview = useMemo(() => {
    if (!inputs) return false;
    if (mode === "in") {
      const i = inputs;
      return (
        i.fromChainID !== undefined &&
        i.toChainID !== undefined &&
        i.fromToken &&
        i.toToken &&
        i.fromAmount &&
        Number(i.fromAmount) > 0
      );
    }
    const i = inputs;
    return (
      i.toChainID !== undefined &&
      i.toToken &&
      i.toAmount &&
      Number(i.toAmount) > 0
    );
  }, [inputs, mode]);

  // Asset flip (exact-in only)
  const onFlip = useCallback(() => {
    if (mode !== "in" || !setInputs || !inputs) return;
    const i = inputs;
    setSwapIntent?.(null);
    setInputs({
      ...i,
      fromChainID: i.toChainID,
      toChainID: i.fromChainID,
      fromAmount: "",
      fromToken: undefined,
      toToken: undefined,
    });
  }, [mode, setInputs, inputs, setSwapIntent]);

  // Review dialog
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const onConfirmSwap = useCallback(async () => {
    try {
      if (swapIntent) {
        swapIntent.allow();
        setIsDialogOpen?.(true);
      } else {
        await handleSwap?.();
      }
      setIsReviewOpen(false);
    } catch (e) {
      // errors will be surfaced via hooks
    }
  }, [swapIntent, setIsDialogOpen, handleSwap]);

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Swap</p>
          <div className="inline-flex items-center gap-x-1 rounded-md border p-1">
            <Button
              type="button"
              variant={mode === "in" ? "default" : "ghost"}
              onClick={() => handleSetMode("in")}
              size={"sm"}
            >
              Exact In
            </Button>
            <Button
              type="button"
              variant={mode === "out" ? "default" : "ghost"}
              onClick={() => handleSetMode("out")}
              size={"sm"}
            >
              Exact Out
            </Button>
          </div>
        </div>

        <div className="group relative w-full flex flex-col gap-y-3">
          <div
            className="flex flex-col gap-y-2"
            onFocusCapture={handleSourceFocus}
          >
            <SourceAssetSelect
              selectedChain={inputs?.fromChainID}
              selectedToken={inputs?.fromToken}
              onSelect={(fromChainID: any, fromToken: any) =>
                setInputs?.({ ...inputs, fromChainID, fromToken })
              }
              disabled={mode === "out"}
            />
            <AmountInput
              amount={inputs?.fromAmount}
              onChange={(val) => setInputs?.({ ...inputs, fromAmount: val })}
              symbol={inputs?.fromToken?.symbol}
              disabled={mode === "out"}
            />
          </div>

          <Button
            type="button"
            variant={"secondary"}
            size={"icon"}
            className={`transition-opacity absolute top-1/2 left-1/2 ${
              mode === "out"
                ? "opacity-40 cursor-not-allowed"
                : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={onFlip}
            disabled={mode === "out"}
            aria-label="Flip assets"
          >
            <ArrowUpDown className="size-4" />
          </Button>

          <div
            className="flex flex-col gap-y-2"
            onFocusCapture={handleDestinationFocus}
          >
            <DestinationAssetSelect
              selectedChain={inputs?.toChainID}
              selectedToken={inputs?.toToken}
              onSelect={(toChainID: any, toToken: any) =>
                setInputs?.({ ...inputs, toChainID, toToken })
              }
              disabled={false}
            />
            <AmountInput
              amount={
                mode === "out"
                  ? inputs?.toAmount
                  : swapIntent?.intent?.destination?.amount ?? ""
              }
              onChange={(val) => setInputs?.({ ...inputs, toAmount: val })}
              symbol={inputs?.toToken?.symbol}
              disabled={mode === "in"}
              hideBalance={mode === "out"}
            />
          </div>
        </div>

        {!swapIntent && (
          <Button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            disabled={!canReview || loading}
          >
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Review"
            )}
          </Button>
        )}

        {swapIntent && (
          <div className="w-full flex items-center gap-x-2 justify-between">
            <Button
              variant={"destructive"}
              onClick={() => {
                swapIntent.deny();
                setSwapIntent(null);
                reset?.();
              }}
              className="w-1/2"
            >
              Deny
            </Button>
            <Button
              onClick={() => {
                swapIntent.allow();
                setIsDialogOpen?.(true);
              }}
              className="w-1/2"
            >
              Accept
            </Button>
          </div>
        )}

        <ReviewDialog
          open={isReviewOpen}
          onOpenChange={setIsReviewOpen}
          mode={mode}
          fromAmount={inputs?.fromAmount}
          fromSymbol={inputs?.fromToken?.symbol}
          toAmount={
            mode === "out"
              ? inputs?.toAmount
              : swapIntent?.intent?.destination?.amount
          }
          toSymbol={inputs?.toToken?.symbol}
          canConfirm={canReview}
          loading={loading}
          onConfirm={onConfirmSwap}
        />

        <Dialog
          open={isDialogOpen}
          onOpenChange={(o) => {
            if (loading) return;
            if (!o) reset?.();
            setIsDialogOpen?.(o);
          }}
        >
          <DialogContent>
            <DialogHeader className="sr-only">
              <DialogTitle>Swap Progress</DialogTitle>
            </DialogHeader>
            <TransactionProgress
              timer={timer as number}
              steps={steps ?? []}
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
                reset?.();
              }}
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

export default UnifiedSwap;
