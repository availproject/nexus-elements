"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusOne } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { useAccount } from "wagmi";
import { useModal } from "connectkit";

const NexusOneBridgeShowcase = () => {
  const { address } = useAccount();
  const { setOpen } = useModal();

  return (
    <ShowcaseWrapper
      type="nexus-one"
      connectLabel="Connect wallet to use Nexus One Bridge"
    >
      <div
        className="flex w-full justify-center"
        style={{
          alignItems: "flex-start",
        }}
      >
        <NexusOne
          config={{
            mode: "swap",
            onConnectWalletClick: () => setOpen(true),
          }}
          connectedAddress={address}
        />
      </div>
    </ShowcaseWrapper>
  );
};

export default NexusOneBridgeShowcase;
