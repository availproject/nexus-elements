"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import AmountInput from "./components/amount-input";
import { useNexus } from "../nexus/NexusProvider";
import useExactIn from "./exact-in/hooks/useExactIn";
import { Button } from "../ui/button";
import { TokenIcon } from "./components/token-icon";
import { CHAIN_METADATA } from "@avail-project/nexus-core";

export default function SwapWidget() {
  const [isExactOut, setIsExactOut] = useState(false);
  const { nexusSDK, swapIntent, swapBalance, fetchSwapBalance, getFiatValue } =
    useNexus();
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
    areInputsValid,
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

  const availableBalance = useMemo(() => {
    if (!nexusSDK || !swapBalance || !inputs?.fromToken || !inputs?.fromChainID)
      return undefined;
    const filteredToken = swapBalance
      ?.find((token) => token.symbol === inputs?.fromToken?.symbol)
      ?.breakdown?.find((chain) => chain.chain?.id === inputs?.fromChainID);

    if (!filteredToken) return undefined;

    return nexusSDK?.utils?.formatTokenBalance(filteredToken?.balance, {
      symbol: inputs?.fromToken?.symbol,
      decimals: filteredToken?.decimals,
    });
  }, [inputs?.fromToken, inputs?.fromChainID, swapBalance, nexusSDK]);

  const handleQuickSelect = (percentage: string) => {
    // This would integrate with actual balance
    console.log("Selected:", percentage);
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center w-full gap-y-4 bg-card/40 rounded-2xl p-6 border border-border">
        <div className="flex flex-col gap-y-3 w-full">
          <div className="bg-background rounded-xl p-4 flex flex-col items-center w-full gap-y-4">
            <div className="w-full flex items-center justify-between">
              <label className="text-lg font-medium text-foreground">
                Sell
              </label>
              <div className="flex transition-all duration-150 ease-out w-full justify-end gap-2">
                {["25%", "50%", "75%", "Max"].map((btn) => (
                  <Button
                    key={btn}
                    variant={"secondary"}
                    onClick={() => handleQuickSelect(btn)}
                    className="px-2 py-0.5  rounded-full text-xs  font-medium transition-colors"
                  >
                    {btn}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-start justify-between gap-y-4">
                <AmountInput
                  amount={inputs?.fromAmount}
                  onChange={(val) => setInputs({ ...inputs, fromAmount: val })}
                  symbol={inputs.fromToken?.symbol}
                  disabled={false}
                  balance={availableBalance}
                />
                {inputs.fromAmount && inputs?.fromToken ? (
                  <span className="text-sm text-accent-foreground">
                    {getFiatValue(
                      Number.parseFloat(inputs.fromAmount),
                      inputs.fromToken?.logo,
                    )}
                  </span>
                ) : (
                  <span className="h-5" />
                )}
              </div>
              <div className="flex flex-col items-end justify-between gap-y-4">
                <div className="flex items-center gap-2 bg-slate-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-500 transition-colors">
                  <TokenIcon
                    symbol={inputs?.fromToken?.symbol}
                    tokenLogo={inputs?.fromToken?.logo}
                    chainLogo={CHAIN_METADATA[inputs?.fromChainID]?.logo}
                    size="sm"
                  />
                  <span className="font-medium">ETH</span>
                  <ChevronDown size={16} />
                </div>
                <span className="text-sm text-slate-400">0.00026 ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Swap arrow / mode toggle */}
        <div className="flex justify-center">
          <button
            onClick={() => setIsExactOut(!isExactOut)}
            className="bg-slate-700 hover:bg-slate-600 rounded-lg p-2 transition-colors"
            title="Toggle between exact in and exact out"
          >
            <svg
              className="w-5 h-5 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16V4m0 0L3 8m0 0l4 4m10-4v12m0 0l4-4m0 0l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* Buy section */}
        <div className="flex flex-col gap-y-3 w-full">
          <div className="bg-background rounded-xl p-4 flex flex-col items-center w-full gap-y-4">
            <div className="w-full flex items-center justify-between">
              <label className="text-lg font-medium text-foreground">Buy</label>
              <div className="flex transition-all duration-150 ease-out w-full justify-end gap-2">
                {["USDC", "USDT", "ETH", "PEPE"].map((btn) => (
                  <Button
                    key={btn}
                    variant={"secondary"}
                    onClick={() => handleQuickSelect(btn)}
                    className="px-2 py-0.5  rounded-full text-xs  font-medium transition-colors"
                  >
                    {btn}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-start justify-between gap-y-4">
                <AmountInput
                  amount={inputs?.fromAmount}
                  onChange={(val) => setInputs({ ...inputs, fromAmount: val })}
                  symbol={inputs.fromToken?.symbol}
                  disabled={false}
                  balance={availableBalance}
                />
                {inputs.fromAmount && inputs?.fromToken ? (
                  <span className="text-sm text-accent-foreground">
                    {getFiatValue(
                      Number.parseFloat(inputs.fromAmount),
                      inputs.fromToken?.logo,
                    )}
                  </span>
                ) : (
                  <span className="h-5" />
                )}
              </div>
              <div className="flex flex-col items-end justify-between gap-y-4">
                <div className="flex items-center gap-2 bg-slate-600 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-500 transition-colors">
                  <TokenIcon
                    symbol={inputs?.fromToken?.symbol}
                    tokenLogo={inputs?.fromToken?.logo}
                    chainLogo={CHAIN_METADATA[inputs?.fromChainID]?.logo}
                    size="sm"
                  />
                  <span className="font-medium">ETH</span>
                  <ChevronDown size={16} />
                </div>
                <span className="text-sm text-slate-400">0.00026 ETH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Price info and slippage */}
        <div className="flex items-center justify-between text-sm text-slate-400 pt-2">
          <span>1 USDC = 0.000282925 ETH ($1.00)</span>
          <button className="flex items-center gap-1 hover:text-slate-300 transition-colors">
            <span>$0.16</span>
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Review button */}
        <button className="w-full bg-linear-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition-all mt-4">
          Review
        </button>
      </div>
    </div>
  );
}
