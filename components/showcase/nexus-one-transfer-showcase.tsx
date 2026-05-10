"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusOne } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { useAccount } from "wagmi";

const NexusOneTransferShowcase = () => {
  const { address } = useAccount();

  return (
    <ShowcaseWrapper
      type="nexus-one"
      connectLabel="Connect wallet to use Nexus One Transfer"
    >
      <NexusOne
        config={{ mode: "send" }}
        connectedAddress={address}
      />
    </ShowcaseWrapper>
  );
};

export default NexusOneTransferShowcase;
