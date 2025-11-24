import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import Swaps from "@/registry/nexus-elements/swaps/swaps";

const SwapsShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swaps"
      type="swaps"
    >
      <Swaps />
    </ShowcaseWrapper>
  );
};

export default SwapsShowcase;
