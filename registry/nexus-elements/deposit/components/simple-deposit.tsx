"use client";

import React, { useCallback, useEffect, useMemo } from "react";
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
import AllowanceModal from "./allowance-modal";
import BridgeExecuteProgress from "./transaction-progress";
import DepositFeeBreakdown from "./fee-breakdown";
import SourceBreakdown from "./source-breakdown";
import { useNexus } from "../../nexus/NexusProvider";
import useDeposit from "../hooks/useDeposit";
import { LoaderPinwheel, X } from "lucide-react";
import { Skeleton } from "../../ui/skeleton";
import {
  CHAIN_METADATA,
  type SUPPORTED_TOKENS,
} from "@avail-project/nexus-core";
import { formatUnits } from "viem";

interface SimpleDepositProps extends BaseDepositProps {
  destinationLabel?: string;
}

const SimpleDeposit = ({
  address,
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
    refreshing,
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
    simulate,
    cancelSimulation,
    steps,
  } = useDeposit({
    token: token ?? "USDC",
    chain,
    nexusSDK,
    intent,
    setIntent,
    unifiedBalance,
    allowance,
    setAllowance,
    chainOptions,
    address,
    executeBuilder: depositExecute,
  });
  const allCompleted = steps?.length > 0 && steps.every((s) => s.completed);
  useEffect(() => {
    if (allCompleted) stopTimer();
  }, [allCompleted, stopTimer]);

  const renderDepositButtonContent = useCallback(() => {
    if (isDialogOpen) return "Deposit";
    if (refreshing)
      return (
        <div className="flex items-center gap-x-2">
          <LoaderPinwheel className="animate-spin size-4" />
          <p>Refreshing Quote</p>
        </div>
      );
    if (simulating)
      return (
        <div className="flex items-center gap-x-2">
          <LoaderPinwheel className="animate-spin size-4" />
          <p>Preparing Quote</p>
        </div>
      );
    return "Deposit";
  }, [isDialogOpen, refreshing, simulating]);

  const renderTotalFeeBreakdown = useMemo(() => {
    if (simulation?.bridgeSimulation) {
      return `${
        simulation.bridgeSimulation?.intent?.fees?.total ?? "0"
      } ${token} + ${
        formatUnits(
          simulation.executeSimulation.gasFee,
          CHAIN_METADATA[chain].nativeCurrency.decimals
        ) ?? "0"
      } ${CHAIN_METADATA[chain].nativeCurrency.symbol}`;
    }
    return ` ${
      formatUnits(
        simulation?.executeSimulation?.gasFee ?? BigInt(0),
        CHAIN_METADATA[chain].nativeCurrency.decimals
      ) ?? "0"
    } ${CHAIN_METADATA[chain].nativeCurrency.symbol}`;
  }, [simulation, chain, token]);

  return (
    <div className="flex flex-col items-center w-full gap-y-3 rounded-lg">
      {/* Sources */}
      <SourceSelect
        chainOptions={chainOptions}
        selected={inputs?.selectedSources}
        onChange={(selected) =>
          setInputs({ ...inputs, selectedSources: selected })
        }
        disabled={Boolean(simulation && !simulation?.bridgeSimulation)}
      />
      <AmountInput
        value={inputs?.amount}
        onChange={(value) => {
          setInputs({ ...inputs, amount: value });
          if (!value) {
            cancelSimulation();
            setTxError(null);
          }
        }}
        unifiedBalance={filteredUnifiedBalance}
        disabled={loading || simulating}
        onCommit={(value) => {
          setInputs({ ...inputs, amount: value });
          void simulate(value);
        }}
      />

      {/* Shimmer while simulating */}
      {simulating && !simulation && (
        <>
          <SourceBreakdown
            isLoading
            tokenSymbol={filteredUnifiedBalance?.symbol as SUPPORTED_TOKENS}
            chain={chain}
          />
          <div className="w-full flex items-start justify-between gap-x-4">
            <p className="text-base font-semibold">You Receive</p>
            <div className="flex flex-col gap-y-1 min-w-fit items-end">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <DepositFeeBreakdown
            isLoading
            total={"0"}
            bridge={"0"}
            execute={"0"}
          />
        </>
      )}

      {simulation && inputs?.amount && (
        <>
          <SourceBreakdown
            intent={simulation?.bridgeSimulation?.intent}
            tokenSymbol={filteredUnifiedBalance?.symbol as SUPPORTED_TOKENS}
            isLoading={refreshing}
            chain={chain}
            unifiedBalance={filteredUnifiedBalance}
            requiredAmount={inputs?.amount}
          />

          <div className="w-full flex items-start justify-between gap-x-4">
            <p className="text-base font-semibold">You Receive</p>
            <div className="flex flex-col gap-y-1 min-w-fit">
              {refreshing ? (
                <Skeleton className="h-5 w-28" />
              ) : (
                <p className="text-base font-semibold text-right">
                  {inputs?.amount} {filteredUnifiedBalance?.symbol}
                </p>
              )}
              <p className="text-sm font-medium text-right">
                {destinationLabel}
              </p>
            </div>
          </div>

          <DepositFeeBreakdown
            total={renderTotalFeeBreakdown}
            bridge={`${
              simulation.bridgeSimulation?.intent?.fees?.total ?? "0"
            } ${token}`}
            execute={`${
              formatUnits(
                simulation.executeSimulation.gasFee,
                CHAIN_METADATA[chain].nativeCurrency.decimals
              ) ?? "0"
            } ${CHAIN_METADATA[chain].nativeCurrency.symbol}`}
            isLoading={refreshing}
          />
          {!simulation.bridgeSimulation && (
            <div className="w-full text-sm text-muted-foreground">
              Bridge skipped, executing directly on destination chain
            </div>
          )}
        </>
      )}

      {!intent &&
        (simulation ? (
          <div className="w-full flex items-center justify-center gap-x-2 px-1">
            <Button
              variant={"destructive"}
              onClick={() => {
                clearSimulation();
                setTxError(null);
              }}
              className="w-1/2"
            >
              Cancel
            </Button>
            <Button
              onClick={startTransaction}
              disabled={isDialogOpen || loading || simulating || refreshing}
              className="w-1/2"
            >
              {renderDepositButtonContent()}
            </Button>
          </div>
        ) : (
          <Button disabled={true} className="w-full px-2">
            {renderDepositButtonContent()}
          </Button>
        ))}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (loading) return;
          setIsDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader className="sr-only">
            <DialogTitle>Transaction Progress</DialogTitle>
          </DialogHeader>
          <BridgeExecuteProgress
            timer={timer}
            steps={steps}
            intentUrl={lastResult ? lastResult.bridgeExplorerUrl : undefined}
            executeUrl={lastResult ? lastResult.executeExplorerUrl : undefined}
          />
        </DialogContent>
      </Dialog>

      {allowance && (
        <AllowanceModal
          allowanceModal={allowance}
          setAllowanceModal={setAllowance}
          callback={startTransaction}
          onCloseCallback={clearSimulation}
        />
      )}

      {txError && (
        <div className="rounded-md border border-destructive bg-destructive/80 px-3 py-2 text-sm text-destructive-foreground flex items-start justify-between gap-x-3 mt-3 w-full max-w-lg">
          <span className="flex-1 max-w-md truncate">{txError}</span>
          <Button
            type="button"
            size={"icon"}
            variant={"ghost"}
            onClick={() => {
              clearSimulation();
              setTxError(null);
            }}
            className="text-destructive-foreground/80 hover:text-destructive-foreground focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SimpleDeposit;
