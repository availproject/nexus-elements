"use client";
import React from "react";
import { ConnectKitButton } from "connectkit";
import ShowcaseWrapper from "./showcase-wrapper";
import dynamic from "next/dynamic";
import { Skeleton } from "@/registry/nexus-elements/ui/skeleton";
const FastBridge = dynamic(
  () => import("@/registry/nexus-elements/fast-bridge/fast-bridge"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
  },
);

const FastBridgeShowcase = () => {
  return (
    <ShowcaseWrapper
      connectLabel="Connect wallet to use Nexus Fast Bridge"
      type="fast-bridge"
    >
      <ConnectKitButton.Custom>
        {({ show, isConnected, address }) => (
          <FastBridge
            connectedAddress={address as `0x${string}`}
            isWalletConnected={isConnected}
            onConnectWallet={show}
          />
        )}
      </ConnectKitButton.Custom>
    </ShowcaseWrapper>
  );
};

export default FastBridgeShowcase;
