import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import SwapDeposit from "@/registry/nexus-elements/swap-deposit/swap-deposit";

const SwapDepositShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swap Deposit"
      type="swap-deposit"
    >
      <SwapDeposit />
    </ShowcaseWrapper>
  );
};

export default SwapDepositShowcase;
