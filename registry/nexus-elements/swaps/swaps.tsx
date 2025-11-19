"use client";
import React from "react";
import SwapExactIn from "./exact-in/exact-in";
import SwapExactOut from "./exact-out/exact-out";

interface SwapsProps {
  exactIn?: boolean;
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

const Swaps = ({
  exactIn = true,
  onComplete,
  onStart,
  onError,
  exactInprefill,
  exactOutprefill,
}: SwapsProps) => {
  if (exactIn)
    return (
      <SwapExactIn
        onComplete={onComplete}
        onStart={onStart}
        onError={onError}
        prefill={exactInprefill}
      />
    );
  return (
    <SwapExactOut
      onComplete={onComplete}
      onStart={onStart}
      onError={onError}
      prefill={exactOutprefill}
    />
  );
};

export default Swaps;
