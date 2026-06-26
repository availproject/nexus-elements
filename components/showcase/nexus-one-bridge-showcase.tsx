"use client";
import React from "react";
import ShowcaseWrapper from "./showcase-wrapper";
import { NexusWidget } from "@/registry/nexus-elements/nexus-one/nexus-one";
import { useAccount } from "wagmi";
import { useConnectWalletClick } from "../helpers/use-connect-wallet-click";

const NexusWidgetBridgeShowcase = () => {
  const { address } = useAccount();
  const openConnectWallet = useConnectWalletClick();

  return (
    <ShowcaseWrapper
      type="nexus-one"
      connectLabel="Connect wallet to use Nexus Widget Bridge"
    >
      <div
        className="flex w-full justify-center"
        style={{
          alignItems: "flex-start",
        }}
      >
        <NexusWidget
          config={{ mode: "swap" }}
          connectedAddress={address}
          onConnectClick={openConnectWallet}
        />
      </div>
    </ShowcaseWrapper>
  );
};

export default NexusWidgetBridgeShowcase;
