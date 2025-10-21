"use client";

import { BaseDepositProps } from "../deposit";
import AmountInput from "./amount-input";
import SourceSelect from "./source-select";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import AllowanceModal from "../../fast-bridge/components/allowance-modal";
import BridgeExecuteProgress from "./transaction-progress";
import DepositFeeBreakdown from "./fee-breakdown";
import SourceBreakdown from "../../fast-bridge/components/source-breakdown";
import { useNexus } from "../../nexus/NexusProvider";
import useListenTransaction from "../../fast-bridge/hooks/useListenTransaction";
import React from "react";
import useDeposit from "../hooks/useDeposit";

interface SimpleDepositProps extends BaseDepositProps {
  destinationLabel?: string;
}

const SimpleDeposit = ({
  token,
  chain,
  chainOptions,
  destinationLabel = "on Hyperliquid Perps",
  depositExecute,
}: SimpleDepositProps) => {
  const {
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    allowance,
    setAllowance,
  } = useNexus();

  const {
    inputs,
    setInputs,
    loading,
    simulating,
    lastResult,
    isDialogOpen,
    setIsDialogOpen,
    txError,
    setTxError,
    timer,
    filteredUnifiedBalance,
    simulation,
    startTransaction,
    stopTimer,
    clearSimulation,
  } = useDeposit({
    chain,
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    allowance,
    setAllowance,
    chainOptions,
    executeConfig: depositExecute,
  });

  const { processing, explorerUrl } = useListenTransaction(
    nexusSDK,
    "bridgeAndExecute"
  );
  const allCompleted =
    processing?.length > 0 && processing.every((s) => s.completed);
  React.useEffect(() => {
    if (allCompleted) stopTimer();
  }, [allCompleted, stopTimer]);

  return (
    <div className="flex flex-col items-center w-full gap-y-3 rounded-lg">
      <SourceSelect
        chainOptions={chainOptions}
        selected={inputs?.selectedSources}
        onChange={(selected) =>
          setInputs({ ...inputs, selectedSources: selected })
        }
        disabled={Boolean(simulation?.success && !simulation?.bridgeSimulation)}
      />
      <AmountInput
        token={token}
        chain={chain}
        value={inputs?.amount}
        onChange={(value) => setInputs({ ...inputs, amount: value })}
        unifiedBalance={filteredUnifiedBalance}
      />

      {simulation?.success && simulation?.bridgeSimulation?.intent && (
        <>
          <SourceBreakdown
            intent={simulation?.bridgeSimulation?.intent as any}
            tokenSymbol={filteredUnifiedBalance?.symbol as "USDC"}
          />
          <div className="w-full flex items-start justify-between gap-x-4">
            <p className="text-base font-semibold">You receive</p>
            <div className="flex flex-col gap-y-1 min-w-fit">
              <p className="text-base font-semibold text-right">
                {simulation?.bridgeSimulation?.intent?.destination?.amount}{" "}
                {filteredUnifiedBalance?.symbol}
              </p>
              <p className="text-sm font-medium text-right">
                {destinationLabel}
              </p>
            </div>
          </div>
          <DepositFeeBreakdown
            total={simulation?.totalEstimatedCost?.total ?? "0"}
            bridge={simulation?.totalEstimatedCost?.breakdown?.bridge ?? "0"}
            execute={simulation?.totalEstimatedCost?.breakdown?.execute ?? "0"}
            tokenSymbol={filteredUnifiedBalance?.symbol as "USDC"}
          />
        </>
      )}

      {simulation?.success && !simulation?.bridgeSimulation && (
        <>
          <div className="w-full flex items-start justify-between gap-x-4">
            <p className="text-base font-semibold">You receive</p>
            <div className="flex flex-col gap-y-1 min-w-fit">
              <p className="text-base font-semibold text-right">
                {simulation?.metadata?.bridgeReceiveAmount ?? inputs?.amount}{" "}
                {filteredUnifiedBalance?.symbol}
              </p>
              <p className="text-sm font-medium text-right">
                {destinationLabel}
              </p>
            </div>
          </div>
          <DepositFeeBreakdown
            total={simulation?.totalEstimatedCost?.total ?? "0"}
            bridge={simulation?.totalEstimatedCost?.breakdown?.bridge ?? "0"}
            execute={simulation?.totalEstimatedCost?.breakdown?.execute ?? "0"}
            tokenSymbol={filteredUnifiedBalance?.symbol as "USDC"}
          />
          <div className="w-full text-sm text-muted-foreground px-2">
            Bridge skipped, executing directly on destination chain
          </div>
        </>
      )}

      {!intent &&
        (simulation?.success ? (
          <div className="w-full flex items-center gap-x-2">
            <Button
              variant={"destructive"}
              onClick={() => {
                clearSimulation();
                setTxError(null);
              }}
              className="w-1/2"
            >
              Deny
            </Button>
            <Button
              onClick={startTransaction}
              disabled={loading}
              className="w-1/2"
            >
              {loading ? "Processing..." : "Accept"}
            </Button>
          </div>
        ) : (
          <Button
            disabled={!inputs?.amount || loading || simulating}
            className="w-full"
          >
            {loading || simulating ? "Simulating..." : "Simulate"}
          </Button>
        ))}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>Transaction Progress</DialogTitle>
          </DialogHeader>
          <BridgeExecuteProgress
            timer={timer}
            steps={processing}
            intentUrl={explorerUrl ?? simulation ?? undefined}
            executeUrl={lastResult?.executeExplorerUrl}
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
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start justify-between gap-x-3 mt-3 w-full max-w-xs">
          <span className="flex-1 max-w-">{txError}</span>
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
    </div>
  );
};

export default SimpleDeposit;
