"use client";
import React, { useState } from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import Swaps from "@/registry/nexus-elements/swaps/swaps";
import { Toggle } from "../ui/toggle";
import { Check, X } from "lucide-react";

const SwapsShowcase = () => {
  const [swapAs, setSwapAs] = useState<"exactIn" | "exactOut">("exactIn");
  return (
    <ShowcaseWrapper
      heading="Nexus Swaps"
      connectLabel="Connect wallet to use Nexus Swaps"
      registryItemName="swaps"
    >
      <Toggle
        variant={"outline"}
        size="sm"
        pressed={swapAs === "exactIn"}
        onPressedChange={(value) => setSwapAs(value ? "exactIn" : "exactOut")}
        className="absolute top-0 left-2 cursor-pointer"
      >
        <p className="text-sm font-medium">Swap with Exact In</p>
        {swapAs === "exactIn" ? (
          <Check className="size-4" />
        ) : (
          <X className="size-4" />
        )}
      </Toggle>
      <Swaps exactIn={swapAs === "exactIn"} />
    </ShowcaseWrapper>
  );
};

export default SwapsShowcase;
