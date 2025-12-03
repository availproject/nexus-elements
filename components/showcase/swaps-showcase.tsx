import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import Swaps from "@/registry/nexus-elements/swaps/swaps";
import SwapWidget from "@/registry/nexus-elements/swaps/swap-widget";

const SwapsShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swaps"
      type="swaps"
    >
      {/*<Swaps />*/}
      <SwapWidget />
    </ShowcaseWrapper>
  );
};

export default SwapsShowcase;
