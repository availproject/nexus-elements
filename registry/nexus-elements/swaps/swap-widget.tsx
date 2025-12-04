"use client";

import { useCallback, useRef } from "react";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
import useExactIn, { SwapInputs } from "./hooks/useExactIn";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import useHover from "./hooks/useHover";
import SourceContainer from "./components/source-container";
import DestinationContainer from "./components/destination-container";
import ViewTransaction from "./components/view-transaction";

function SwapWidget() {
  const sourceContainer = useRef<HTMLDivElement | null>(null);
  const destinationContainer = useRef<HTMLDivElement | null>(null);
  const { nexusSDK, swapIntent, swapBalance, fetchSwapBalance, getFiatValue } =
    useNexus();
  const {
    status,
    inputs,
    txError,
    setInputs,
    setStatus,
    setTxError,
    steps,
    reset,
    explorerUrls,
    availableBalance,
    availableStables,
    formatBalance,
    destinationBalance,
  } = useExactIn({
    nexusSDK,
    swapIntent,
    swapBalance,
    fetchBalance: fetchSwapBalance,
    // onComplete,
    // onStart,
    // onError,
    // prefill,
  });
  const sourceHovered = useHover(sourceContainer);
  const destinationHovered = useHover(destinationContainer);

  const handleInputSwitch = useCallback(() => {
    swapIntent.current?.deny();
    swapIntent.current = null;
    if (!inputs?.fromToken || !inputs?.toToken) {
      const switched: SwapInputs = {
        fromChainID: inputs.toChainID,
        toChainID: inputs.fromChainID,
        fromToken: undefined,
        toToken: undefined,
      };
      setInputs({ ...inputs, ...switched });
      return;
    }
    const isValidSource = swapBalance?.find(
      (bal) => bal.symbol === inputs.toToken?.symbol,
    );
    if (!isValidSource) {
      const switched: SwapInputs = {
        fromChainID: inputs.toChainID,
        toToken: {
          tokenAddress: inputs.fromToken?.contractAddress,
          decimals: inputs.fromToken?.decimals,
          symbol: inputs.fromToken?.symbol,
          name: inputs.fromToken?.name,
          logo: inputs.fromToken?.logo,
        },
        fromToken: undefined,
        toChainID: inputs.fromChainID,
      };
      setInputs({ ...inputs, ...switched });
      return;
    }
    const switched: SwapInputs = {
      fromToken: {
        contractAddress: inputs.toToken?.tokenAddress,
        decimals: inputs.toToken?.decimals,
        symbol: inputs.toToken?.symbol,
        name: inputs.toToken?.name,
        logo: inputs.toToken?.logo,
      },
      fromChainID: inputs.toChainID,
      toToken: {
        tokenAddress: inputs.fromToken?.contractAddress,
        decimals: inputs.fromToken?.decimals,
        symbol: inputs.fromToken?.symbol,
        name: inputs.fromToken?.name,
        logo: inputs.fromToken?.logo,
      },
      toChainID: inputs.fromChainID,
    };
    setInputs({ ...inputs, ...switched });
  }, [inputs, swapIntent, swapBalance]);

  return (
    <>
      <div className="w-full max-w-md bg-background/40 rounded-2xl px-2.5 py-2 sm:p-6 border border-border">
        <div className="flex flex-col items-center w-full relative">
          <div
            ref={sourceContainer}
            className="flex flex-col gap-y-3 w-full rounded-2xl"
          >
            <SourceContainer
              status={status}
              sourceHovered={sourceHovered}
              inputs={inputs}
              availableBalance={availableBalance}
              swapBalance={swapBalance}
              setInputs={setInputs}
              setTxError={setTxError}
              getFiatValue={getFiatValue}
              formatBalance={formatBalance}
            />
          </div>

          {/* Swap arrow / mode toggle */}
          <Button
            variant={"secondary"}
            size={"icon-lg"}
            onClick={handleInputSwitch}
            title="Toggle between exact in and exact out"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            disabled={status === "simulating" || status === "swapping"}
          >
            {status === "simulating" ? (
              <Loader2 className="animate-spin size5" />
            ) : (
              <ArrowDownUp className="size-5" />
            )}
          </Button>
          <Separator />

          {/* Buy section */}
          <div
            className="flex flex-col gap-y-3 w-full rounded-2xl"
            ref={destinationContainer}
          >
            <DestinationContainer
              destinationHovered={destinationHovered}
              inputs={inputs}
              setInputs={setInputs}
              swapIntent={swapIntent}
              destinationBalance={destinationBalance}
              swapBalance={swapBalance}
              availableStables={availableStables}
              getFiatValue={getFiatValue}
              formatBalance={formatBalance}
            />
          </div>
        </div>
        {status === "error" && (
          <p className="text-destructive text-sm">{txError}</p>
        )}
      </div>

      {status !== "idle" && (
        <ViewTransaction
          txError={txError}
          explorerUrls={explorerUrls}
          steps={steps}
          status={status}
          swapIntent={swapIntent}
          getFiatValue={getFiatValue}
          nexusSDK={nexusSDK}
          setStatus={setStatus}
          reset={reset}
        />
      )}
    </>
  );
}

export default SwapWidget;
