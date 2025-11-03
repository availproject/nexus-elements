"use client";
import React from "react";
import SwapExactIn from "./exact-in/exact-in";

interface SwapsProps {
  exactIn?: boolean;
  onComplete?: (amount?: string) => void;
  prefill?: {
    fromChainID?: number;
    fromToken?: string;
    fromAmount?: string;
    toChainID?: number;
    toToken?: string;
  };
}

const Swaps = ({ exactIn = true, onComplete, prefill }: SwapsProps) => {
  if (exactIn) return <SwapExactIn onComplete={onComplete} prefill={prefill} />;
  return (
    <div className="text-sm text-muted-foreground">Exact Out coming soon</div>
  );
};

export default Swaps;
