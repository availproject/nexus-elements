"use client";
import React from "react";
import SwapExactIn from "./exact-in/exact-in";
import SwapExactOut from "./exact-out/exact-out";

interface SwapsProps {
  exactIn?: boolean;
  onComplete?: (amount?: string) => void;
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

const Swaps = ({
  exactIn = true,
  onComplete,
  exactInprefill,
  exactOutprefill,
}: SwapsProps) => {
  if (exactIn)
    return <SwapExactIn onComplete={onComplete} prefill={exactInprefill} />;
  return <SwapExactOut onComplete={onComplete} prefill={exactOutprefill} />;
};

export default Swaps;
