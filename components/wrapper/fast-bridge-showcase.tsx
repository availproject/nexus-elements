"use client";
import React from "react";
import { useAccount } from "wagmi";
import ShowcaseWrapper from "./showcase-wrapper";
import dynamic from "next/dynamic";
import { Skeleton } from "../ui/skeleton";
const FastBridge = dynamic(
  () => import("@/registry/nexus-elements/fast-bridge/fast-bridge"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full" />,
  }
);

const FastBridgeShowcase = () => {
  const { address } = useAccount();

  return (
    <ShowcaseWrapper registryItemName="fast-bridge">
      <FastBridge connectedAddress={address as `0x${string}`} />
    </ShowcaseWrapper>
  );
};

export default FastBridgeShowcase;
