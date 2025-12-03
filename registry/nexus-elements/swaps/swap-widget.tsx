"use client";

import { useRef } from "react";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { useNexus } from "../nexus/NexusProvider";
import useExactIn, { SwapInputs } from "./exact-in/hooks/useExactIn";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import useHover from "./hooks/useHover";
import SourceContainer from "./components/source-container";
import DestinationContainer from "./components/destination-container";

export default function SwapWidget() {
  const sourceContainer = useRef<HTMLDivElement | null>(null);
  const destinationContainer = useRef<HTMLDivElement | null>(null);
  const { nexusSDK, swapIntent, swapBalance, fetchSwapBalance, getFiatValue } =
    useNexus();
  const {
    inputs,
    setInputs,
    loading,
    txError,
    timer,
    steps,
    setTxError,
    sourceExplorerUrl,
    destinationExplorerUrl,
    reset,

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

  const handleInputSwitch = () => {
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
  };

  return (
    <div className="w-full max-w-md bg-background/40 rounded-2xl px-2.5 py-2 sm:p-6 border border-border">
      <div className="flex flex-col items-center w-full relative">
        <div
          ref={sourceContainer}
          className="flex flex-col gap-y-3 w-full rounded-2xl"
        >
          <SourceContainer
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
        >
          <ArrowDownUp className="size-5" />
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
            availableStables={availableStables}
            getFiatValue={getFiatValue}
            formatBalance={formatBalance}
          />
        </div>
      </div>
      <Button className="w-full mt-4">
        {loading ? <Loader2 className="size-5 animate-spin" /> : "Review"}
      </Button>
    </div>
  );
}
