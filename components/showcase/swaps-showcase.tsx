"use client";
import React, { useState } from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import Swaps from "@/registry/nexus-elements/swaps/swaps";

const SwapsShowcase = () => {
  const [swapAs, setSwapAs] = useState<"exactIn" | "exactOut">("exactIn");
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Swaps"
      type="swaps"
      pressed={swapAs === "exactIn"}
      onPressedChange={(value: boolean) =>
        setSwapAs(value ? "exactIn" : "exactOut")
      }
      toggle={true}
      toggleLabel="Swap with Exact In"
    >
      <Swaps exactIn={swapAs === "exactIn"} />
    </ShowcaseWrapper>
  );
};

export default SwapsShowcase;
