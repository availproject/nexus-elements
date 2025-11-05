"use client";

import React, { FC } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useNexus } from "../nexus/NexusProvider";
import useSwapExecuteExactOut from "./hooks/useSwapExecuteExactOut";
import type { Address } from "viem";
import type { ExecuteParams } from "@avail-project/nexus-core";
import SwapExecuteProgress from "./components/transaction-progress";
import SwapSourceBreakdown from "../swaps/exact-in/components/swap-source-breakdown";
import DepositFeeBreakdown from "./components/fee-breakdown";
import { LoaderPinwheel } from "lucide-react";

interface SwapExecuteExactOutProps {
  address: Address;
  executeBuilder: (
    amount: string,
    user: Address
  ) => Omit<ExecuteParams, "toChainId">;
}

const SwapExecuteExactOut: FC<SwapExecuteExactOutProps> = ({
  address,
  executeBuilder,
}) => {
  const { nexusSDK, swapIntent, setSwapIntent } = useNexus();
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
    swapExplorerUrl,
    executeExplorerUrl,
    executeSimGas,
    handleStart,
    acceptAndRun,
    deny,
    reset,
    executeCompleted,
    refreshing,
  } = useSwapExecuteExactOut({ nexusSDK, address, executeBuilder });

  return (
    <Card className="w-full max-w-xl">
      <CardContent className="flex flex-col gap-y-4 w-full">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold">Deposit to Aave</p>
          <span className="text-xs text-muted-foreground">
            Swap (Exact Out) + Execute
          </span>
        </div>

        <div className="flex flex-col gap-y-2">
          <Label className="text-sm font-medium" htmlFor="amount">
            You receive (USDT on Arbitrum)
          </Label>
          <Input
            id="amount"
            placeholder="0.0"
            value={inputs.amount ?? ""}
            onChange={(e) => setInputs({ ...inputs, amount: e.target.value })}
            disabled={loading || !!swapIntent}
          />
        </div>

        {!swapIntent && (
          <Button onClick={handleStart} disabled={loading || !inputs.amount}>
            {loading ? (
              <LoaderPinwheel className="animate-spin size-5" />
            ) : (
              "Swap and Deposit"
            )}
          </Button>
        )}

        {swapIntent && (
          <>
            <SwapSourceBreakdown intent={swapIntent.intent} />
            <DepositFeeBreakdown
              total={executeSimGas ?? "0"}
              execute={executeSimGas ?? "0"}
              tokenSymbol={"ETH"}
              isLoading={refreshing || !executeSimGas}
            />

            <div className="w-full flex items-center gap-x-2 justify-between">
              <Button
                variant="destructive"
                onClick={() => {
                  deny();
                  setSwapIntent(null);
                  reset();
                }}
                className="w-1/2"
                disabled={refreshing}
              >
                Deny
              </Button>
              <Button
                onClick={() => acceptAndRun()}
                disabled={refreshing}
                className="w-1/2"
              >
                {refreshing ? (
                  <LoaderPinwheel className="animate-spin size-5" />
                ) : (
                  "Accept"
                )}
              </Button>
            </div>
          </>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(o) => !loading && setIsDialogOpen(o)}
        >
          <DialogContent>
            <DialogHeader className="sr-only">
              <DialogTitle>Progress</DialogTitle>
            </DialogHeader>
            <SwapExecuteProgress
              timer={timer}
              swapSteps={steps}
              swapUrl={swapExplorerUrl}
              executeUrl={executeExplorerUrl}
              executeCompleted={executeCompleted}
            />
          </DialogContent>
        </Dialog>

        {txError && (
          <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-lg">
            <span className="flex-1 max-w-md truncate">{txError}</span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setTxError(null)}
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

export default SwapExecuteExactOut;
