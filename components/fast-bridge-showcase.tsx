"use client";
import * as React from "react";
import FastBridge from "@/registry/nexus-elements/fast-bridge/fast-bridge";
import { useAccount } from "wagmi";
import ShowcaseWrapper from "./showcase-wrapper";

const FastBridgeShowcase = () => {
  const { address } = useAccount();

  return (
    <ShowcaseWrapper>
      <FastBridge connectedAddress={address as `0x${string}`} />
    </ShowcaseWrapper>
  );
};

export default FastBridgeShowcase;
