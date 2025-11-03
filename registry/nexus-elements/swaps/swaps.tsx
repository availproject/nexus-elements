"use client";
import React from "react";
import SwapExactIn from "./exact-in/exact-in";

interface SwapsProps {
  exactIn?: boolean;
}

const Swaps = ({ exactIn = true }: SwapsProps) => {
  if (exactIn) return <SwapExactIn />;
  return <div className="text-sm text-muted-foreground">Exact Out coming soon</div>;
};

export default Swaps;
