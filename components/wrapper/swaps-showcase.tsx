"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import Swaps from "@/registry/nexus-elements/swaps/swaps";

const SwapsShowcase = () => {
  return (
    <ShowcaseWrapper
      heading="Nexus Swaps"
      connectLabel="Connect wallet to use Nexus Swaps"
      registryItemName="swaps"
    >
      <Swaps exactIn={true} />
    </ShowcaseWrapper>
  );
};

export default SwapsShowcase;
