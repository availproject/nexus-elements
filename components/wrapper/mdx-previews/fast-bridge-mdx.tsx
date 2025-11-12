"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewPanel } from "@/components/showcase/preview-panel";

const FastBridge = dynamic(
  () => import("@/registry/nexus-elements/fast-bridge/fast-bridge"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full min-h-[450px]" />,
  }
);

export default function FastBridgeMdxPreview() {
  const { address } = useAccount();
  return (
    <PreviewPanel connectLabel="Connect wallet to use Nexus Fast Bridge">
      {/* address will be defined when connected */}
      <FastBridge connectedAddress={address as `0x${string}`} />
    </PreviewPanel>
  );
}


