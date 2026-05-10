"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusOne } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { useAccount } from "wagmi";

const NexusOneSwapShowcase = () => {
  const { address } = useAccount();

  return (
    <ShowcaseWrapper
      type="nexus-one"
      connectLabel="Connect wallet to use Nexus One Swap"
    >
      <NexusOne
        config={{ mode: "swap" }}
        connectedAddress={address}
      />
    </ShowcaseWrapper>
  );
};

export default NexusOneSwapShowcase;
